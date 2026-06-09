"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useId, useState, useTransition, type CSSProperties } from "react";
import { addProductKitToCartAction } from "@/app/actions/store-cart";
import { btnMainMd } from "@/lib/btn-theme-classes";
import { withProductImagePlaceholder } from "@/lib/product-images-public";
import { formatPriceUsd } from "@/lib/product-slug";
import { useCoarsePointer } from "@/lib/use-coarse-pointer";
import type { StorefrontProductKit, StorefrontKitLine } from "@/lib/product-kits";

const KIT_HOVER_PREVIEW_SIZE_PX = 112;

type KitHoverPreviewPosition = {
  left: number;
  top: number;
};

function kitItemLabel(item: StorefrontKitLine) {
  return item.variantLabel ? `${item.productName} — ${item.variantLabel}` : item.productName;
}

function kitPreviewPositionAtCursor(clientX: number, clientY: number, size: number): KitHoverPreviewPosition {
  const edgePad = 8;
  const half = size / 2;
  const left = Math.min(
    window.innerWidth - size - edgePad,
    Math.max(edgePad, clientX - half),
  );
  const top = Math.min(
    window.innerHeight - size - edgePad,
    Math.max(edgePad, clientY - half),
  );
  return { left, top };
}

function KitItemListRow({
  item,
  isCurrentProduct,
}: {
  item: StorefrontKitLine;
  isCurrentProduct: boolean;
}) {
  const previewId = useId();
  const coarsePointer = useCoarsePointer();
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewPos, setPreviewPos] = useState<KitHoverPreviewPosition>({ left: 0, top: 0 });

  useEffect(() => {
    if (!previewVisible) return;
    const onScroll = () => setPreviewVisible(false);
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [previewVisible]);

  const preview =
    previewVisible && !coarsePointer && typeof document !== "undefined"
      ? createPortal(
          <div
            id={previewId}
            role="presentation"
            className="fixed z-[200]"
            style={
              {
                left: previewPos.left,
                top: previewPos.top,
                width: KIT_HOVER_PREVIEW_SIZE_PX,
                height: KIT_HOVER_PREVIEW_SIZE_PX,
              } as CSSProperties
            }
            onMouseLeave={() => setPreviewVisible(false)}
          >
            <div className="kit-bundle-item-hover-preview__card store-product-card__image-area h-full w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={withProductImagePlaceholder(item.imageUrl)}
                alt=""
                className="h-full w-full object-contain p-1.5"
                draggable={false}
              />
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <li
      className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2.5 text-sm"
      onMouseEnter={(e) => {
        setPreviewPos(kitPreviewPositionAtCursor(e.clientX, e.clientY, KIT_HOVER_PREVIEW_SIZE_PX));
        setPreviewVisible(true);
      }}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <Link
          href={`/product/${item.productSlug}`}
          className="font-medium text-palm hover:underline"
        >
          {kitItemLabel(item)}
        </Link>
        {isCurrentProduct ? (
          <span className="rounded bg-palm/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-palm">
            This item
          </span>
        ) : null}
      </div>
      <span className="shrink-0 text-xs font-bold text-ink/80">{formatPriceUsd(item.unitPriceCents)}</span>
      {!item.inStock ? (
        <span className="w-full text-xs font-medium text-coral sm:w-auto">Out of stock</span>
      ) : null}
      {preview}
    </li>
  );
}

function KitBundleFooter({
  kit,
  pending,
  allInStock,
  error,
  onAddKit,
}: {
  kit: StorefrontProductKit;
  pending: boolean;
  allInStock: boolean;
  error: string;
  onAddKit: () => void;
}) {
  return (
    <div className="kit-bundle__footer flex flex-col gap-3 border-t-2 border-palm/25 bg-lagoon/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p className="text-xs text-ink/75">
          Separate{" "}
          <span className="font-medium text-ink/60 line-through">{formatPriceUsd(kit.listTotalCents)}</span>
        </p>
        <p>
          <span className="text-xs font-bold text-palm">Bundle price </span>
          <span className="text-lg font-black text-ink">{formatPriceUsd(kit.kitPriceCents)}</span>
        </p>
        <p className="text-xs font-bold text-palm">Save {formatPriceUsd(kit.discountCents)}</p>
      </div>

      <div className="flex w-full flex-col gap-1 sm:w-auto sm:min-w-[12rem]">
        <button
          type="button"
          disabled={pending || !allInStock}
          onClick={onAddKit}
          className={`w-full ${btnMainMd} !py-2 text-sm disabled:opacity-50`}
        >
          {pending ? "Adding…" : "Add kit to cart"}
        </button>
        {!allInStock ? (
          <p className="text-center text-[11px] font-medium text-coral">One or more items are out of stock.</p>
        ) : null}
        {error ? <p className="text-center text-[11px] font-medium text-coral">{error}</p> : null}
      </div>
    </div>
  );
}

export function ProductKitSection({
  kit,
  timedSaleEventId = null,
}: {
  kit: StorefrontProductKit;
  timedSaleEventId?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const allInStock = kit.items.every((i) => i.inStock);

  function addKit() {
    setError("");
    startTransition(async () => {
      const res = await addProductKitToCartAction({
        kitId: kit.id,
        timedSaleEventId,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/cart");
      router.refresh();
    });
  }

  return (
    <section className="mt-8 border-t-2 border-palm/20 pt-5" aria-labelledby="product-kit-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <h2 id="product-kit-heading" className="text-base font-black text-palm sm:text-lg">
          {kit.label}
        </h2>
        <p className="text-xs text-ink/75 sm:text-sm">
          Save {formatPriceUsd(kit.discountCents)} when you buy the combo
        </p>
      </div>

      <div className="kit-bundle mt-3 overflow-hidden rounded-lg" aria-label="Kit bundle">
        <div className="kit-bundle__contents px-4 py-3 sm:px-5">
          <p className="text-xs font-bold uppercase tracking-wide text-palm/80">Includes</p>
          <ul className="mt-1.5 divide-y divide-palm/15" aria-label="Items in this kit">
            {kit.items.map((item) => (
              <KitItemListRow
                key={`${item.productId}:${item.variantId ?? ""}`}
                item={item}
                isCurrentProduct={item.productId === kit.hostProductId}
              />
            ))}
          </ul>
        </div>

        <KitBundleFooter
          kit={kit}
          pending={pending}
          allInStock={allInStock}
          error={error}
          onAddKit={addKit}
        />
      </div>
    </section>
  );
}
