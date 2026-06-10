import { formatPriceUsd } from "@/lib/product-slug";

const VARIANT_LABEL_INLINE_MAX = 8;

export function StoreProductCardPriceRow({
  priceCents,
  showSale = false,
  variantLabel = null,
  compact = false,
  mini = false,
}: {
  priceCents: number;
  showSale?: boolean;
  variantLabel?: string | null;
  compact?: boolean;
  mini?: boolean;
}) {
  const label = variantLabel?.trim() || null;
  const labelBelow = label ? label.length > VARIANT_LABEL_INLINE_MAX : false;
  const priceClass = `store-product-card__price font-bold ${
    mini ? "text-[10px]" : compact ? "text-xs" : "text-sm"
  }`;
  const variantClass = `store-product-card__variant font-medium ${
    compact || mini ? "text-[10px]" : "text-xs"
  }`;

  const saleNode = showSale ? <span className="store-product-card__sale ml-1">Sale</span> : null;

  if (!label) {
    return (
      <p className={priceClass}>
        {formatPriceUsd(priceCents)}
        {saleNode}
      </p>
    );
  }

  if (labelBelow) {
    return (
      <div>
        <p className={priceClass}>
          {formatPriceUsd(priceCents)}
          {saleNode}
        </p>
        <p className={`${variantClass} mt-0.5 line-clamp-2`}>{label}</p>
      </div>
    );
  }

  return (
    <p className={`${priceClass} flex flex-wrap items-baseline`}>
      <span>{formatPriceUsd(priceCents)}</span>
      {saleNode}
      <span className={`${variantClass} ml-1`}>{label}</span>
    </p>
  );
}
