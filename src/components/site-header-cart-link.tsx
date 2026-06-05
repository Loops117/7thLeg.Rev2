"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { formatPriceUsd } from "@/lib/product-slug";

export type CartPreviewLine = {
  name: string;
  detail: string | null;
  quantity: number;
  lineTotalCents: number;
};

export function SiteHeaderCartLink({
  count,
  lines,
  subtotalCents,
}: {
  count: number;
  lines: CartPreviewLine[];
  subtotalCents: number;
}) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onEnter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };

  const onLeave = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  return (
    <div className="relative" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <Link
        href="/cart"
        className="flex items-center gap-1.5 rounded border-2 border-mango bg-mango px-2 py-0.5 text-xs font-bold text-palm shadow-sm hover:border-coral hover:bg-coral hover:text-white sm:gap-2 sm:px-3 sm:py-1.5 sm:text-sm"
        aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
      >
        Cart
        <span className="min-w-[1.1rem] text-center text-[10px] text-palm/80 sm:min-w-[1.25rem] sm:text-xs">
          {count}
        </span>
      </Link>
      {open && count > 0 ? (
        <div className="header-cart-preview" role="tooltip">
          <p className="header-cart-preview__heading">Cart preview</p>
          <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto">
            {lines.slice(0, 8).map((line, i) => (
              <li key={`${line.name}-${i}`} className="header-cart-preview__line">
                <p className="header-cart-preview__line-name">
                  {line.quantity}× {line.name}
                </p>
                {line.detail ? <p className="header-cart-preview__line-detail">{line.detail}</p> : null}
                <p className="header-cart-preview__line-price">{formatPriceUsd(line.lineTotalCents)}</p>
              </li>
            ))}
          </ul>
          {lines.length > 8 ? (
            <p className="header-cart-preview__hint">+ {lines.length - 8} more…</p>
          ) : null}
          <p className="header-cart-preview__subtotal">Subtotal {formatPriceUsd(subtotalCents)}</p>
          <p className="header-cart-preview__hint">Open cart for full details</p>
        </div>
      ) : null}
    </div>
  );
}
