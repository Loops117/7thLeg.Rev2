"use client";

import type { ReactNode } from "react";
import { HorizontalScrollRegion } from "@/components/ui/horizontal-scroll-region";

/** Featured products row on the store page: hidden scrollbar + side arrows. */
export function FeaturedStripScroll({ children }: { children: ReactNode }) {
  return <HorizontalScrollRegion scrollClassName="-mx-1">{children}</HorizontalScrollRegion>;
}
