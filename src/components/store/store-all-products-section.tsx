"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useCallback, useMemo, type CSSProperties } from "react";
import { loadInBreedingProductPage } from "@/app/actions/in-breeding-products";
import { loadStoreProductPage } from "@/app/actions/store-products";
import type { StorefrontProductCard, StorefrontTypeFilterNav } from "@/lib/products-storefront";
import { StoreProductCard } from "@/components/store/store-product-card";
import { btnChip, btnChipActive, btnSecondaryMd } from "@/lib/btn-theme-classes";

function setSearchInUrl(pathname: string, nextQ: string, preserve: { type?: string | null; event?: string | null }) {
  if (typeof window === "undefined") return;
  const p = new URLSearchParams();
  if (preserve.event?.trim()) p.set("event", preserve.event.trim());
  if (preserve.type?.trim()) p.set("type", preserve.type.trim());
  if (nextQ.trim()) p.set("q", nextQ.trim());
  const qstr = p.toString();
  const url = qstr ? `${pathname}?${qstr}` : pathname;
  window.history.replaceState(null, "", url);
}

export function StoreAllProductsSection({
  baseProducts,
  totalCount,
  pageSize,
  initialQuery = "",
  typeFilterNav,
  activeSlug,
  eventId,
  eventMetaOk,
  totalCatalogSize,
  hover,
  productDiagonalBrandName = null,
  productDiagonalNameGapPx = 8,
  watermarkOpacityPercent = 38,
  catalogCardWidthPx = 176,
  catalogPath = "/store",
  catalogVariant = "store",
}: {
  baseProducts: StorefrontProductCard[];
  totalCount: number;
  pageSize: number;
  initialQuery?: string | null;
  typeFilterNav: StorefrontTypeFilterNav;
  activeSlug: string | null;
  eventId: string | null;
  eventMetaOk: boolean;
  totalCatalogSize: number;
  hover: "zoom" | "glow";
  productDiagonalBrandName?: string | null;
  productDiagonalNameGapPx?: number;
  watermarkOpacityPercent?: number;
  /** Fixed width for catalog grid cards (from Settings → Store → Product cards). */
  catalogCardWidthPx?: number;
  catalogPath?: string;
  catalogVariant?: "store" | "inBreeding";
}) {
  const loadProducts = useMemo(
    () => (catalogVariant === "inBreeding" ? loadInBreedingProductPage : loadStoreProductPage),
    [catalogVariant],
  );
  const [query, setQuery] = useState(() => (initialQuery ?? "").trim());
  const [debouncedQ, setDebouncedQ] = useState(() => (initialQuery ?? "").trim());
  const pathname = catalogPath;
  const [rows, setRows] = useState<StorefrontProductCard[]>(baseProducts);
  const [total, setTotal] = useState(totalCount);
  const [hasMore, setHasMore] = useState(() => baseProducts.length < totalCount);
  const [listLoading, setListLoading] = useState(false);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);
  const skipFirstListFetch = useRef(true);

  // Reset when the server hands us a new first page (navigation / initial).
  useEffect(() => {
    setRows(baseProducts);
    setTotal(totalCount);
    setHasMore(baseProducts.length < totalCount);
    setQuery((initialQuery ?? "").trim());
    setDebouncedQ((initialQuery ?? "").trim());
    skipFirstListFetch.current = true;
  }, [baseProducts, totalCount, activeSlug, eventId, initialQuery]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(query), 200);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setSearchInUrl(pathname, debouncedQ, { type: activeSlug, event: eventId });
  }, [debouncedQ, activeSlug, eventId]);

  const refetchFirstPage = useCallback(async () => {
    setListLoading(true);
    try {
      const r = await loadProducts({
        skip: 0,
        typeSlug: activeSlug,
        eventId,
        q: debouncedQ || null,
        take: pageSize,
      });
      if (r.ok) {
        setRows(r.products);
        setTotal(r.total);
        setHasMore(r.hasMore);
      }
    } finally {
      setListLoading(false);
    }
  }, [activeSlug, eventId, debouncedQ, pageSize, loadProducts]);

  useEffect(() => {
    if (skipFirstListFetch.current) {
      const k = `${(initialQuery ?? "").trim()}|${activeSlug ?? ""}|${eventId ?? ""}`;
      const cur = `${debouncedQ}|${activeSlug ?? ""}|${eventId ?? ""}`;
      if (k === cur) {
        skipFirstListFetch.current = false;
        return;
      }
      skipFirstListFetch.current = false;
    }
    void refetchFirstPage();
  }, [debouncedQ, activeSlug, eventId, refetchFirstPage, initialQuery]);

  async function loadMore() {
    if (!hasMore || loadMoreLoading) return;
    setLoadMoreLoading(true);
    try {
      const r = await loadProducts({
        skip: rows.length,
        typeSlug: activeSlug,
        eventId,
        q: debouncedQ || null,
        take: pageSize,
      });
      if (r.ok) {
        const seen = new Set(rows.map((p) => p.id));
        const next = r.products.filter((p) => !seen.has(p.id));
        setRows((prev) => [...prev, ...next]);
        setHasMore(r.hasMore);
        setTotal(r.total);
      }
    } finally {
      setLoadMoreLoading(false);
    }
  }

  return (
    <>
      <form
        className="mt-4 flex max-w-xl flex-col gap-2 sm:flex-row sm:items-end"
        role="search"
        onSubmit={(e) => e.preventDefault()}
      >
        <label className="block flex-1 text-sm font-bold text-ink">
          Search products
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, description…"
            autoComplete="off"
            className="mt-1 w-full border-2 border-palm-mid px-3 py-2 text-sm"
          />
        </label>
        <div className="flex gap-2">
          {query.trim() ? (
            <button
              type="button"
              className={btnSecondaryMd}
              onClick={() => {
                setQuery("");
                setDebouncedQ("");
                setSearchInUrl(pathname, "", { type: activeSlug, event: eventId });
              }}
            >
              Clear
            </button>
          ) : null}
        </div>
      </form>

      {!eventId && (typeFilterNav.breadcrumb.length > 0 || typeFilterNav.chips.length > 0) ? (
        <div className="mt-4 space-y-2">
          {typeFilterNav.breadcrumb.length > 0 ? (
            <nav className="flex flex-wrap items-center gap-1 text-sm text-ink/80" aria-label="Type path">
              <Link href={catalogPath} className="font-medium text-lagoon-dark underline">
                All types
              </Link>
              {typeFilterNav.breadcrumb.map((crumb, i) => {
                const isLast = i === typeFilterNav.breadcrumb.length - 1;
                const href = `${catalogPath}?type=${encodeURIComponent(crumb.slug)}`;
                return (
                  <span key={crumb.slug} className="flex items-center gap-1">
                    <span aria-hidden className="text-ink/40">
                      ›
                    </span>
                    {isLast ? (
                      <span className="font-bold text-ink">{crumb.name}</span>
                    ) : (
                      <Link href={href} className="font-medium text-lagoon-dark underline">
                        {crumb.name}
                      </Link>
                    )}
                  </span>
                );
              })}
            </nav>
          ) : null}
          <nav className="flex flex-wrap gap-2" aria-label="Filter by product type">
            {!activeSlug ? (
              <FilterChip href={catalogPath} active label="All types" />
            ) : (
              <FilterChip
                href={
                  typeFilterNav.breadcrumb.length > 1
                    ? `${catalogPath}?type=${encodeURIComponent(typeFilterNav.breadcrumb[typeFilterNav.breadcrumb.length - 2]!.slug)}`
                    : catalogPath
                }
                active={false}
                label="← Up"
              />
            )}
            {typeFilterNav.chips.map((t) => (
              <FilterChip
                key={t.id}
                href={`${catalogPath}?type=${encodeURIComponent(t.slug)}`}
                active={activeSlug === t.slug}
                label={`${t.name} (${t.productCount})`}
              />
            ))}
          </nav>
        </div>
      ) : !eventId ? (
        <nav className="mt-4 flex flex-wrap gap-2" aria-label="Filter by product type">
          <FilterChip href={catalogPath} active={!activeSlug} label="All types" />
        </nav>
      ) : null}

      {listLoading && rows.length === 0 ? (
        <p className="mt-6 text-ink/70">Loading products…</p>
      ) : null}

      {rows.length === 0 && !listLoading ? (
        <p className="mt-4 max-w-2xl text-ink/80">
          {eventId && !eventMetaOk ? (
            <>
              That event was not found.{" "}
              <Link href="/store" className="font-medium text-lagoon-dark underline">
                Back to store
              </Link>
            </>
          ) : totalCatalogSize === 0 ? (
            catalogVariant === "inBreeding" ? (
              <>
                No products marked <strong>In breeding</strong> yet. Edit a product in{" "}
                <Link href="/settings/products" className="font-medium text-lagoon-dark underline">
                  Settings → Catalog
                </Link>{" "}
                and enable the flag.
              </>
            ) : (
              <>
                No products yet. Sign in to{" "}
                <Link href="/settings/products" className="font-medium text-lagoon-dark underline">
                  Settings → Products
                </Link>{" "}
                to add your first item.
              </>
            )
          ) : !eventId && activeSlug && total === 0 && totalCatalogSize > 0 ? (
            <>
              No products in this type.{" "}
              <Link href={catalogPath} className="font-medium text-lagoon-dark underline">
                Clear filter
              </Link>
            </>
          ) : eventId && eventMetaOk && total === 0 ? (
            <>No products are linked to this event yet.</>
          ) : query.trim() && totalCatalogSize > 0 ? (
            <>No products match &ldquo;{query.trim()}&rdquo;.</>
          ) : null}
        </p>
      ) : null}

      {rows.length > 0 ? (
        <ul
          className="store-catalog-grid mt-6 flex w-full flex-wrap justify-center gap-4"
          style={{ "--store-catalog-card-width": `${catalogCardWidthPx}px` } as CSSProperties}
        >
          {rows.map((p) => (
            <li key={p.id} className="store-catalog-grid__item flex shrink-0">
              <StoreProductCard
                product={p}
                hover={hover}
                catalogGrid
                eventId={eventId}
                showQuickAdd={catalogVariant !== "inBreeding"}
                showQuickWishlist={catalogVariant === "inBreeding"}
                productFrom={catalogVariant === "inBreeding" ? "in-breeding" : "store"}
                productDiagonalBrandName={productDiagonalBrandName}
                productDiagonalNameGapPx={productDiagonalNameGapPx}
                watermarkOpacityPercent={watermarkOpacityPercent}
              />
            </li>
          ))}
        </ul>
      ) : null}

      {listLoading && rows.length > 0 ? (
        <p className="mt-3 text-sm text-ink/60" role="status">
          Updating results…
        </p>
      ) : null}

      {rows.length > 0 && hasMore ? (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            disabled={loadMoreLoading || listLoading}
            onClick={() => void loadMore()}
            className="border-2 border-palm bg-surf px-6 py-2 text-sm font-bold text-palm hover:bg-white disabled:opacity-50"
          >
            {loadMoreLoading ? "Loading…" : "Load more"}
          </button>
        </div>
      ) : null}
    </>
  );
}

function FilterChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={active ? btnChipActive : btnChip}
    >
      {label}
    </Link>
  );
}
