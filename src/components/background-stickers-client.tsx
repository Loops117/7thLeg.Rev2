"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import {
  getStoreNameContinuousTile,
  getStoreNameScatteredTile,
} from "@/lib/store-name-watermark";
import type { BgSandOverlayMode, DecorTileForClient } from "@/lib/theme-config";

type Sticker = {
  id: string;
  kind: "image" | "placeholder";
  url: string;
  leftPct: number;
  topPct: number;
  rotDeg: number;
  sizePx: number;
  removeAfterMs: number;
  createdAt: number;
  alwaysOnTop: boolean;
};

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

/** Left and right “gutters” only — keep ~35–65% clear so tiles sit outside the main content column. */
function pickGutterX() {
  if (Math.random() < 0.5) {
    return randomBetween(2, 32);
  }
  return randomBetween(68, 98);
}

function nextId() {
  return `bg-st-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const STICKER_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8h — on-screen count is the real limit, not a short timer

function pickWeightedTile(pool: DecorTileForClient[]): DecorTileForClient | null {
  if (pool.length === 0) return null;
  const total = pool.reduce((s, e) => s + Math.max(1, e.weight), 0);
  let r = Math.random() * total;
  for (const e of pool) {
    r -= Math.max(1, e.weight);
    if (r <= 0) return e;
  }
  return pool[pool.length - 1] ?? null;
}

function normalizeTilePool(
  entries: DecorTileForClient[] | undefined,
  legacyUrls: string[] | undefined,
): DecorTileForClient[] {
  const fromEntries = Array.isArray(entries)
    ? entries.filter(
        (e) =>
          e &&
          typeof e.url === "string" &&
          (e.url.startsWith("/") || e.url.startsWith("https://")),
      )
    : [];
  if (fromEntries.length > 0) return fromEntries;
  return normalizePool(legacyUrls).map((url) => ({
    url,
    weight: 50,
    alwaysOnTop: false,
  }));
}

function buildSticker(
  pool: DecorTileForClient[],
  minP: number,
  maxP: number,
  _spawnIntervalMs: number,
  now: number,
  rotMin: number,
  rotMax: number,
): Sticker {
  const widthBase = 4 * 16;
  const p = minP + Math.random() * (maxP - minP);
  const sizePx = widthBase * (p / 100);
  const pick = pickWeightedTile(pool);
  const hasImage = pick != null;
  const kind: "image" | "placeholder" = hasImage ? "image" : "placeholder";
  const url = hasImage ? pick!.url : "";
  const alwaysOnTop = hasImage && !!pick?.alwaysOnTop;
  // Long-lived so the pool can grow toward max slots; when full, pushSticker() evicts oldest (FIFO).
  const lifeMs = STICKER_MAX_AGE_MS - randomBetween(0, 3 * 60 * 1000);
  return {
    id: nextId(),
    kind,
    url,
    leftPct: pickGutterX(),
    topPct: randomBetween(3, 92),
    rotDeg: randomBetween(rotMin, rotMax),
    sizePx,
    createdAt: now,
    removeAfterMs: lifeMs,
    alwaysOnTop,
  };
}

export type BackgroundThemeForClient = {
  enabled: boolean;
  maxSlots: number;
  /** 0–100: top anti-theft layer opacity (solid, diagonal, etc. — see `bgSandOverlayMode`). */
  overlayOpacityPercent: number;
  /** Top layer: flat sand, diagonal line texture, or repeating store name. */
  bgSandOverlayMode: BgSandOverlayMode;
  /** Shown for `store_name` / `store_name_continuous` (from site Global → company name). */
  storeWatermarkName: string;
  storeWatermarkFontPx: number;
  storeWatermarkNameGapPx: number;
  /** 0–100: CSS opacity of sticker images only (layer below the anti-theft overlay). */
  imageOpacityPercent: number;
  spawnIntervalMs: number;
  tileScaleMin: number;
  tileScaleMax: number;
  /** Inclusive min/max random rotation in degrees. */
  stickerRotMinDeg: number;
  stickerRotMaxDeg: number;
  /** @deprecated use decorTileEntries */
  decorTileUrls: string[];
  decorTileEntries: DecorTileForClient[];
};

function normalizePool(urls: string[] | undefined) {
  if (!Array.isArray(urls)) return [];
  return urls.filter(
    (u) => typeof u === "string" && (u.startsWith("/") || u.startsWith("https://")),
  );
}

/** Coerce 0–100 overlay/sticker opacities; invalid values break CSS `opacity` (e.g. NaN) and hide the whole layer. */
function percentToUnitAlpha(percent: unknown, fallback: number): number {
  const n = typeof percent === "number" ? percent : Number(percent);
  if (!Number.isFinite(n)) return fallback / 100;
  return Math.min(100, Math.max(0, n)) / 100;
}

/**
 * Renders the gradient stack + a runtime sticker list that:
 * - Starts empty on every full document load (hard refresh) — in-memory only.
 * - Adds/removes “stickers” on an interval while the tab is open; survives soft client navigations
 *   (layout keeps this client tree mounted) but resets on F5/actual reload.
 */
export function BackgroundStack({
  theme,
  children,
}: {
  theme: BackgroundThemeForClient;
  children: React.ReactNode;
}) {
  return (
    <>
      <BackgroundFieldRuntime theme={theme} />
      {children}
    </>
  );
}

function isStorefrontPath(pathname: string | null): boolean {
  if (!pathname) return true;
  if (pathname.startsWith("/settings")) return false;
  return true;
}

function BackgroundFieldRuntime({ theme }: { theme: BackgroundThemeForClient }) {
  const pathname = usePathname();
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const poolRef = useRef<DecorTileForClient[]>([]);
  poolRef.current = normalizeTilePool(theme.decorTileEntries, theme.decorTileUrls);

  useEffect(() => {
    poolRef.current = normalizeTilePool(theme.decorTileEntries, theme.decorTileUrls);
  }, [theme.decorTileEntries, theme.decorTileUrls]);

  const maxShow = useMemo(
    () => Math.min(300, Math.max(1, Math.floor(Number(theme.maxSlots) || 10))),
    [theme.maxSlots],
  );
  const minP = useMemo(
    () => Math.min(1000, Math.max(5, Math.min(theme.tileScaleMin, theme.tileScaleMax))),
    [theme.tileScaleMax, theme.tileScaleMin],
  );
  const maxP = useMemo(
    () => Math.min(1000, Math.max(5, Math.max(theme.tileScaleMin, theme.tileScaleMax))),
    [theme.tileScaleMax, theme.tileScaleMin],
  );
  const rotMin = useMemo(() => {
    const a = Math.min(360, Math.max(-360, Number(theme.stickerRotMinDeg) || -45));
    const b = Math.min(360, Math.max(-360, Number(theme.stickerRotMaxDeg) || 45));
    return Math.min(a, b);
  }, [theme.stickerRotMaxDeg, theme.stickerRotMinDeg]);
  const rotMax = useMemo(() => {
    const a = Math.min(360, Math.max(-360, Number(theme.stickerRotMinDeg) || -45));
    const b = Math.min(360, Math.max(-360, Number(theme.stickerRotMaxDeg) || 45));
    return Math.max(a, b);
  }, [theme.stickerRotMaxDeg, theme.stickerRotMinDeg]);
  const spawnIntervalMs = Math.max(500, Math.min(20000, theme.spawnIntervalMs || 2000));

  const pushSticker = useCallback(() => {
    setStickers((prev) => {
      const now = performance.now();
      const pool = poolRef.current;
      const fresh = prev.filter((s) => now - s.createdAt < s.removeAfterMs);
      if (fresh.length < maxShow) {
        return [...fresh, buildSticker(pool, minP, maxP, spawnIntervalMs, now, rotMin, rotMax)];
      }
      const sorted = [...fresh].sort((a, b) => a.createdAt - b.createdAt);
      const rest = sorted.slice(1);
      return [...rest, buildSticker(pool, minP, maxP, spawnIntervalMs, now, rotMin, rotMax)];
    });
  }, [maxP, minP, maxShow, rotMax, rotMin, spawnIntervalMs]);

  const prune = useCallback(() => {
    const now = performance.now();
    setStickers((prev) => prev.filter((s) => now - s.createdAt < s.removeAfterMs - 0.2));
  }, []);

  useEffect(() => {
    if (!theme.enabled) {
      return;
    }
    // After a full page load, `stickers` starts as [] — no explicit reset here so soft navigations
    // and interval dependency churn do not clear the list mid-session.
    const t0 = window.setTimeout(() => {
      if (document.visibilityState === "visible") {
        pushSticker();
      }
    }, 400);
    const sp = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        pushSticker();
      }
    }, spawnIntervalMs);
    const pr = window.setInterval(prune, 200);
    return () => {
      clearTimeout(t0);
      clearInterval(sp);
      clearInterval(pr);
    };
  }, [prune, pushSticker, spawnIntervalMs, theme.enabled]);

  useEffect(() => {
    if (!theme.enabled) {
      setStickers([]);
    }
  }, [theme.enabled]);

  const imageAlpha = percentToUnitAlpha(theme.imageOpacityPercent, 85);
  const showAntiTheft = theme.enabled && isStorefrontPath(pathname);

  return (
    <AntiTheftInStack
      theme={theme}
      showAntiTheft={showAntiTheft}
      showBackground={theme.enabled}
      imageAlpha={imageAlpha}
      stickers={stickers}
    />
  );
}

/**
 * Sand/diag/watermark sit above stickers, below the main site shell (z-10) — not on /settings. Full-viewport
 * `fixed` stack so the overlay isn’t a “strip” from a bad containing block.
 */
function AntiTheftInStack({
  theme,
  showAntiTheft,
  showBackground,
  imageAlpha,
  stickers,
}: {
  theme: BackgroundThemeForClient;
  showAntiTheft: boolean;
  showBackground: boolean;
  imageAlpha: number;
  stickers: Sticker[];
}) {
  const overlayAlpha = percentToUnitAlpha(theme.overlayOpacityPercent, 88);
  const textWatermarkTile = useMemo(() => {
    if (!showAntiTheft) return null;
    if (theme.bgSandOverlayMode === "store_name_continuous") {
      return getStoreNameContinuousTile(
        theme.storeWatermarkName,
        theme.storeWatermarkFontPx,
        theme.storeWatermarkNameGapPx,
      );
    }
    if (theme.bgSandOverlayMode === "store_name") {
      return getStoreNameScatteredTile(
        theme.storeWatermarkName,
        theme.storeWatermarkFontPx,
        theme.storeWatermarkNameGapPx,
      );
    }
    return null;
  }, [
    showAntiTheft,
    theme.bgSandOverlayMode,
    theme.storeWatermarkName,
    theme.storeWatermarkFontPx,
    theme.storeWatermarkNameGapPx,
  ]);
  const isTextWatermark =
    theme.bgSandOverlayMode === "store_name" ||
    theme.bgSandOverlayMode === "store_name_continuous";
  const diagonalLayerStyle: CSSProperties = {
    opacity: overlayAlpha,
    backgroundImage: `repeating-linear-gradient(135deg,
      rgba(250, 246, 239, 0.88) 0,
      rgba(250, 246, 239, 0.88) 14px,
      rgba(42, 157, 143, 0.14) 14px,
      rgba(42, 157, 143, 0.14) 28px)`,
  };

  if (!showBackground) {
    return <div className="pointer-events-none fixed inset-0 z-0 bg-site-bg" aria-hidden />;
  }

  return (
    <div
      className="pointer-events-none fixed start-0 end-0 top-0 z-0 h-[100dvh] min-h-dvh w-full max-w-none overflow-hidden"
      aria-hidden
    >
      <div className="absolute inset-0 z-0 min-h-full w-full bg-site-bg" />
      <div className="absolute inset-0 z-[1] min-h-full w-full">
        {stickers.map((s) => (
          <FloatingSticker key={s.id} sticker={s} targetOpacity={imageAlpha} />
        ))}
      </div>
      {showAntiTheft ? (
        <div className="absolute inset-0 z-[2] min-h-full w-full">
          {theme.bgSandOverlayMode === "solid" ? (
            <div
              className="absolute inset-0 min-h-full w-full bg-site-bg"
              style={{ opacity: overlayAlpha }}
              aria-hidden
            />
          ) : isTextWatermark && textWatermarkTile ? (
            <div
              className="absolute inset-0 min-h-full w-full"
              style={{
                opacity: overlayAlpha,
                backgroundImage: `url("${textWatermarkTile.dataUrl}")`,
                backgroundSize: `${textWatermarkTile.width}px ${textWatermarkTile.height}px`,
                backgroundRepeat: "repeat",
                backgroundPosition: "0 0",
              }}
              aria-hidden
            />
          ) : isTextWatermark ? null : (
            <div className="absolute inset-0 min-h-full w-full" style={diagonalLayerStyle} aria-hidden />
          )}
        </div>
      ) : null}
    </div>
  );
}

function FloatingSticker({ sticker: s, targetOpacity }: { sticker: Sticker; targetOpacity: number }) {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    const r = requestAnimationFrame(() => {
      setOpacity(targetOpacity);
    });
    return () => cancelAnimationFrame(r);
  }, [s.id, targetOpacity]);

  const baseStyle: CSSProperties = {
    left: `${s.leftPct}%`,
    top: `${s.topPct}%`,
    transform: `translate(-50%, -50%) rotate(${s.rotDeg}deg)`,
    opacity,
    transition: "opacity 0.5s ease-out",
    boxShadow: "none",
    zIndex: s.alwaysOnTop ? 2 : 1,
  };

  if (s.kind === "placeholder" || !s.url) {
    const ph = Math.min(48, s.sizePx);
    return (
      <div
        className="absolute border-0 bg-site-bg/25"
        style={{ ...baseStyle, width: ph, height: ph }}
        aria-hidden
      />
    );
  }

  // Use max W/H + auto box size so true PNG/gif transparency is not matted in a fixed square
  const style: CSSProperties = {
    ...baseStyle,
    maxWidth: s.sizePx,
    maxHeight: s.sizePx,
    width: "auto",
    height: "auto",
    objectFit: "contain",
    backgroundColor: "transparent",
  };

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={s.url}
      alt=""
      className="absolute border-0 object-contain bg-transparent outline-none"
      style={style}
    />
  );
}
