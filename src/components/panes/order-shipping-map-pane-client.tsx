"use client";

import { geoNaturalEarth1, geoPath } from "d3-geo";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { btnSecondarySm } from "@/lib/btn-theme-classes";
import type { ShippingMapRegionPayload, ShippingMapStatsPayload } from "@/lib/order-shipping-map-stats";

type GeoJsonFeature = {
  type: "Feature";
  properties: { iso_3166_2?: string; name?: string };
  geometry: object | null;
};

type GeoJsonFc = { type: "FeatureCollection"; features: GeoJsonFeature[] };

const ZOOM_MIN = 0.55;
const ZOOM_MAX = 4.5;
const ZOOM_STEP = 1.18;

function regionStats(stats: ShippingMapStatsPayload, iso: string) {
  return stats.regions[iso.toUpperCase()];
}

function svgZoomGroupTransform(zoom: number, w: number, h: number): string {
  return `translate(${w / 2}, ${h / 2}) scale(${zoom}) translate(${-w / 2}, ${-h / 2})`;
}

function heatFill(orderCount: number, maxOrders: number): string {
  if (orderCount <= 0) return "#ffffff";
  if (maxOrders <= 0) return "hsl(120, 60%, 48%)";
  const t = Math.min(1, orderCount / maxOrders);
  const hue = 120 * (1 - t);
  return `hsl(${hue}, 68%, 46%)`;
}

