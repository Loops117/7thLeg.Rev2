"use client";

import { forwardRef, type ReactNode, useCallback, useRef } from "react";
import { btnSecondarySm } from "@/lib/btn-theme-classes";

const noScrollbar =
  "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

type HorizontalScrollRegionProps = {
  children: ReactNode;
  className?: string;
  /** Extra classes on the scrollable element (e.g. flex row). */
  scrollClassName?: string;
};

/**
 * Horizontal strip with hidden scrollbar and side arrows (semi-transparent until hover).
 * Arrow clicks loop when reaching an end (endless scroll).
 */
export const HorizontalScrollRegion = forwardRef(function HorizontalScrollRegion(
  { children, className = "", scrollClassName = "" }: HorizontalScrollRegionProps,
  ref: React.ForwardedRef<HTMLDivElement>,
) {
  const innerRef = useRef<HTMLDivElement | null>(null);

  const setRefs = useCallback(
    (el: HTMLDivElement | null) => {
      innerRef.current = el;
      if (typeof ref === "function") {
        ref(el);
      } else if (ref) {
        ref.current = el;
      }
    },
    [ref],
  );

  const step = useCallback((direction: 1 | -1) => {
    const el = innerRef.current;
    if (!el) return;
    const amount = Math.min(300, Math.max(180, el.clientWidth * 0.72));
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 0) return;
    if (direction > 0) {
      if (el.scrollLeft >= max - 2) el.scrollTo({ left: 0, behavior: "smooth" });
      else el.scrollBy({ left: amount, behavior: "smooth" });
    } else {
      if (el.scrollLeft <= 2) el.scrollTo({ left: max, behavior: "smooth" });
      else el.scrollBy({ left: -amount, behavior: "smooth" });
    }
  }, []);

  const btnBase = `${btnSecondarySm} absolute top-1/2 z-10 h-10 w-9 -translate-y-1/2 text-lg opacity-55 shadow-sm backdrop-blur-[2px] transition-all duration-150 hover:opacity-100 disabled:pointer-events-none disabled:opacity-25`;

  return (
    <div className={`relative ${className}`.trim()}>
      <button type="button" aria-label="Scroll left" className={`${btnBase} left-0 pl-0.5`} onClick={() => step(-1)}>
        ‹
      </button>
      <button type="button" aria-label="Scroll right" className={`${btnBase} right-0 pr-0.5`} onClick={() => step(1)}>
        ›
      </button>
      <div
        ref={setRefs}
        className={`overflow-x-auto scroll-smooth pb-1 pt-1 ${noScrollbar} ${scrollClassName}`.trim()}
      >
        {children}
      </div>
    </div>
  );
});
