"use client";

import { adminTableRowClass } from "@/lib/admin-table-classes";
import { btnSecondaryMd } from "@/lib/btn-theme-classes";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  deleteProductImage,
  generateProductImageWatermark,
  getProductMediaAdmin,
  moveProductImage,
  type ProductImageAdminRow,
  type ProductMediaAdmin,
  setProductImageUseWatermarkedPublic,
  updateProductImageVariant,
  uploadProductImage,
} from "@/app/actions/product-images-admin";
import { displayImageName } from "@/lib/product-images-public";

export type ProductImageRow = ProductImageAdminRow;

export function ProductImagesManager({
  productId,
  variantEpoch = 0,
  initialMedia,
}: {
  productId: string;
  /** Increment when variations change so the variant dropdown refreshes. */
  variantEpoch?: number;
  initialMedia?: ProductMediaAdmin;
}) {
  const [images, setImages] = useState<ProductImageAdminRow[]>(initialMedia?.images ?? []);
  const [variants, setVariants] = useState<{ id: string; label: string }[]>(initialMedia?.variants ?? []);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [applyWatermarkOnUpload, setApplyWatermarkOnUpload] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refreshMedia = useCallback(async () => {
    try {
      const m = await getProductMediaAdmin(productId);
      setImages(m.images);
      setVariants(m.variants);
    } catch {
      setErr("Could not load images.");
    }
  }, [productId]);

  useEffect(() => {
    void refreshMedia();
  }, [productId, variantEpoch, refreshMedia]);

  const sorted = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
  const busy = pending || uploading;

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const list = input.files;
    if (!list || list.length === 0) {
      setErr("No files were selected, or the browser blocked the files. If nothing happens, try one image at a time or different formats (JPEG, PNG, WebP).");
      return;
    }
    setErr(null);
    setMsg(null);
    setUploading(true);
    const files = Array.from(list);
    let ok = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]!;
        const fd = new FormData();
        fd.set("productId", productId);
        fd.set("file", file);
        if (applyWatermarkOnUpload) fd.set("applyWatermark", "1");
        const r = await uploadProductImage(fd);
        if (!r.ok) {
          setErr(r.error + (files.length > 1 ? ` (failed on file ${i + 1} of ${files.length})` : ""));
          return;
        }
        ok += 1;
      }
      setMsg(files.length > 1 ? `Uploaded ${ok} image${ok === 1 ? "" : "s"}.` : "Image uploaded.");
      await refreshMedia();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Upload failed.");
    } finally {
      setUploading(false);
      input.value = "";
    }
  }

  function setVariant(imageId: string, value: string) {
    setErr(null);
    startTransition(async () => {
      try {
        await updateProductImageVariant(imageId, value === "" ? null : value);
        await refreshMedia();
      } catch (ex) {
        setErr(ex instanceof Error ? ex.message : "Could not update.");
      }
    });
  }

  function move(id: string, dir: "up" | "down") {
    setErr(null);
    startTransition(async () => {
      try {
        await moveProductImage(id, dir);
        await refreshMedia();
      } catch {
        setErr("Could not reorder.");
      }
    });
  }

  function remove(id: string, label: string) {
    if (!window.confirm(`Delete image “${label}”?`)) return;
    setErr(null);
    startTransition(async () => {
      try {
        await deleteProductImage(id);
        await refreshMedia();
      } catch {
        setErr("Could not delete.");
      }
    });
  }

  return (
    <section className="mt-8 border-t-2 border-palm/20 pt-8">
      <h2 className="text-lg font-black text-palm">Product images</h2>
      <p className="mt-1 text-sm text-ink/70">
        Upload files stored on this server under <code className="text-xs">/public/uploads/products/</code>.{" "}
        <strong>All</strong> = default gallery; pick a variation to show an image only for that option.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
          className="sr-only w-0"
          aria-label="Select product images to upload"
          onChange={onUpload}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className={btnSecondaryMd}
        >
          {busy ? "Working…" : "Upload image(s)"}
        </button>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
          <input
            type="checkbox"
            checked={applyWatermarkOnUpload}
            onChange={(e) => setApplyWatermarkOnUpload(e.target.checked)}
            disabled={busy}
          />
          Apply watermark (needs Global → watermark file)
        </label>
        {msg ? <span className="text-sm text-lagoon-dark">{msg}</span> : null}
        {err ? <span className="text-sm text-coral">{err}</span> : null}
      </div>

      {sorted.length === 0 ? (
        <p className="mt-4 text-sm text-ink/60">No images yet. Upload one above.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded border-2 border-palm">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b-2 border-palm bg-surf/50 font-bold text-palm">
              <tr>
                <th className="px-2 py-2">Thumbnail</th>
                <th className="px-2 py-2">Name</th>
                <th className="px-2 py-2">Variation</th>
                <th className="px-2 py-2">Watermark</th>
                <th className="px-2 py-2">Order</th>
                <th className="px-2 py-2"> </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, index) => (
                <tr key={row.id} className={adminTableRowClass}>
                  <td className="px-2 py-2">
                    <div className="relative h-14 w-14 overflow-hidden rounded border border-palm/30 bg-surf/50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={row.useWatermarkedPublic && row.watermarkedUrl ? row.watermarkedUrl : row.url}
                        alt=""
                        className="h-full w-full object-contain"
                        title="Preview: storefront uses this version when “WM on site” is on"
                      />
                    </div>
                  </td>
                  <td className="max-w-[12rem] px-2 py-2">
                    <span className="break-all font-mono text-xs text-ink">{displayImageName(row)}</span>
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={row.variantId ?? ""}
                      disabled={busy}
                      onChange={(e) => setVariant(row.id, e.target.value)}
                      className="max-w-[10rem] border-2 border-palm-mid bg-white px-1 py-1 text-xs"
                    >
                      <option value="">All</option>
                      {variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="max-w-[14rem] px-2 py-2 align-top text-xs text-ink/85">
                    <div className="flex flex-col gap-1">
                      <span>{row.watermarkedUrl ? "WM file exists" : "No WM file"}</span>
                      <span className="text-ink/60">{row.useWatermarkedPublic ? "Storefront: watermarked" : "Storefront: original"}</span>
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          disabled={busy}
                          className="rounded border border-palm px-1.5 py-0.5 font-bold hover:bg-surf"
                          onClick={(e) => {
                            (e.currentTarget.closest("details") as HTMLDetailsElement | null)?.removeAttribute("open");
                            setErr(null);
                            startTransition(async () => {
                              const r = await generateProductImageWatermark(row.id);
                              if (!r.ok) setErr(r.error);
                              else {
                                setMsg("Watermarked copy generated.");
                                await refreshMedia();
                              }
                            });
                          }}
                        >
                          Generate WM
                        </button>
                        {row.watermarkedUrl ? (
                          <>
                            <button
                              type="button"
                              disabled={busy || row.useWatermarkedPublic}
                              className="rounded border border-palm px-1.5 py-0.5 font-bold hover:bg-surf disabled:opacity-40"
                              onClick={(e) => {
                                (e.currentTarget.closest("details") as HTMLDetailsElement | null)?.removeAttribute("open");
                                setErr(null);
                                startTransition(async () => {
                                  const r = await setProductImageUseWatermarkedPublic(row.id, true);
                                  if (!r.ok) setErr(r.error);
                                  else await refreshMedia();
                                });
                              }}
                            >
                              Use WM on site
                            </button>
                            <button
                              type="button"
                              disabled={busy || !row.useWatermarkedPublic}
                              className="rounded border border-palm px-1.5 py-0.5 font-bold hover:bg-surf disabled:opacity-40"
                              onClick={(e) => {
                                (e.currentTarget.closest("details") as HTMLDetailsElement | null)?.removeAttribute("open");
                                setErr(null);
                                startTransition(async () => {
                                  const r = await setProductImageUseWatermarkedPublic(row.id, false);
                                  if (!r.ok) setErr(r.error);
                                  else await refreshMedia();
                                });
                              }}
                            >
                              Use original
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={busy || index === 0}
                        onClick={() => move(row.id, "up")}
                        className="rounded border border-palm px-2 py-0.5 text-xs font-bold hover:bg-surf disabled:opacity-30"
                        aria-label="Move up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={busy || index >= sorted.length - 1}
                        onClick={() => move(row.id, "down")}
                        className="rounded border border-palm px-2 py-0.5 text-xs font-bold hover:bg-surf disabled:opacity-30"
                        aria-label="Move down"
                      >
                        ↓
                      </button>
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => remove(row.id, displayImageName(row))}
                      className="text-xs font-bold text-coral hover:underline disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
