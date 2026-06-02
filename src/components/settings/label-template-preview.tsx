"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  estimateBorderTextWidthPx,
  type LabelBorderConfig,
} from "@/lib/label-template-border";
import { editableRegionPx } from "@/lib/label-template-canvas";

/** Preview box longest edge before viewport scaling (mm-driven aspect). */
const PREVIEW_NATURAL_MAX_SIDE = 260;
/** Scroll viewport inside preview chrome (px). */
const PREVIEW_VIEWPORT = 320;

function displayLabelSize(widthMm: number, heightMm: number): { dw: number; dh: number } {
  const wm = Math.max(1, widthMm);
  const hm = Math.max(1, heightMm);
  const ar = wm / hm;
  if (ar >= 1) {
    const dw = PREVIEW_NATURAL_MAX_SIDE;
    return { dw, dh: PREVIEW_NATURAL_MAX_SIDE / ar };
  }
  const dh = PREVIEW_NATURAL_MAX_SIDE;
  return { dw: PREVIEW_NATURAL_MAX_SIDE * ar, dh };
}

/** Fit scale so natural dw×dh fits inside PREVIEW_VIEWPORT. */
function zoomToFitScale(dw: number, dh: number): number {
  return Math.min(PREVIEW_VIEWPORT / dw, PREVIEW_VIEWPORT / dh, 2.5);
}

/** Design px — show center guides when offset is within this distance of 0. */
function centerGuideThresholdPx(cw: number, ch: number): number {
  return Math.max(6, Math.round(Math.min(cw, ch) * 0.02));
}

function BorderSvgLayer({
  cw,
  ch,
  cfg,
}: {
  cw: number;
  ch: number;
  cfg: LabelBorderConfig;
}) {
  if (cfg.mode === "none") return null;
  const bi = Math.min(Math.max(0, cfg.insetPx), Math.floor(Math.min(cw, ch) / 2) - 2);
  const s = Math.max(1, Math.min(48, cfg.strokePx));
  const c = cfg.color;
  const iw = cw - 2 * bi;

  const xl = bi + s / 2;
  const xr = cw - bi - s / 2;
  const yt = bi + s / 2;
  const yb = ch - bi - s / 2;
  const xc = (xl + xr) / 2;

  if (cfg.mode === "solid") {
    return (
      <rect
        x={xl}
        y={yt}
        width={iw - s}
        height={ch - 2 * bi - s}
        fill="none"
        stroke={c}
        strokeWidth={s}
      />
    );
  }

  const fs = Math.max(10, Math.min(28, s * 4.5));
  const text = cfg.bottomText.trim() || "Your site.com";
  const pad = Math.max(0, cfg.textPaddingPx);
  const gapW = Math.min(iw * 0.72, estimateBorderTextWidthPx(text, fs) + pad * 2);
  const tx = xc + cfg.textOffsetXPx;
  let gapA = tx - gapW / 2;
  let gapB = tx + gapW / 2;
  if (gapA < xl) {
    gapB += xl - gapA;
    gapA = xl;
  }
  if (gapB > xr) {
    gapA -= gapB - xr;
    gapB = xr;
  }
  gapA = Math.max(xl, gapA);
  gapB = Math.min(xr, gapB);

  const onBottom = cfg.textPlacement === "bottom";
  const edgeY = onBottom ? yb : yt;
  const ty = edgeY + cfg.textOffsetYPx;

  const borderLines = onBottom ? (
    <g fill="none" stroke={c} strokeWidth={s} strokeLinecap="butt" strokeLinejoin="miter">
      <line x1={xl} y1={yt} x2={xr} y2={yt} />
      <line x1={xl} y1={yt} x2={xl} y2={yb} />
      <line x1={xr} y1={yt} x2={xr} y2={yb} />
      <line x1={xl} y1={yb} x2={gapA} y2={yb} />
      <line x1={gapB} y1={yb} x2={xr} y2={yb} />
    </g>
  ) : (
    <g fill="none" stroke={c} strokeWidth={s} strokeLinecap="butt" strokeLinejoin="miter">
      <line x1={xl} y1={yb} x2={xr} y2={yb} />
      <line x1={xl} y1={yt} x2={xl} y2={yb} />
      <line x1={xr} y1={yt} x2={xr} y2={yb} />
      <line x1={xl} y1={yt} x2={gapA} y2={yt} />
      <line x1={gapB} y1={yt} x2={xr} y2={yt} />
    </g>
  );

  return (
    <g>
      {borderLines}
      <text
        x={tx}
        y={ty}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={c}
        fontSize={fs}
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight={600}
      >
        {text}
      </text>
    </g>
  );
}

function ZoomFitIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    </svg>
  );
}

const compactFieldClass =
  "w-full min-w-0 border border-palm/25 px-1.5 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100";

