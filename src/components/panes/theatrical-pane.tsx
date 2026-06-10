"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { TheatricalStageFrame } from "@/components/panes/theatrical-stage-frame";
import {
  resolveTheatricalVideoSrc,
  theatricalElementStyle,
  theatricalTextBoxStyle,
  THEATRICAL_MOBILE_BREAKPOINT_PX,
  type TheatricalPaneElement,
  type TheatricalStageAspect,
} from "@/lib/theatrical-pane";

export type TheatricalPaneMobileConfig = {
  enabled: boolean;
  stageAspect: TheatricalStageAspect;
  stageMaxHeightPx: number;
  stageBgHex: string;
  elements: TheatricalPaneElement[];
};

function subscribeTheatricalMobileMq(cb: () => void) {
  const mq = window.matchMedia(`(max-width: ${THEATRICAL_MOBILE_BREAKPOINT_PX}px)`);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function isTheatricalMobileViewport() {
  return window.matchMedia(`(max-width: ${THEATRICAL_MOBILE_BREAKPOINT_PX}px)`).matches;
}

function useTheatricalMobileViewport() {
  return useSyncExternalStore(subscribeTheatricalMobileMq, isTheatricalMobileViewport, () => false);
}
import { btnMainMd } from "@/lib/btn-theme-classes";

function TheatricalNativeVideo({
  src,
  autoplay,
  muted,
  loop,
  stabilize,
}: {
  src: string;
  autoplay: boolean;
  muted: boolean;
  loop: boolean;
  stabilize: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video || !autoplay) return;
    void video.play().catch(() => {});
  }, [src, autoplay]);

  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <video
      ref={ref}
      src={src}
      className={`theatrical-pane__video h-full w-full object-cover${stabilize ? " theatrical-pane__video--stabilize" : ""}`}
      playsInline
      autoPlay={autoplay}
      muted={muted}
      loop={loop}
      preload="auto"
      disablePictureInPicture
      controls={false}
    />
  );
}

export function TheatricalElementView({
  el,
  positioned = true,
}: {
  el: TheatricalPaneElement;
  /** When false, parent supplies absolute positioning (editor drag layer). */
  positioned?: boolean;
}) {
  const boxStyle = positioned
    ? el.kind === "text"
      ? theatricalTextBoxStyle(el)
      : theatricalElementStyle(el)
    : { width: "100%", height: "100%" };

  if (el.kind === "video") {
    const src = resolveTheatricalVideoSrc(el.videoUrl ?? "");
    if (!src) {
      if (positioned) return null;
      return (
        <div
          className="theatrical-pane-editor__video-placeholder theatrical-pane__element theatrical-pane__element--video flex h-full w-full items-center justify-center text-xs"
          style={boxStyle}
        >
          Video (upload or paste .mp4 / .webm URL)
        </div>
      );
    }
    return (
      <div
        className="theatrical-pane__element theatrical-pane__element--video h-full w-full overflow-hidden"
        style={boxStyle}
      >
        <TheatricalNativeVideo
          src={src}
          autoplay={!!el.videoAutoplay}
          muted={el.videoMuted !== false}
          loop={!!el.videoLoop}
          stabilize={!!el.videoStabilize}
        />
      </div>
    );
  }

  if (el.kind === "image") {
    const src = el.imageUrl?.trim();
    return (
      <div
        className="theatrical-pane__element theatrical-pane__element--image h-full w-full overflow-hidden"
        style={boxStyle}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="h-full w-full object-contain" />
        ) : null}
      </div>
    );
  }

  if (el.kind === "text") {
    const html = el.html?.trim();
    if (!html) return null;
    return (
      <div
        className="theatrical-pane__element theatrical-pane__element--text store-rich theatrical-pane__element--text-copyable h-full w-full overflow-hidden bg-transparent p-3"
        style={boxStyle}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  const href = el.linkHref?.trim() || "#";
  const label = el.linkLabel?.trim() || "Learn more";
  const external = el.linkOpenInNewTab || /^https?:\/\//i.test(href);

  return (
    <div
      className="theatrical-pane__element theatrical-pane__element--link flex h-full w-full items-center justify-center p-2"
      style={boxStyle}
    >
      {external && !href.startsWith("/") ? (
        <a
          href={href}
          target={el.linkOpenInNewTab ? "_blank" : undefined}
          rel={el.linkOpenInNewTab ? "noopener noreferrer" : undefined}
          className={btnMainMd}
        >
          {label}
        </a>
      ) : (
        <Link href={href} className={btnMainMd}>
          {label}
        </Link>
      )}
    </div>
  );
}

export function TheatricalPane({
  stageAspect,
  stageMaxHeightPx,
  stageBgHex,
  elements,
  mobile,
}: {
  stageAspect: TheatricalStageAspect;
  stageMaxHeightPx?: number;
  stageBgHex: string;
  elements: TheatricalPaneElement[];
  mobile?: TheatricalPaneMobileConfig | null;
}) {
  const isMobileViewport = useTheatricalMobileViewport();
  const useMobileLayout = isMobileViewport && !!mobile?.enabled;
  const activeAspect = useMobileLayout ? mobile!.stageAspect : stageAspect;
  const activeMaxHeight = useMobileLayout ? mobile!.stageMaxHeightPx : (stageMaxHeightPx ?? 0);
  const activeBg = useMobileLayout ? mobile!.stageBgHex : stageBgHex;
  const activeElements = useMobileLayout ? mobile!.elements : elements;
  const sorted = [...activeElements].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <TheatricalStageFrame
      aspect={activeAspect}
      maxHeightPx={activeMaxHeight}
      bgHex={activeBg}
      stageClassName="theatrical-pane__stage rounded-lg border-2 border-palm/20"
    >
      {sorted.map((el) => (
        <TheatricalElementView key={el.id} el={el} />
      ))}
    </TheatricalStageFrame>
  );
}
