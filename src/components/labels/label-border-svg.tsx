import {
  estimateBorderTextWidthPx,
  type LabelBorderConfig,
} from "@/lib/label-template-border";

export function LabelBorderSvg({
  canvasWidthPx,
  canvasHeightPx,
  config,
  className = "",
}: {
  canvasWidthPx: number;
  canvasHeightPx: number;
  config: LabelBorderConfig;
  className?: string;
}) {
  const cw = canvasWidthPx;
  const ch = canvasHeightPx;
  const cfg = config;
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

  return (
    <svg
      className={`pointer-events-none absolute inset-0 z-[3] ${className}`}
      width={cw}
      height={ch}
      viewBox={`0 0 ${cw} ${ch}`}
      aria-hidden
    >
      {cfg.mode === "solid" ? (
        <rect
          x={xl}
          y={yt}
          width={iw - s}
          height={ch - 2 * bi - s}
          fill="none"
          stroke={c}
          strokeWidth={s}
        />
      ) : (
        <BorderWithText cw={cw} ch={ch} cfg={cfg} xl={xl} xr={xr} yt={yt} yb={yb} xc={xc} s={s} c={c} iw={iw} />
      )}
    </svg>
  );
}

function BorderWithText({
  cfg,
  xl,
  xr,
  yt,
  yb,
  xc,
  s,
  c,
  iw,
}: {
  cw: number;
  ch: number;
  cfg: LabelBorderConfig;
  xl: number;
  xr: number;
  yt: number;
  yb: number;
  xc: number;
  s: number;
  c: string;
  iw: number;
}) {
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
        fill={cfg.textColor?.trim() || c}
        fontSize={fs}
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight={600}
      >
        {text}
      </text>
    </g>
  );
}
