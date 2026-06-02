"use server";

import { randomUUID } from "node:crypto";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  deleteUploadByUrl,
  putUploadObject,
  uploadKeyFromPublicUrl,
  watermarkedObjectKeyFromOriginalKey,
} from "@/lib/app-uploads";
import { prisma } from "@/lib/prisma";
import type { ProductVariantAdminRow } from "@/app/actions/product-variants-admin";
import { parseProductPriceTiersJson } from "@/lib/product-price-tiers";
import { getUploadImageSettingsFromDb, normalizeImageBufferForUpload } from "@/lib/image-upload-normalize";
import { getProductWatermarkCompositeSettings, getWatermarkPngForComposite } from "@/lib/watermark-resolve";
import { compositeWatermarkJpegFromBuffers, readImageBufferFromPublicUrl } from "@/lib/watermark-image";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"]);

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
}

export type ProductImageAdminRow = {
  id: string;
  url: string;
  watermarkedUrl: string | null;
  useWatermarkedPublic: boolean;
  originalFilename: string;
  sortOrder: number;
  variantId: string | null;
};

export type ProductMediaAdmin = {
  images: ProductImageAdminRow[];
  variants: ProductVariantAdminRow[];
};

/** Composites the site or built-in watermark; uploads `-wm.jpg` with the same key pattern as the original. */
export async function writeWatermarkedDerivativeForUrl(sourcePublicUrl: string): Promise<string | null> {
  try {
    const [wmPng, wmSettings] = await Promise.all([
      getWatermarkPngForComposite(),
      getProductWatermarkCompositeSettings(),
    ]);
    const baseBuf = await readImageBufferFromPublicUrl(sourcePublicUrl);
    const jpegBuf = await compositeWatermarkJpegFromBuffers(baseBuf, wmPng, wmSettings);
    const key = uploadKeyFromPublicUrl(sourcePublicUrl);
    if (!key) return null;
    const wmKey = watermarkedObjectKeyFromOriginalKey(key);
    return putUploadObject(wmKey, jpegBuf, "image/jpeg");
  } catch (e) {
    console.error("writeWatermarkedDerivativeForUrl", e);
    return null;
  }
}

export async function getProductMediaAdmin(productId: string): Promise<ProductMediaAdmin> {
  await requireAdmin();
  const [images, variants] = await Promise.all([
    prisma.productImage.findMany({
      where: { productId },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        url: true,
        watermarkedUrl: true,
        useWatermarkedPublic: true,
        originalFilename: true,
        sortOrder: true,
        variantId: true,
      },
    }),
    prisma.productVariant.findMany({
      where: { productId },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      select: {
        id: true,
        label: true,
        sortOrder: true,
        stock: true,
        unlimitedStock: true,
        active: true,
        priceDeltaCents: true,
        priceTiersJson: true,
        pickerBgHex: true,
        pickerFgHex: true,
        pickerBorderHex: true,
      },
    }),
  ]);
  return {
    images,
    variants: variants.map((r) => ({
      id: r.id,
      label: r.label,
      sortOrder: r.sortOrder,
      stock: r.stock,
      unlimitedStock: r.unlimitedStock,
      active: r.active,
      priceDeltaCents: r.priceDeltaCents,
      priceTiers: parseProductPriceTiersJson(r.priceTiersJson),
      pickerBgHex: r.pickerBgHex,
      pickerFgHex: r.pickerFgHex,
      pickerBorderHex: r.pickerBorderHex,
    })),
  };
}

function safeBasename(name: string): string {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]+/g, "_");
  return base.slice(0, 120) || "image";
}

async function revalidateProduct(productId: string) {
  const p = await prisma.product.findUnique({
    where: { id: productId },
    select: { slug: true },
  });
  if (!p) return;
  revalidatePath("/store", "page");
  revalidatePath(`/product/${p.slug}`, "page");
  revalidatePath("/settings/products", "page");
  revalidatePath(`/settings/products/${productId}/edit`, "page");
}