export function OrderShippingMapPaneClient({
  stats,
  geoUrl,
}: {
  stats: ShippingMapStatsPayload;
  geoUrl: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [geo, setGeo] = useState<GeoJsonFc | null>(null);
  const [size, setSize] = useState({ w: 640, h: 380 });
  const [hover, setHover] = useState<{
    screenX: number;
    screenY: number;
    areaName: string;
    iso: string;
    payload: ShippingMapRegionPayload;
  } | null>(null);
  const [zoom, setZoom] = useState(1);
  const clipPathId = useId().replace(/:/g, "");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(geoUrl);
        const j = (await r.json()) as GeoJsonFc;
        if (!cancelled && j?.type === "FeatureCollection" && Array.isArray(j.features)) setGeo(j);
      } catch {
        if (!cancelled) setGeo(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [geoUrl]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const w = Math.max(280, Math.floor(r.width));
      const h = Math.min(560, Math.max(280, Math.floor(w * 0.58)));
      setSize({ w, h });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const paths = useMemo(() => {
    if (!geo) return [] as { d: string; iso: string; fill: string; name: string }[];
    const pad = 8;
    const projection = geoNaturalEarth1().fitExtent(
      [
        [pad, pad],
        [size.w - pad, size.h - pad],
      ],
      geo as never,
    );

    /** `fitExtent` uses the geographic bounding box, which includes a lot of Atlantic / Arctic empty space, so land sits left. Re-center using the mean planar centroid of each US/CA/MX admin region (equal weight per province/state). */
    const pathProbe = geoPath(projection);
    let sumX = 0;
    let sumY = 0;
    let n = 0;
    for (const f of geo.features) {
      const iso = (f.properties?.iso_3166_2 ?? "").trim();
      if (!iso || f.geometry == null) continue;
      if (!/^(US|CA|MX)-/i.test(iso)) continue;
      const c = pathProbe.centroid(f as never);
      if (Number.isFinite(c[0]) && Number.isFinite(c[1])) {
        sumX += c[0];
        sumY += c[1];
        n += 1;
      }
    }
    if (n > 0) {
      const [tx, ty] = projection.translate();
      projection.translate([tx + size.w / 2 - sumX / n, ty + size.h / 2 - sumY / n]);
    }

    const path = geoPath(projection);
    return geo.features
      .map((f) => {
        const iso = (f.properties?.iso_3166_2 ?? "").trim().toUpperCase();
        if (!iso) return null;
        const d = path(f as never);
        if (!d) return null;
        const st = regionStats(stats, iso);
        const oc = st?.orderCount ?? 0;
        return {
          d,
          iso,
          fill: heatFill(oc, stats.maxOrders),
          name: (f.properties?.name ?? iso).trim() || iso,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);
  }, [geo, size, stats]);

  const clampZoom = useCallback((z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z)), []);

  const onWheelSvg = useCallback(
    (e: React.WheelEvent<SVGSVGElement>) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const next = clampZoom(zoom * (e.deltaY > 0 ? 1 / ZOOM_STEP : ZOOM_STEP));
      setZoom(next);
    },
    [clampZoom, zoom],
  );

  const onMove = useCallback(
    (e: React.MouseEvent) => {
      if (!hover) return;
      setHover((h) => (h ? { ...h, screenX: e.clientX, screenY: e.clientY } : null));
    },
    [hover],
  );

  const tipLeft =
    typeof window !== "undefined" && hover
      ? Math.min(hover.screenX + 12, window.innerWidth - 220)
      : hover
        ? hover.screenX + 12
        : 0;

  return (
    <div ref={wrapRef} className="relative w-full" onMouseMove={onMove}>
      <p className="mb-2 text-center text-xs text-ink/70">
        Shipped orders by customer shipping address. White = none; green → red = fewer → more orders in that
        province/state.
      </p>
      {!geo ? (
        <p className="py-12 text-center text-sm text-ink/65">Loading map…</p>
      ) : (
        <div className="mx-auto w-full max-w-full">
          <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-bold text-ink/80">Zoom</span>
            <button
              type="button"
              className={btnSecondarySm}
              aria-label="Zoom out"
              disabled={zoom <= ZOOM_MIN + 0.001}
              onClick={() => setZoom((z) => clampZoom(z / ZOOM_STEP))}
            >
              −
            </button>
            <span className="min-w-[3rem] text-center text-xs font-bold tabular-nums text-ink/75 dark:text-zinc-400">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              className={btnSecondarySm}
              aria-label="Zoom in"
              disabled={zoom >= ZOOM_MAX - 0.001}
              onClick={() => setZoom((z) => clampZoom(z * ZOOM_STEP))}
            >
              +
            </button>
            <button
              type="button"
              className={btnSecondarySm}
              aria-label="Reset zoom"
              disabled={zoom === 1}
              onClick={() => setZoom(1)}
            >
              Reset
            </button>
            <span className="text-[11px] text-ink/60 dark:text-zinc-500">
              Ctrl+scroll (⌘+scroll) on the map
            </span>
          </div>
          <svg
            role="img"
            aria-label="North America order heat map"
            width={size.w}
            height={size.h}
            className="mx-auto block max-w-full touch-manipulation"
            style={{ height: "auto" }}
            viewBox={`0 0 ${size.w} ${size.h}`}
            onWheel={onWheelSvg}
          >
            <defs>
              <clipPath id={clipPathId}>
                <rect width={size.w} height={size.h} />
              </clipPath>
            </defs>
            <g clipPath={`url(#${clipPathId})`}>
              <g transform={svgZoomGroupTransform(zoom, size.w, size.h)}>
                <rect width={size.w} height={size.h} fill="#e8f4fc" />
                {paths.map((p) => (
                  <path
                    key={p.iso}
                    d={p.d}
                    fill={p.fill}
                    stroke="#2c3e50"
                    strokeWidth={0.35}
                    vectorEffect="non-scaling-stroke"
                    className="cursor-pointer transition-[filter] hover:brightness-95"
                    onMouseEnter={(e) => {
                      const payload = regionStats(stats, p.iso) ?? {
                        orderCount: 0,
                        cities: [],
                        moreCities: 0,
                      };
                      setHover({
                        screenX: e.clientX,
                        screenY: e.clientY,
                        areaName: p.name,
                        iso: p.iso,
                        payload,
                      });
                    }}
                    onMouseLeave={() => setHover(null)}
                  />
                ))}
              </g>
            </g>
          </svg>
        </div>
      )}

      {hover ? (
        <div
          className="pointer-events-none fixed z-[80] max-w-[min(18rem,calc(100vw-2rem))] rounded border-2 border-palm bg-white/98 px-3 py-2 text-xs text-ink shadow-lg dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          style={{
            left: tipLeft,
            top: hover.screenY + 12,
          }}
        >
          <p className="font-black text-palm dark:text-zinc-100">{hover.areaName}</p>
          <p className="mt-1 font-bold text-ink/85 dark:text-zinc-300">
            Total orders: <span className="tabular-nums">{hover.payload.orderCount}</span>
          </p>
          {hover.payload.orderCount > 0 && hover.payload.cities.length > 0 ? (
            <ul className="mt-2 space-y-0.5 border-t border-palm/15 pt-2 dark:border-zinc-600">
              {hover.payload.cities.map((c) => (
                <li key={c.name} className="flex justify-between gap-2 text-[11px] text-ink/90 dark:text-zinc-300">
                  <span className="min-w-0 truncate">{c.name}</span>
                  <span className="shrink-0 tabular-nums font-semibold">{c.count}</span>
                </li>
              ))}
              {hover.payload.moreCities > 0 ? (
                <li className="pt-1 text-[11px] font-bold text-palm-mid dark:text-zinc-400">
                  +{hover.payload.moreCities} more
                </li>
              ) : null}
            </ul>
          ) : hover.payload.orderCount === 0 ? (
            <p className="mt-1 text-[11px] text-ink/65 dark:text-zinc-500">No orders to this area yet.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
