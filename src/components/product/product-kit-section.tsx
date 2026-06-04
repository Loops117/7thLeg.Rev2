"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useState, useTransition } from "react";
import { addProductKitToCartAction } from "@/app/actions/store-cart";
import { btnMainMd } from "@/lib/btn-theme-classes";
import { formatPriceUsd } from "@/lib/product-slug";
import type { StorefrontProductKit, StorefrontKitLine } from "@/lib/product-kits";

/** Shared row height for item cards, operators, and pricing card. */
const KIT_ROW_H = "h-14 sm:h-16";
const KIT_PRICING_W = "w-[10.5rem] sm:w-[12rem]";
const KIT_CARD_IMAGE_CLASS = "h-14 w-14 shrink-0 sm:h-16 sm:w-16";

function KitItemCard({ item }: { item: StorefrontKitLine }) {
  return (
    <article
      className={`store-product-card flex ${KIT_ROW_H} w-[13rem] shrink-0 overflow-hidden rounded sm:w-[15rem]`}
    >
      <Link href={`/product/${item.productSlug}`} className="flex h-full min-w-0 flex-1 items-stretch">
        <div className={`store-product-card__image-area relative overflow-hidden ${KIT_CARD_IMAGE_CLASS}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.imageUrl} alt="" className="h-full w-full object-contain" />
        </div>
        <div className="flex h-full min-w-0 flex-1 flex-col justify-center gap-px overflow-hidden px-2 leading-none">
          {item.variantLabel ? (
            <p className="store-product-card__title line-clamp-1 text-sm font-bold">{item.variantLabel}</p>
          ) : null}
          <p className="store-product-card__description line-clamp-2 text-[10px] font-normal sm:text-[11px]">
            {item.productName}
          </p>
          <p className="store-product-card__price line-clamp-1 text-[10px] font-bold">
            {formatPriceUsd(item.unitPriceCents)}
          </p>
          {!item.inStock ? (
            <p className="store-product-card__stock-warn line-clamp-1 text-[9px] font-medium">Out of stock</p>
          ) : null}
        </div>
      </Link>
    </article>
  );
}

function KitComboOperator({ symbol }: { symbol: "+" | "=" }) {
  return (
    <span
      className={`kit-combo-operator flex ${KIT_ROW_H} w-10 shrink-0 items-center justify-center self-center text-xl font-black leading-none sm:w-14 sm:text-2xl`}
      aria-hidden
    >
      {symbol}
    </span>
  );
}

function KitPricingCard({ kit }: { kit: StorefrontProductKit }) {
  return (
    <aside
      className={`kit-combo-pricing flex ${KIT_ROW_H} w-full flex-col justify-center rounded border-2 border-lagoon/30 bg-lagoon/5 px-3`}
    >
      <div className="flex items-baseline justify-between gap-2 text-xs leading-tight">
        <span className="text-ink/75">Separate</span>
        <span className="text-ink/60 line-through">{formatPriceUsd(kit.listTotalCents)}</span>
      </div>
      <div className="mt-0.5 flex items-baseline justify-between gap-2 leading-tight">
        <span className="text-xs font-bold text-palm">Kit price</span>
        <span className="text-base font-black text-ink">{formatPriceUsd(kit.kitPriceCents)}</span>
      </div>
    </aside>
  );
}

function KitPricingColumn({
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
    <div className={`flex shrink-0 flex-col items-stretch gap-1.5 ${KIT_PRICING_W}`}>
      <KitPricingCard kit={kit} />
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

      <div
        className="mt-3 flex items-start justify-center gap-3 overflow-x-auto px-2 pb-0.5 sm:gap-4 md:justify-evenly md:gap-5 md:overflow-visible"
        role="list"
        aria-label="Kit combo"
      >
        {kit.items.map((item, index) => (
          <Fragment key={`${item.productId}:${item.variantId ?? ""}`}>
            {index > 0 ? <KitComboOperator symbol="+" /> : null}
            <KitItemCard item={item} />
          </Fragment>
        ))}
        <KitComboOperator symbol="=" />
        <KitPricingColumn
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
