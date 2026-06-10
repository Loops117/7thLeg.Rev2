"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { HorizontalScrollRegion } from "@/components/ui/horizontal-scroll-region";
import {
  carouselAutoScrollIntervalMs,
  DEFAULT_REVIEWS_TEXT_HEX,
  reviewCardSurfaceStyle,
} from "@/lib/pane-config";
import type { ProductReviewPublicRow } from "@/lib/product-reviews";

function reviewTitle(r: ProductReviewPublicRow): string {
  const title = r.title.trim();
  if (title) return title;
  return r.productName.trim() || "Review";
}

export function ReviewsPane({
  subHeading,
  reviews,
  autoScroll,
  direction,
  speed1to10,
  cardBgHex,
  cardBorderHex,
  cardBorderWidthPx,
  textColorHex,
  fontSizePx,
}: {
  subHeading: string;
  reviews: ProductReviewPublicRow[];
  autoScroll: boolean;
  direction: "left" | "right";
  speed1to10: number;
  cardBgHex: string;
  cardBorderHex: string;
  cardBorderWidthPx: number;
  textColorHex: string;
  fontSizePx: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const innerRowRef = useRef<HTMLDivElement>(null);
  const [centerWhenFits, setCenterWhenFits] = useState(false);

  const reviewKey = reviews.map((r) => r.id).join(",");
  const cardStyle = reviewCardSurfaceStyle({
    reviewsCardBgHex: cardBgHex,
    reviewsCardBorderHex: cardBorderHex,
    reviewsCardBorderWidthPx: cardBorderWidthPx,
  });
  const textColor = textColorHex || DEFAULT_REVIEWS_TEXT_HEX;
  const baseFontSize = fontSizePx;
  const bodySize = Math.max(11, baseFontSize - 1);

  useEffect(() => {
    if (!autoScroll || reviews.length < 2) return;
    const el = scrollRef.current;
    if (!el) return;

    const step = () => {
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      const stepPx = Math.min(360, Math.max(220, el.clientWidth * 0.42));
      if (direction === "left") {
        if (el.scrollLeft >= max - 2) el.scrollTo({ left: 0, behavior: "auto" });
        else el.scrollBy({ left: stepPx, behavior: "smooth" });
      } else {
        if (el.scrollLeft <= 2) el.scrollTo({ left: max, behavior: "auto" });
        else el.scrollBy({ left: -stepPx, behavior: "smooth" });
      }
    };

    const intervalMs = carouselAutoScrollIntervalMs(speed1to10);
    const id = window.setInterval(step, intervalMs);
    return () => window.clearInterval(id);
  }, [autoScroll, direction, reviews.length, speed1to10]);

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
  }, [reviewKey]);

  if (reviews.length === 0) {
    return (
      <div className="text-center" style={{ color: textColor, fontSize: `${baseFontSize}px` }}>
        {subHeading ? <p className="mb-3 opacity-90">{subHeading}</p> : null}
        <p className="text-sm opacity-75">No reviews yet — be the first to share your experience.</p>
      </div>
    );
  }

  return (
    <div style={{ color: textColor }}>
      {subHeading ? (
        <p className="mb-3 text-center font-medium opacity-90" style={{ fontSize: `${baseFontSize}px` }}>
          {subHeading}
        </p>
      ) : null}
      <HorizontalScrollRegion ref={scrollRef} scrollClassName="-mx-1">
        <div
          ref={innerRowRef}
          className={`flex items-stretch gap-5 px-1 pb-1 pt-1 sm:gap-6 ${centerWhenFits ? "justify-center" : "justify-start"}`}
        >
          {reviews.map((r) => (
            <ReviewPaneCard
              key={r.id}
              review={r}
              cardStyle={cardStyle}
              textColor={textColor}
              baseFontSize={baseFontSize}
              bodySize={bodySize}
            />
          ))}
        </div>
      </HorizontalScrollRegion>
    </div>
  );
}

function ReviewPaneCard({
  review,
  cardStyle,
  textColor,
  baseFontSize,
  bodySize,
}: {
  review: ProductReviewPublicRow;
  cardStyle: CSSProperties;
  textColor: string;
  baseFontSize: number;
  bodySize: number;
}) {
  return (
    <article
      className="flex h-full w-80 shrink-0 flex-col rounded px-4 py-3 sm:w-96"
      style={cardStyle}
    >
      <h3 className="font-bold leading-snug" style={{ fontSize: `${baseFontSize}px`, color: textColor }}>
        {reviewTitle(review)}
      </h3>
      <p
        className="mt-2 flex-1 italic leading-relaxed"
        style={{ fontSize: `${bodySize}px`, color: textColor }}
      >
        {review.body.trim()}
      </p>
      <p
        className="mt-3 font-medium leading-snug opacity-85"
        style={{ fontSize: `${bodySize}px`, color: textColor }}
      >
        By: {review.authorName.trim() || "Customer"}
      </p>
    </article>
  );
}
