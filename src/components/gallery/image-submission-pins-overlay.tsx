"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { SubmissionPinMarker } from "@/components/gallery/submission-pin-marker";
import { imageDisplayOverlayBox } from "@/lib/image-hotspot-layout";
import { btnMainSm, btnSecondarySm } from "@/lib/btn-theme-classes";
import type { ImageSubmissionPinAppearance } from "@/lib/image-submission-pin-appearance-shared";
import { formatPriceUsd } from "@/lib/product-slug";
import { useCoarsePointer } from "@/lib/use-coarse-pointer";
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
  coarsePointer,
  tappedPinKey,
  onPinTap,
  onHighlightKeyChange,
}: {
  pin: StorefrontImagePin;
  appearance: ImageSubmissionPinAppearance;
  position: { left: string; top: string };
  interactive: boolean;
  highlighted: boolean;
  coarsePointer: boolean;
  tappedPinKey: string | null;
  onPinTap: (pin: StorefrontImagePin) => void;
  onHighlightKeyChange?: (key: string | null) => void;
}) {
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
  const label = pinHoverLabel(pin);
  const href = productUrlForPin(pin.productSlug, pin.variantId);
  const pinKey = storefrontPinHighlightKey(pin);
  const useTapSelect = coarsePointer && interactive;

  return (
    <>
      <SubmissionPinMarker
        appearance={appearance}
        position={position}
        interactive={interactive}
        highlighted={highlighted || tappedPinKey === pinKey}
        href={useTapSelect ? undefined : interactive ? href : undefined}
        label={label}
        onPinClick={
          useTapSelect
            ? () => {
                onPinTap(pin);
                onHighlightKeyChange?.(pinKey);
              }
            : undefined
        }
        onMouseEnter={
          interactive && !coarsePointer && onHighlightKeyChange
            ? () => onHighlightKeyChange(pinKey)
            : undefined
        }
        onMouseMove={
          interactive && !coarsePointer
            ? (e) => {
                onHighlightKeyChange?.(pinKey);
                setTip({ x: e.clientX, y: e.clientY });
              }
            : undefined
        }
        onMouseLeave={
          interactive && !coarsePointer
            ? () => {
                onHighlightKeyChange?.(null);
                setTip(null);
              }
            : undefined
        }
      />
      {tip && interactive && !coarsePointer ? (
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

function MobilePinPopup({
  pin,
  onClose,
}: {
  pin: StorefrontImagePin;
  onClose: () => void;
}) {
  const href = productUrlForPin(pin.productSlug, pin.variantId);

  return (
    <div
      className="gallery-pin-mobile-popup fixed inset-x-3 z-[115] rounded-lg border-2 px-3 py-3 shadow-xl max-sm:bottom-[calc(var(--gallery-viewer-tagged-mobile-h,34vh)+0.75rem)] sm:hidden"
      role="dialog"
      aria-label="Tagged product"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="font-black text-palm">{pinVariationDisplayName(pin)}</p>
      <p className="mt-0.5 text-sm font-bold text-ink">{pin.productName}</p>
      <p className="mt-0.5 text-sm font-bold tabular-nums text-[color:var(--gallery-price)]">
        {formatPriceUsd(pin.priceCents)}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href={href} className={btnMainSm} onClick={(e) => e.stopPropagation()}>
          View product
        </Link>
        <button type="button" onClick={onClose} className={btnSecondarySm}>
          Close
        </button>
      </div>
    </div>
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
  const [tappedPin, setTappedPin] = useState<StorefrontImagePin | null>(null);
  const coarsePointer = useCoarsePointer();

  const measure = useCallback(() => {
    const wrap = wrapRef.current;
    const img = imgRef.current;
    if (!wrap || !img || img.naturalWidth <= 0 || img.naturalHeight <= 0) return;
    const cw = img.offsetWidth;
    const ch = img.offsetHeight;
    if (cw <= 0 || ch <= 0) return;
    setSize({
      cw,
      ch,
      nw: img.naturalWidth,
      nh: img.naturalHeight,
    });
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    const img = imgRef.current;
    if (!wrap || !img) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(img);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [measure, imageUrl]);

  useEffect(() => {
    setTappedPin(null);
  }, [imageUrl]);

  const canPlace = size.cw > 0 && size.nw > 0;
  const tappedPinKey = tappedPin ? storefrontPinHighlightKey(tappedPin) : null;
  const pinLayerBox = canPlace
    ? imageDisplayOverlayBox(size.cw, size.ch, size.nw, size.nh)
    : null;

  function onPinTap(pin: StorefrontImagePin) {
    const key = storefrontPinHighlightKey(pin);
    setTappedPin((cur) => {
      const closing = cur != null && storefrontPinHighlightKey(cur) === key;
      onHighlightKeyChange?.(closing ? null : key);
      return closing ? null : pin;
    });
  }

  function closeMobilePopup() {
    setTappedPin(null);
    onHighlightKeyChange?.(null);
  }

  return (
    <div
      ref={wrapRef}
      className={`relative inline-block max-w-full ${className}`}
      style={{ ["--gallery-pin-highlight" as string]: pinAppearance.highlightColor } as React.CSSProperties}
      onClick={coarsePointer && tappedPin ? closeMobilePopup : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={imageUrl}
        alt={alt}
        className={`block ${imgClassName}`}
        style={maxHeight ? { maxHeight } : undefined}
        draggable={false}
        onLoad={measure}
      />
      {showPins && pinLayerBox ? (
        <div
          className="absolute pointer-events-none"
          style={{
            left: pinLayerBox.left,
            top: pinLayerBox.top,
            width: pinLayerBox.width,
            height: pinLayerBox.height,
          }}
        >
          {pins.map((pin) => {
            const key = storefrontPinHighlightKey(pin);
            return (
              <PinWithTooltip
                key={pin.id}
                pin={pin}
                appearance={pinAppearance}
                position={{ left: `${pin.xPercent}%`, top: `${pin.yPercent}%` }}
                interactive={interactive}
                highlighted={highlightKey === key}
                coarsePointer={coarsePointer}
                tappedPinKey={tappedPinKey}
                onPinTap={onPinTap}
                onHighlightKeyChange={interactive ? onHighlightKeyChange : undefined}
              />
            );
          })}
        </div>
      ) : null}
      {tappedPin && coarsePointer ? <MobilePinPopup pin={tappedPin} onClose={closeMobilePopup} /> : null}
    </div>
  );
}
