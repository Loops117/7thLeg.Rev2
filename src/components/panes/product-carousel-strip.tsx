"use client";

import { useEffect, useRef, useState } from "react";
import { StoreProductCard } from "@/components/store/store-product-card";
import { HorizontalScrollRegion } from "@/components/ui/horizontal-scroll-region";
import { carouselAutoScrollIntervalMs } from "@/lib/pane-config";
import type { StorefrontProductCard } from "@/lib/products-storefront";

export function ProductCarouselStrip({
  products,
  autoScroll,
  direction,
  speed1to10,
  eventId,
  productDiagonalBrandName = null,
  productDiagonalNameGapPx = 8,
  watermarkOpacityPercent = 38,
}: {
  products: StorefrontProductCard[];
  autoScroll: boolean;
  direction: "left" | "right";
  speed1to10: number;
  /** When set, product links include `?event=` for timed / giveaway context. */
  eventId?: string;
  productDiagonalBrandName?: string | null;
  productDiagonalNameGapPx?: number;
  watermarkOpacityPercent?: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const innerRowRef = useRef<HTMLDivElement>(null);
  /** When nothing overflows horizontally, row is centered like a static gallery. */
  const [centerWhenFits, setCenterWhenFits] = useState(false);

  const productKey = products.map((p) => p.id).join(",");

  useEffect(() => {
    if (!autoScroll || products.length < 2) return;
    const el = scrollRef.current;
    if (!el) return;

    const step = () => {
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      if (direction === "left") {
        if (el.scrollLeft >= max - 2) el.scrollTo({ left: 0, behavior: "auto" });
        else el.scrollBy({ left: 280, behavior: "smooth" });
      } else {
        if (el.scrollLeft <= 2) el.scrollTo({ left: max, behavior: "auto" });
        else el.scrollBy({ left: -280, behavior: "smooth" });
      }
    };

    const intervalMs = carouselAutoScrollIntervalMs(speed1to10);
    const id = window.setInterval(step, intervalMs);
    return () => window.clearInterval(id);
  }, [autoScroll, direction, products.length, speed1to10]);

  useEffect(() => {
    const el = scrollRef.current;
    const row = innerRowRef.current;
    if (!el) return;
    const scrollEl = el;
    function measure() {
      setCenterWhenFits(scrollEl.scrollWidth <= scrollEl.clientWidth + 2);
    }
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (row) ro.observe(row);
    return () => ro.disconnect();
  }, [productKey]);

  return (
    <HorizontalScrollRegion ref={scrollRef} scrollClassName="-mx-1">
      <div
        ref={innerRowRef}
        className={`flex items-stretch gap-4 pb-2 pt-1 ${centerWhenFits ? "justify-center" : "justify-start"}`}
      >
        {products.map((p) => (
          <div key={p.id} className="flex w-44 shrink-0 sm:w-48">
            <StoreProductCard
              product={p}
              hover="zoom"
              compact
              eventId={eventId}
              productDiagonalBrandName={productDiagonalBrandName}
              productDiagonalNameGapPx={productDiagonalNameGapPx}
              watermarkOpacityPercent={watermarkOpacityPercent}
            />
          </div>
        ))}
      </div>
    </HorizontalScrollRegion>
  );
}
