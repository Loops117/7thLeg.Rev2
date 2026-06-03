"use client";

import Link from "next/link";
import type { ImageSubmissionPinAppearance } from "@/lib/image-submission-pin-appearance-shared";
import { pinMarkerUsesCustomImage } from "@/lib/image-submission-pin-appearance-shared";

const BASE_CLASS = "absolute z-10 -translate-x-1/2 -translate-y-1/2";

export function SubmissionPinMarker({
  appearance,
  position,
  interactive = false,
  href,
  label,
  onMouseMove,
  onMouseLeave,
}: {
  appearance: ImageSubmissionPinAppearance;
  position: { left: string; top: string };
  interactive?: boolean;
  href?: string;
  label?: string;
  onMouseMove?: (e: React.MouseEvent) => void;
  onMouseLeave?: () => void;
}) {
  const size = appearance.sizePx;
  const borderStyle = {
    borderWidth: appearance.borderWidthPx,
    borderColor: appearance.borderColor,
    borderStyle: "solid" as const,
  };

  const useCustom = pinMarkerUsesCustomImage(appearance);

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
    ...borderStyle,
    borderRadius: useCustom ? 4 : "9999px",
    overflow: "hidden",
    boxSizing: "border-box",
  };

  const className = `${BASE_CLASS} ${interactive ? "cursor-pointer shadow-md transition hover:scale-110" : "pointer-events-none shadow-md"}`;

  if (interactive && href) {
    return (
      <Link
        href={href}
        className={className}
        style={shellStyle}
        aria-label={label ? `View ${label}` : undefined}
        onClick={(e) => e.stopPropagation()}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
      >
        {inner}
      </Link>
    );
  }

  return (
    <span className={className} style={shellStyle} title={label}>
      {inner}
    </span>
  );
}