export type UploadProductImageResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function uploadProductImage(formData: FormData): Promise<UploadProductImageResult> {
  try {
    await requireAdmin();
    const productId = formData.get("productId");
    const file = formData.get("file");
    const applyWatermark =
      formData.get("applyWatermark") === "1" ||
      formData.get("applyWatermark") === "on" ||
      formData.get("applyWatermark") === "true";

    if (typeof productId !== "string" || !productId.trim()) {
      return { ok: false, error: "Missing product." };
    }
    if (!file || !(file instanceof File)) {
      return { ok: false, error: "Choose an image file." };
    }

    const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) {
      return { ok: false, error: "Product not found." };
    }

    if (file.size > MAX_BYTES) {
      return { ok: false, error: "Image must be 8MB or smaller." };
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return { ok: false, error: "Use JPEG, PNG, GIF, WebP, or AVIF." };
    }

    const rawBuf = Buffer.from(await file.arrayBuffer());
    const settings = await getUploadImageSettingsFromDb();
    const norm = await normalizeImageBufferForUpload(
      rawBuf,
      file.type && ALLOWED_TYPES.has(file.type) ? file.type : "image/jpeg",
      "productJpeg",
      settings,
    );
    const baseLeaf = safeBasename(file.name).replace(/\.[^.]+$/, "") || "image";
    const storedName = `${randomUUID()}-${baseLeaf}.${norm.ext}`;
    const key = `uploads/products/${productId}/${storedName}`;
    const url = await putUploadObject(key, norm.buffer, norm.contentType);
    const agg = await prisma.productImage.aggregate({
      where: { productId },
      _max: { sortOrder: true },
    });
    const sortOrder = (agg._max.sortOrder ?? -1) + 1;

    let watermarkedUrl: string | null = null;
    let useWatermarkedPublic = false;
    if (applyWatermark) {
      try {
        watermarkedUrl = await writeWatermarkedDerivativeForUrl(url);
        useWatermarkedPublic = !!watermarkedUrl;
      } catch (e) {
        console.error("watermark on upload", e);
        return { ok: false, error: "Could not apply watermark. Check Global settings for a custom mark, or built-in /public/built-in/watermark.png." };
      }
    }

    const row = await prisma.productImage.create({
      data: {
        productId,
        url,
        watermarkedUrl,
        useWatermarkedPublic,
        originalFilename: file.name.slice(0, 240),
        sortOrder,
        variantId: null,
      },
    });

    await revalidateProduct(productId);
    return { ok: true, id: row.id };
  } catch (e) {
    console.error("uploadProductImage", e);
    const msg = e instanceof Error ? e.message : "Upload failed.";
    if (msg === "Unauthorized") {
      return { ok: false, error: "You must be signed in to upload images." };
    }
    return { ok: false, error: msg };
  }
}

export type SimpleActionResult = { ok: true } | { ok: false; error: string };

export async function generateProductImageWatermark(imageId: string): Promise<SimpleActionResult> {
  try {
    await requireAdmin();
    const img = await prisma.productImage.findUnique({
      where: { id: imageId },
      select: { id: true, productId: true, url: true, watermarkedUrl: true },
    });
    if (!img) return { ok: false, error: "Image not found." };
    if (img.watermarkedUrl) {
      await deleteUploadByUrl(img.watermarkedUrl);
    }
    const out = await writeWatermarkedDerivativeForUrl(img.url);
    if (!out) return { ok: false, error: "Could not create watermarked file." };
    await prisma.productImage.update({
      where: { id: imageId },
      data: { watermarkedUrl: out, useWatermarkedPublic: true },
    });
    await revalidateProduct(img.productId);
    return { ok: true };
  } catch (e) {
    console.error("generateProductImageWatermark", e);
    return { ok: false, error: e instanceof Error ? e.message : "Failed." };
  }
}

export async function setProductImageUseWatermarkedPublic(
  imageId: string,
  useWatermarkedPublic: boolean,
): Promise<SimpleActionResult> {
  try {
    await requireAdmin();
    const img = await prisma.productImage.findUnique({
      where: { id: imageId },
      select: { productId: true, watermarkedUrl: true },
    });
    if (!img) return { ok: false, error: "Image not found." };
    if (useWatermarkedPublic && !img.watermarkedUrl) {
      return { ok: false, error: "Generate a watermarked version first." };
    }
    await prisma.productImage.update({
      where: { id: imageId },
      data: { useWatermarkedPublic },
    });
    await revalidateProduct(img.productId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed." };
  }
}

export async function updateProductImageVariant(imageId: string, variantId: string | null) {
  await requireAdmin();
  const img = await prisma.productImage.findUnique({
    where: { id: imageId },
    select: { id: true, productId: true },
  });
  if (!img) throw new Error("Image not found");

  if (variantId) {
    const v = await prisma.productVariant.findFirst({
      where: { id: variantId, productId: img.productId },
      select: { id: true },
    });
    if (!v) throw new Error("Variant does not belong to this product");
  }

  await prisma.productImage.update({
    where: { id: imageId },
    data: { variantId: variantId || null },
  });
  await revalidateProduct(img.productId);
}

export async function moveProductImage(imageId: string, direction: "up" | "down") {
  await requireAdmin();
  const img = await prisma.productImage.findUnique({
    where: { id: imageId },
    select: { id: true, productId: true, sortOrder: true },
  });
  if (!img) return;

  const list = await prisma.productImage.findMany({
    where: { productId: img.productId },
    orderBy: { sortOrder: "asc" },
    select: { id: true, sortOrder: true },
  });
  const idx = list.findIndex((r) => r.id === imageId);
  if (idx < 0) return;
  const j = direction === "up" ? idx - 1 : idx + 1;
  if (j < 0 || j >= list.length) return;

  const a = list[idx];
  const b = list[j];
  await prisma.$transaction([
    prisma.productImage.update({ where: { id: a.id }, data: { sortOrder: b.sortOrder } }),
    prisma.productImage.update({ where: { id: b.id }, data: { sortOrder: a.sortOrder } }),
  ]);
  await revalidateProduct(img.productId);
}

export async function deleteProductImage(imageId: string) {
  await requireAdmin();
  const img = await prisma.productImage.findUnique({
    where: { id: imageId },
    select: { id: true, productId: true, url: true, watermarkedUrl: true },
  });
  if (!img) return;

  await prisma.productImage.delete({ where: { id: imageId } });
  await deleteUploadByUrl(img.url);
  await deleteUploadByUrl(img.watermarkedUrl);
  await revalidateProduct(img.productId);
}