export function LabelTemplatePreview({
  widthMm,
  heightMm,
  widthMmInput,
  heightMmInput,
  onWidthMmChange,
  onHeightMmChange,
  sizeFieldsDisabled,
  canvasWidthPx,
  canvasHeightPx,
  marginPx,
  baseLayoutImageUrl,
  baseLayoutScalePercent,
  baseLayoutRotationDeg,
  baseLayoutOpacityPercent,
  baseLayoutOffsetXPx,
  baseLayoutOffsetYPx,
  baseLayoutDragEnabled = false,
  onBaseOffsetChange,
  borderConfig,
}: {
  widthMm: number;
  heightMm: number;
  widthMmInput: string;
  heightMmInput: string;
  onWidthMmChange: (v: string) => void;
  onHeightMmChange: (v: string) => void;
  sizeFieldsDisabled?: boolean;
  canvasWidthPx: number;
  canvasHeightPx: number;
  marginPx: number;
  baseLayoutImageUrl: string;
  baseLayoutScalePercent: number;
  baseLayoutRotationDeg: number;
  baseLayoutOpacityPercent: number;
  baseLayoutOffsetXPx: number;
  baseLayoutOffsetYPx: number;
  baseLayoutDragEnabled?: boolean;
  onBaseOffsetChange?: (x: number, y: number) => void;
  borderConfig: LabelBorderConfig;
}) {
  const cw = Math.max(1, canvasWidthPx);
  const ch = Math.max(1, canvasHeightPx);
  const { dw, dh } = displayLabelSize(widthMm, heightMm);
  const fitScale = useMemo(() => zoomToFitScale(dw, dh), [dw, dh]);
  const [zoomMul, setZoomMul] = useState(1);

  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; origOx: number; origOy: number } | null>(null);
  const [baseDragging, setBaseDragging] = useState(false);
  const [latchedCenterX, setLatchedCenterX] = useState(false);
  const [latchedCenterY, setLatchedCenterY] = useState(false);

  const canDragBase = baseLayoutDragEnabled && Boolean(baseLayoutImageUrl) && Boolean(onBaseOffsetChange);
  const centerThreshold = useMemo(() => centerGuideThresholdPx(cw, ch), [cw, ch]);

  const displayW = dw * fitScale * zoomMul;
  const displayH = dh * fitScale * zoomMul;

  const { inset: insetDesign } = editableRegionPx(cw, ch, marginPx);
  const cx = cw / 2;
  const cy = ch / 2;
  const scale = baseLayoutScalePercent / 100;
  const rot = baseLayoutRotationDeg;
  const op = Math.min(100, Math.max(0, baseLayoutOpacityPercent)) / 100;
  const ox = baseLayoutOffsetXPx;
  const oy = baseLayoutOffsetYPx;

  const clientToDesignDelta = useCallback(
    (dxPix: number, dyPix: number) => {
      const el = svgRef.current;
      if (!el) return { dx: 0, dy: 0 };
      const rect = el.getBoundingClientRect();
      const sx = cw / rect.width;
      const sy = ch / rect.height;
      return { dx: dxPix * sx, dy: dyPix * sy };
    },
    [cw, ch],
  );

  const endBaseDrag = useCallback(() => {
    dragRef.current = null;
    setBaseDragging(false);
    setLatchedCenterX(false);
    setLatchedCenterY(false);
  }, []);

  const onImagePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!canDragBase || !onBaseOffsetChange) return;
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
      setBaseDragging(true);
      setLatchedCenterX(false);
      setLatchedCenterY(false);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origOx: ox,
        origOy: oy,
      };
    },
    [canDragBase, onBaseOffsetChange, ox, oy],
  );

  const onImagePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d || !onBaseOffsetChange) return;
      const { dx, dy } = clientToDesignDelta(e.clientX - d.startX, e.clientY - d.startY);
      const nextX = Math.round(d.origOx + dx);
      const nextY = Math.round(d.origOy + dy);
      onBaseOffsetChange(nextX, nextY);
      if (Math.abs(nextX) <= centerThreshold) setLatchedCenterX(true);
      if (Math.abs(nextY) <= centerThreshold) setLatchedCenterY(true);
    },
    [centerThreshold, clientToDesignDelta, onBaseOffsetChange],
  );

  const onImagePointerUp = useCallback(
    (e: React.PointerEvent) => {
      try {
        (e.currentTarget as SVGElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      endBaseDrag();
    },
    [endBaseDrag],
  );

  const nearCenterX = Math.abs(ox) <= centerThreshold;
  const nearCenterY = Math.abs(oy) <= centerThreshold;
  const showCenterGuideX = baseDragging && (nearCenterX || latchedCenterX);
  const showCenterGuideY = baseDragging && (nearCenterY || latchedCenterY);
  const guideStroke = Math.max(1, cw / 280);

  return (
    <div className="rounded border-2 border-palm/25 bg-zinc-100/90 p-4 dark:border-zinc-600 dark:bg-zinc-900/50">
      <p className="text-xs font-black uppercase tracking-wide text-palm dark:text-emerald-300">Template preview</p>
      <p className="mt-1 text-[11px] text-ink/65 dark:text-zinc-400">
        Red dashed = editable area. Drag the base image when the Base layout image section is open.
      </p>

      <div className="mt-3 grid w-full grid-cols-2 gap-2">
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] font-bold uppercase text-ink/55 dark:text-zinc-500">Print width (mm)</span>
          <input
            type="number"
            min={1}
            className={compactFieldClass}
            value={widthMmInput}
            onChange={(e) => onWidthMmChange(e.target.value)}
            disabled={sizeFieldsDisabled}
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] font-bold uppercase text-ink/55 dark:text-zinc-500">Print height (mm)</span>
          <input
            type="number"
            min={1}
            className={compactFieldClass}
            value={heightMmInput}
            onChange={(e) => onHeightMmChange(e.target.value)}
            disabled={sizeFieldsDisabled}
          />
        </label>
      </div>

      <div
        className="mt-4 overflow-auto rounded border border-palm/15 bg-white dark:border-zinc-700 dark:bg-zinc-950"
        style={{ maxHeight: PREVIEW_VIEWPORT + 48, width: "100%" }}
      >
        <div className="flex min-h-[280px] items-center justify-center p-6">
          <svg
            ref={svgRef}
            width={displayW}
            height={displayH}
            viewBox={`0 0 ${cw} ${ch}`}
            className="block shrink-0 ring-1 ring-palm/25 dark:ring-zinc-600"
            aria-hidden
          >
            <rect x={0} y={0} width={cw} height={ch} fill="#fafafa" className="dark:fill-zinc-900" />

            {baseLayoutImageUrl ? (
              <g
                transform={`translate(${ox}, ${oy}) translate(${cx}, ${cy}) rotate(${rot}) scale(${scale}) translate(${-cx}, ${-cy})`}
                style={{ cursor: canDragBase ? "grab" : undefined }}
                onPointerDown={onImagePointerDown}
                onPointerMove={onImagePointerMove}
                onPointerUp={onImagePointerUp}
                onPointerCancel={onImagePointerUp}
              >
                <image
                  href={baseLayoutImageUrl}
                  x={0}
                  y={0}
                  width={cw}
                  height={ch}
                  preserveAspectRatio="xMidYMid meet"
                  opacity={op}
                  style={{ pointerEvents: canDragBase ? "auto" : "none" }}
                />
              </g>
            ) : null}

            {showCenterGuideX || showCenterGuideY ? (
              <g pointerEvents="none" aria-hidden>
                {showCenterGuideX ? (
                  <line
                    x1={cx}
                    y1={0}
                    x2={cx}
                    y2={ch}
                    stroke="#2563eb"
                    strokeWidth={guideStroke}
                    strokeDasharray={`${guideStroke * 5},${guideStroke * 3}`}
                    opacity={0.85}
                  />
                ) : null}
                {showCenterGuideY ? (
                  <line
                    x1={0}
                    y1={cy}
                    x2={cw}
                    y2={cy}
                    stroke="#2563eb"
                    strokeWidth={guideStroke}
                    strokeDasharray={`${guideStroke * 5},${guideStroke * 3}`}
                    opacity={0.85}
                  />
                ) : null}
              </g>
            ) : null}

            <rect
              x={insetDesign}
              y={insetDesign}
              width={cw - 2 * insetDesign}
              height={ch - 2 * insetDesign}
              fill="none"
              stroke="#dc2626"
              strokeWidth={Math.max(1.5, cw / 200)}
              strokeDasharray={`${Math.max(4, cw / 80)},${Math.max(3, cw / 120)}`}
              pointerEvents="none"
            />

            <BorderSvgLayer cw={cw} ch={ch} cfg={borderConfig} />
          </svg>
        </div>
      </div>

      <div className="mt-3 flex w-full items-center gap-2">
        <input
          type="range"
          min={20}
          max={400}
          step={5}
          value={Math.round(zoomMul * 100)}
          onChange={(e) => setZoomMul(Number(e.target.value) / 100)}
          className="min-w-0 flex-1 accent-palm"
          aria-label={`Preview zoom ${Math.round(zoomMul * 100)}%`}
        />
        <button
          type="button"
          title="Zoom to fit"
          aria-label="Zoom to fit"
          onClick={() => setZoomMul(1)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded border-2 border-palm bg-white text-palm hover:bg-surf dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          <ZoomFitIcon />
        </button>
      </div>
      <p className="mt-1 text-center text-[10px] font-medium text-ink/50 dark:text-zinc-500">
        Zoom {Math.round(zoomMul * 100)}%
      </p>
    </div>
  );
}