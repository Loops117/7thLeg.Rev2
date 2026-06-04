"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SubmissionPinMarker } from "@/components/gallery/submission-pin-marker";
import { pinCenterToContainerStyle } from "@/lib/image-hotspot-layout";
import type { ImageSubmissionPinAppearance } from "@/lib/image-submission-pin-appearance-shared";
import { formatPriceUsd } from "@/lib/product-slug";
import {
  pinHoverLabel,
  pinVariationDisplayName,
  productUrlForPin,
  storefrontPinHighlightKey,
  type StorefrontImagePin,
} from "@/lib/image-submission-pins-storefront";

type Props = {
  imageUrl: string;
  alt: string;
  pins: StorefrontImagePin[];
  pinAppearance: ImageSubmissionPinAppearance;
  interactive?: boolean;
  showPins?: boolean;
  className?: string;
  imgClassName?: string;
  maxHeight?: string;
  /** When set, pins matching this product+variant key show the highlight ring. */
  highlightKey?: string | null;
  onHighlightKeyChange?: (key: string | null) => void;
};

function PinWithTooltip({
  pin,
  appearance,
  position,
  interactive,
  highlighted,
  onHighlightKeyChange,
}: {
  pin: StorefrontImagePin;
  appearance: ImageSubmissionPinAppearance;
  position: { left: string; top: string };
  interactive: boolean;
  highlighted: boolean;
  onHighlightKeyChange?: (key: string | null) => void;
}) {
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
  const label = pinHoverLabel(pin);
  const href = productUrlForPin(pin.productSlug, pin.variantId);
  const pinKey = storefrontPinHighlightKey(pin);

  return (
    <>
      <SubmissionPinMarker
        appearance={appearance}
        position={position}
        interactive={interactive}
        highlighted={highlighted}
        href={interactive ? href : undefined}
        label={label}
        onMouseEnter={
          interactive && onHighlightKeyChange
            ? () => onHighlightKeyChange(pinKey)
            : undefined
        }
        onMouseMove={
          interactive
            ? (e) => {
                onHighlightKeyChange?.(pinKey);
                setTip({ x: e.clientX, y: e.clientY });
              }
            : undefined
        }
        onMouseLeave={
          interactive
            ? () => {
                onHighlightKeyChange?.(null);
                setTip(null);
              }
            : undefined
        }
      />
      {tip && interactive ? (
        <div
          className="gallery-pin-tooltip pointer-events-none fixed z-[200] max-w-[16rem] rounded border px-3 py-2 text-xs shadow-lg"
          style={{ left: tip.x + 14, top: tip.y + 14 }}
          role="tooltip"
        >
          <p className="font-black text-palm">{pinVariationDisplayName(pin)}</p>
          <p className="mt-0.5 font-bold">{pin.productName}</p>
          <p className="mt-0.5 font-bold tabular-nums text-[color:var(--gallery-price)]">
            {formatPriceUsd(pin.priceCents)}
          </p>
          <p className="mt-1 text-[11px] font-bold text-lagoon-dark">Click to see product</p>
        </div>
      ) : null}
    </>
  );
}

export function ImageSubmissionPinsOverlay({
  imageUrl,
  alt,
  pins,
  pinAppearance,
  interactive = true,
  showPins = true,
  className = "",
  imgClassName = "mx-auto block w-full object-contain",
  maxHeight,
  highlightKey = null,
  onHighlightKeyChange,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [size, setSize] = useState({ cw: 0, ch: 0, nw: 0, nh: 0 });

  const measure = useCallback(() => {
    const wrap = wrapRef.current;
    const img = imgRef.current;
    if (!wrap || !img) return;
    setSize({
      cw: wrap.clientWidth,
      ch: wrap.clientHeight,
      nw: img.naturalWidth,
      nh: img.naturalHeight,
    });
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [measure, imageUrl]);

  const canPlace = size.cw > 0 && size.nw > 0;

  return (
    <div
      ref={wrapRef}
      className={`relative ${className}`}
      style={
        maxHeight
          ? ({ maxHeight, ["--gallery-pin-highlight" as string]: pinAppearance.highlightColor } as React.CSSProperties)
          : ({ ["--gallery-pin-highlight" as string]: pinAppearance.highlightColor } as React.CSSProperties)
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={imageUrl}
        alt={alt}
        className={imgClassName}
        style={maxHeight ? { maxHeight } : undefined}
        draggable={false}
        onLoad={measure}
      />
      {showPins && canPlace
        ? pins.map((pin) => {
            const pos = pinCenterToContainerStyle(
              pin.xPercent,
              pin.yPercent,
              size.cw,
              size.ch,
              size.nw,
              size.nh,
            );
            if (!pos) return null;
            const key = storefrontPinHighlightKey(pin);
            return (
              <PinWithTooltip
                key={pin.id}
                pin={pin}
                appearance={pinAppearance}
                position={pos}
                interactive={interactive}
                highlighted={highlightKey === key}
                onHighlightKeyChange={interactive ? onHighlightKeyChange : undefined}
              />
            );
          })
        : null}
    </div>
  );
}
