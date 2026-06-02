"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const STICKY_TOP_PX = 12;

/**
 * Keeps template preview visible while scrolling the editor body.
 * Falls back to position:fixed when CSS sticky is blocked by ancestor overflow.
 */
export function TemplateEditorStickyPreview({
  enabled,
  preview,
  children,
}: {
  enabled: boolean;
  preview: ReactNode;
  children: ReactNode;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(false);
  const [geom, setGeom] = useState({ left: 0, width: 0, height: 0 });

  useEffect(() => {
    if (!enabled) {
      setPinned(false);
      return;
    }

    const track = trackRef.current;
    const preview = previewRef.current;
    if (!track || !preview) return;

    const update = () => {
      const trackRect = track.getBoundingClientRect();
      const previewH = preview.offsetHeight;

      const pin =
        trackRect.top < STICKY_TOP_PX && trackRect.bottom > STICKY_TOP_PX + previewH + 8;

      if (pin) {
        setGeom({
          left: trackRect.left,
          width: track.offsetWidth,
          height: previewH,
        });
        setPinned(true);
      } else {
        setPinned(false);
      }
    };

    update();
    window.addEventListener("scroll", update, { passive: true, capture: true });
    window.addEventListener("resize", update);
    const ro = new ResizeObserver(update);
    ro.observe(track);
    ro.observe(preview);

    return () => {
      window.removeEventListener("scroll", update, { capture: true });
      window.removeEventListener("resize", update);
      ro.disconnect();
    };
  }, [enabled]);

  if (!enabled) {
    return (
      <>
        {preview}
        {children}
      </>
    );
  }

  return (
    <div ref={trackRef} className="min-w-0">
      <div
        ref={previewRef}
        className={
          pinned
            ? "fixed z-[60] rounded-lg bg-white/95 px-1 pb-3 shadow-lg ring-1 ring-palm/15 backdrop-blur-md dark:bg-zinc-900/95 dark:ring-zinc-700"
            : "sticky top-3 z-30 -mx-1 mb-1 bg-white/90 px-1 pb-3 backdrop-blur-md dark:bg-zinc-900/90"
        }
        style={
          pinned
            ? {
                top: STICKY_TOP_PX,
                left: geom.left,
                width: geom.width,
              }
            : undefined
        }
      >
        {preview}
      </div>
      {pinned ? <div aria-hidden style={{ height: geom.height }} className="mb-1" /> : null}
      <div className="grid gap-4 pt-2">{children}</div>
    </div>
  );
}
