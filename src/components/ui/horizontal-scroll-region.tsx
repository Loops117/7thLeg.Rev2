"use client";

import { forwardRef, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { btnSecondarySm } from "@/lib/btn-theme-classes";

const noScrollbar =
  "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

type HorizontalScrollRegionProps = {
  children: ReactNode;
  className?: string;
  /** Extra classes on the scrollable element (e.g. flex row). */
  scrollClassName?: string;
  /** Hide side arrows when all items fit (no horizontal overflow). */
  arrowsWhenOverflowOnly?: boolean;
};

/**
 * Horizontal strip with hidden scrollbar and side arrows (semi-transparent until hover).
 * Arrow clicks loop when reaching an end (endless scroll).
 */
export const HorizontalScrollRegion = forwardRef(function HorizontalScrollRegion(
  { children, className = "", scrollClassName = "", arrowsWhenOverflowOnly = false }: HorizontalScrollRegionProps,
  ref: React.ForwardedRef<HTMLDivElement>,
) {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [overflows, setOverflows] = useState(false);

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

  const checkOverflow = useCallback(() => {
    const el = innerRef.current;
    if (!el) return;
    setOverflows(el.scrollWidth > el.clientWidth + 1);
  }, []);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    checkOverflow();
    const ro = new ResizeObserver(checkOverflow);
    ro.observe(el);
    for (const child of el.children) {
      ro.observe(child);
    }
    return () => ro.disconnect();
  }, [checkOverflow, children]);

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
  const showArrows = !arrowsWhenOverflowOnly || overflows;

  return (
    <div className={`relative ${className}`.trim()}>
      {showArrows ? (
        <>
          <button
            type="button"
            aria-label="Scroll left"
            className={`${btnBase} left-0 pl-0.5`}
            onClick={() => step(-1)}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            className={`${btnBase} right-0 pr-0.5`}
            onClick={() => step(1)}
          >
            ›
          </button>
        </>
      ) : null}
      <div
        ref={setRefs}
        className={`overflow-x-auto scroll-smooth pb-1 pt-1 ${noScrollbar} ${scrollClassName}`.trim()}
      >
        {children}
      </div>
    </div>
  );
});
