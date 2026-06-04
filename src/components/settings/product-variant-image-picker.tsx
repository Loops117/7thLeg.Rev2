"use client";

import { useTransition } from "react";
import type { ProductImageAdminRow } from "@/app/actions/product-images-admin";
import { displayImageName } from "@/lib/product-images-public";

function thumbUrl(row: ProductImageAdminRow) {
  return row.useWatermarkedPublic && row.watermarkedUrl ? row.watermarkedUrl : row.url;
}

export function ProductVariantImagePicker({
  variantId,
  variantLabel,
  images,
  onAssignVariant,
  disabled = false,
}: {
  variantId: string;
  variantLabel: string;
  images: ProductImageAdminRow[];
  onAssignVariant: (imageId: string, variantId: string | null) => Promise<void>;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const busy = disabled || pending;
  const sorted = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
  const assigned = sorted.filter((i) => i.variantId === variantId);

  function assign(imageId: string, nextVariantId: string | null) {
    startTransition(async () => {
      await onAssignVariant(imageId, nextVariantId);
    });
  }

  return (
    <div className="mt-4 border-t border-palm/15 pt-4 dark:border-zinc-700">
      <p className="text-xs font-black uppercase tracking-wide text-palm dark:text-emerald-300">
        Images for &ldquo;{variantLabel}&rdquo;
      </p>
      <p className="mt-1 text-xs text-ink/60 dark:text-zinc-400">
        Assigned images show on the storefront when this variation is selected. Changes sync with the product images
        table below.
      </p>

      {assigned.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {assigned.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                disabled={busy}
                title={`${displayImageName(row)} — click to clear variation (All)`}
                onClick={() => assign(row.id, null)}
                className="group relative h-16 w-16 overflow-hidden rounded border-2 border-lagoon-dark ring-2 ring-lagoon/30 dark:border-emerald-600 dark:ring-emerald-900/50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumbUrl(row)} alt="" className="h-full w-full object-contain bg-surf/40 dark:bg-zinc-800" />
                <span className="absolute inset-x-0 bottom-0 bg-black/65 px-0.5 py-0.5 text-[9px] font-bold text-white opacity-0 transition group-hover:opacity-100">
                  Set to All
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-ink/55 dark:text-zinc-500">No images assigned to this variation yet.</p>
      )}

      {sorted.length > 0 ? (
        <>
          <p className="mt-4 text-xs font-bold text-ink dark:text-zinc-200">Pick from all product images</p>
          <ul className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
            {sorted.map((row) => {
              const isMine = row.variantId === variantId;
              const isOther = row.variantId != null && row.variantId !== variantId;
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    disabled={busy}
                    title={displayImageName(row)}
                    onClick={() => assign(row.id, isMine ? null : variantId)}
                    className={`relative h-14 w-full overflow-hidden rounded border-2 bg-surf/30 transition dark:bg-zinc-800 ${
                      isMine
                        ? "border-lagoon-dark ring-2 ring-lagoon/25 dark:border-emerald-500"
                        : isOther
                          ? "border-coral/50 opacity-75 hover:opacity-100 dark:border-orange-800"
                          : "border-palm/25 hover:border-palm dark:border-zinc-600 dark:hover:border-zinc-500"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={thumbUrl(row)} alt="" className="h-full w-full object-contain" />
                    {row.variantId == null ? (
                      <span className="absolute left-0 top-0 bg-palm/80 px-1 text-[8px] font-bold text-white dark:bg-zinc-700">
                        All
                      </span>
                    ) : isOther ? (
                      <span className="absolute left-0 top-0 bg-coral/90 px-1 text-[8px] font-bold text-white">
                        Other
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <p className="mt-2 text-xs text-ink/55 dark:text-zinc-500">
          Upload images in the <strong>Product images</strong> section first.
        </p>
      )}
    </div>
  );
}
