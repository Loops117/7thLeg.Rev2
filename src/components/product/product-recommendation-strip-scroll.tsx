"use client";

import type { ReactNode } from "react";
import { HorizontalScrollRegion } from "@/components/ui/horizontal-scroll-region";

/** Related / also-want rows: no scrollbar; side arrows when the strip overflows. */
export function ProductRecommendationStripScroll({ children }: { children: ReactNode }) {
  return (
    <HorizontalScrollRegion
      arrowsWhenOverflowOnly
      scrollClassName="product-recommendation-strip-scroll -mx-0.5 px-0.5"
    >
      {children}
    </HorizontalScrollRegion>
  );
}
