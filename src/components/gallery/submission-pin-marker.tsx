"use client";

import Link from "next/link";
import type { ImageSubmissionPinAppearance } from "@/lib/image-submission-pin-appearance-shared";
import { pinMarkerUsesCustomImage } from "@/lib/image-submission-pin-appearance-shared";

const BASE_CLASS = "absolute z-10 -translate-x-1/2 -translate-y-1/2";

export function SubmissionPinMarker({
  appearance,
  position,
  interactive = false,
  highlighted = false,
  href,
  label,
  onMouseEnter,
  onMouseMove,
  onMouseLeave,
}: {
  appearance: ImageSubmissionPinAppearance;
  position: { left: string; top: string };
  interactive?: boolean;
  highlighted?: boolean;
  href?: string;
  label?: string;
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseMove?: (e: React.MouseEvent) => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
}) {
  const size = appearance.sizePx;
  const useCustom = pinMarkerUsesCustomImage(appearance);
  const borderColor = highlighted ? appearance.highlightColor : appearance.borderColor;
  const borderWidth = highlighted
    ? Math.max(appearance.borderWidthPx, 2)
    : appearance.borderWidthPx;

  const inner = useCustom ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={appearance.customImageUrl}
      alt=""
      className="block h-full w-full object-contain"
      draggable={false}
    />
  ) : (
    <span
      className="block h-full w-full rounded-full"
      style={{ backgroundColor: appearance.fillColor }}
    />
  );

  const shellStyle: React.CSSProperties = {
    left: position.left,
    top: position.top,
    width: size,
    height: size,
    borderWidth,
    borderColor,
    borderStyle: "solid",
    borderRadius: useCustom ? 4 : "9999px",
    overflow: "hidden",
    boxSizing: "border-box",
    boxShadow: highlighted
      ? `0 0 0 2px color-mix(in srgb, ${appearance.highlightColor} 55%, transparent), 0 0 14px 3px color-mix(in srgb, ${appearance.highlightColor} 70%, transparent)`
      : undefined,
    transform: highlighted ? "translate(-50%, -50%) scale(1.18)" : undefined,
    zIndex: highlighted ? 25 : 10,
  };

  const className = `${BASE_CLASS} ${highlighted ? "gallery-pin-marker--highlighted" : ""} ${
    interactive ? "cursor-pointer shadow-md transition-[transform,box-shadow,border-color] duration-150" : "pointer-events-none shadow-md"
  }`;

  const mouseHandlers = {
    onMouseEnter,
    onMouseMove,
    onMouseLeave,
  };

  if (interactive && href) {
    return (
      <Link
        href={href}
        className={className}
        style={shellStyle}
        aria-label={label ? `View ${label}` : undefined}
        onClick={(e) => e.stopPropagation()}
        {...mouseHandlers}
      >
        {inner}
      </Link>
    );
  }

  return (
    <span className={className} style={shellStyle} title={label} {...mouseHandlers}>
      {inner}
    </span>
  );
}
