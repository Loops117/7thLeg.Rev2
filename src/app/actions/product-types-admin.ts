"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { productTypeOrderBy } from "@/lib/product-type-order";
import { loadProductTypeIndex } from "@/lib/product-type-tree";
import { slugifyProductName } from "@/lib/product-slug";

async function revalidateProductDetailPages() {
  const rows = await prisma.product.findMany({ select: { slug: true } });
  for (const { slug } of rows) {
    revalidatePath(`/product/${slug}`);
  }
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
}

async function uniqueTypeSlug(base: string, excludeId?: string): Promise<string> {
  let slug = base;
  let n = 0;
  for (;;) {
    const existing = await prisma.productType.findFirst({
      where: excludeId ? { slug, NOT: { id: excludeId } } : { slug },
      select: { id: true },
    });
    if (!existing) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

async function nextSortOrderForParent(parentId: string | null): Promise<number> {
  const maxSort = await prisma.productType.aggregate({
    where: { parentId },
    _max: { sortOrder: true },
  });
  return (maxSort._max.sortOrder ?? -1) + 1;
}

export async function createProductType(data: {
  name: string;
  slug?: string;
  footerIds: string[];
  storefrontVisible?: boolean;
  parentId?: string | null;
}): Promise<string> {
  await requireAdmin();
  const name = data.name.trim();
  if (!name) throw new Error("Name required");
  const base = data.slug?.trim() ? slugifyProductName(data.slug.trim()) : slugifyProductName(name);
  const slug = await uniqueTypeSlug(base);

  const parentId = data.parentId?.trim() || null;
  if (parentId) {
    const parent = await prisma.productType.findUnique({ where: { id: parentId }, select: { id: true } });
    if (!parent) throw new Error("Parent type not found");
  }

  const footerIds = [...new Set((data.footerIds ?? []).filter(Boolean))];
  const validFooters =
    footerIds.length > 0
      ? await prisma.automaticFooter.findMany({ where: { id: { in: footerIds } }, select: { id: true } })
      : [];
  const ids = validFooters.map((f) => f.id);

  const sortOrder = await nextSortOrderForParent(parentId);

  let newId = "";
  await prisma.$transaction(async (tx) => {
    const t = await tx.productType.create({
      data: {
        name,
        slug,
        storefrontVisible: data.storefrontVisible ?? true,
        sortOrder,
        parentId,
      },
    });
    newId = t.id;
    for (const footerId of ids) {
      await tx.productTypeDefaultFooter.create({
        data: { typeId: t.id, footerId },
      });
    }
  });

  await revalidatePaths();
  return newId;
}

export async function updateProductType(
  id: string,
  data: {
    name: string;
    slug?: string;
    footerIds: string[];
    storefrontVisible: boolean;
    parentId?: string | null;
  },
) {
  await requireAdmin();
  const name = data.name.trim();
  if (!name) throw new Error("Name required");

  const existing = await prisma.productType.findUnique({ where: { id } });
  if (!existing) throw new Error("Type not found");

  const index = await loadProductTypeIndex();
  const parentId = data.parentId === undefined ? existing.parentId : data.parentId?.trim() || null;
  if (parentId && index.wouldCreateCycle(id, parentId)) {
    throw new Error("Invalid parent: would create a cycle.");
  }
  if (parentId) {
    const parent = await prisma.productType.findUnique({ where: { id: parentId }, select: { id: true } });
    if (!parent) throw new Error("Parent type not found");
  }

  let slug = existing.slug;
  if (data.slug?.trim()) {
    const want = slugifyProductName(data.slug.trim());
    slug = want === existing.slug ? existing.slug : await uniqueTypeSlug(want, id);
  }

  const footerIds = [...new Set((data.footerIds ?? []).filter(Boolean))];
  const validFooters =
    footerIds.length > 0
      ? await prisma.automaticFooter.findMany({ where: { id: { in: footerIds } }, select: { id: true } })
      : [];
  const ids = validFooters.map((f) => f.id);

  const parentChanged = parentId !== existing.parentId;
  const sortOrder = parentChanged ? await nextSortOrderForParent(parentId) : undefined;

  await prisma.$transaction(async (tx) => {
    await tx.productType.update({
      where: { id },
      data: {
        name,
        slug,
        storefrontVisible: data.storefrontVisible,
        parentId,
        ...(sortOrder !== undefined ? { sortOrder } : {}),
      },
    });
    await tx.productTypeDefaultFooter.deleteMany({ where: { typeId: id } });
    for (const footerId of ids) {
      await tx.productTypeDefaultFooter.create({ data: { typeId: id, footerId } });
    }
  });

  await revalidatePaths();
}

export async function deleteProductType(id: string) {
  await requireAdmin();
  const child = await prisma.productType.findFirst({ where: { parentId: id }, select: { id: true } });
  if (child) throw new Error("Remove or reassign child types first.");
  await prisma.productType.delete({ where: { id } });
  await revalidatePaths();
}

export async function moveProductType(typeId: string, direction: "up" | "down") {
  await requireAdmin();
  const row = await prisma.productType.findUnique({
    where: { id: typeId },
    select: { id: true, parentId: true, sortOrder: true },
  });
  if (!row) throw new Error("Type not found");

  const siblings = await prisma.productType.findMany({
    where: { parentId: row.parentId },
    orderBy: [...productTypeOrderBy],
    select: { id: true, sortOrder: true },
  });
  const idx = siblings.findIndex((r) => r.id === typeId);
  if (idx < 0) throw new Error("Type not found");
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= siblings.length) return;

  const a = siblings[idx]!;
  const b = siblings[swapIdx]!;
  await prisma.$transaction([
    prisma.productType.update({ where: { id: a.id }, data: { sortOrder: b.sortOrder } }),
    prisma.productType.update({ where: { id: b.id }, data: { sortOrder: a.sortOrder } }),
  ]);
  await revalidatePaths();
}

async function revalidatePaths() {
  revalidatePath("/settings/products");
  revalidatePath("/settings/products/types");
  revalidatePath("/settings/events");
  revalidatePath("/settings/products/footers");
  revalidatePath("/store");
  await revalidateProductDetailPages();
}
