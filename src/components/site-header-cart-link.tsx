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
        <div
          className="absolute right-0 top-full z-50 mt-1 w-72 rounded border-2 border-palm/30 bg-white p-3 shadow-xl dark:border-zinc-600 dark:bg-zinc-900"
          role="tooltip"
        >
          <p className="text-xs font-black uppercase text-palm">Cart preview</p>
          <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto text-sm">
            {lines.slice(0, 8).map((line, i) => (
              <li key={`${line.name}-${i}`} className="border-b border-palm/10 pb-2 last:border-0 dark:border-zinc-700">
                <p className="font-bold text-ink dark:text-zinc-100">
                  {line.quantity}× {line.name}
                </p>
                {line.detail ? <p className="text-xs text-ink/60">{line.detail}</p> : null}
                <p className="text-xs font-bold text-palm">{formatPriceUsd(line.lineTotalCents)}</p>
              </li>
            ))}
          </ul>
          {lines.length > 8 ? (
            <p className="mt-1 text-[10px] text-ink/50">+ {lines.length - 8} more…</p>
          ) : null}
          <p className="mt-2 border-t border-palm/15 pt-2 text-sm font-black text-ink dark:border-zinc-700 dark:text-zinc-100">
            Subtotal {formatPriceUsd(subtotalCents)}
          </p>
          <p className="mt-1 text-[10px] text-ink/50">Open cart for full details</p>
        </div>
      ) : null}
    </div>
  );
}
