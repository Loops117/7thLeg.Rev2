"use client";

import Link from "next/link";
import { TheatricalStageFrame } from "@/components/panes/theatrical-stage-frame";
import {
  theatricalElementStyle,
  theatricalTextBoxStyle,
  theatricalVideoEmbed,
  type TheatricalPaneElement,
  type TheatricalStageAspect,
} from "@/lib/theatrical-pane";
import { btnMainMd } from "@/lib/btn-theme-classes";

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
    const embed = theatricalVideoEmbed(el.videoUrl ?? "");
    if (!embed) {
      if (positioned) return null;
      return (
        <div
          className="theatrical-pane__element theatrical-pane__element--video flex h-full w-full items-center justify-center bg-transparent text-xs text-white/50"
          style={boxStyle}
        >
          Video (set URL)
        </div>
      );
    }
    if (embed.kind === "video") {
      return (
        <div
          className="theatrical-pane__element theatrical-pane__element--video h-full w-full overflow-hidden"
          style={boxStyle}
        >
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            src={embed.src}
            className="h-full w-full object-cover"
            controls
            playsInline
            autoPlay={el.videoAutoplay}
            muted={el.videoMuted ?? true}
            loop={el.videoLoop}
          />
        </div>
      );
    }
    return (
      <div
        className="theatrical-pane__element theatrical-pane__element--video h-full w-full overflow-hidden"
        style={boxStyle}
      >
        <iframe
          src={embed.src}
          title="Theatrical video"
          className="h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
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
}: {
  stageAspect: TheatricalStageAspect;
  stageMaxHeightPx?: number;
  stageBgHex: string;
  elements: TheatricalPaneElement[];
}) {
  const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <TheatricalStageFrame
      aspect={stageAspect}
      maxHeightPx={stageMaxHeightPx ?? 0}
      bgHex={stageBgHex}
      stageClassName="theatrical-pane__stage rounded-lg border-2 border-palm/20"
    >
      {sorted.map((el) => (
        <TheatricalElementView key={el.id} el={el} />
      ))}
    </TheatricalStageFrame>
  );
}
