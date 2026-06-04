"use client";

import { useEffect, useState } from "react";
import { searchProductsForRecommendationPicker } from "@/app/actions/product-recommendations-mutations";
import {
  adminFieldsetClass,
  adminListTileClass,
  adminPickerHitClass,
  adminPickerListClass,
} from "@/lib/admin-surface-classes";
import { MAX_PRODUCT_RECOMMENDATIONS_PER_SECTION } from "@/lib/product-recommendations-shared";

export type PickedRecommendationProduct = { id: string; name: string; slug: string };

type SearchHit = { id: string; name: string; slug: string };

export function RecommendationListEditor({
  title,
  description,
  excludeProductId,
  items,
  onChange,
  disabled,
  readOnly = false,
}: {
  title: string;
  description: string;
  /** Omit from search results (product being edited, or none for type defaults). */
  excludeProductId?: string | null;
  items: PickedRecommendationProduct[];
  onChange?: (next: PickedRecommendationProduct[]) => void;
  disabled?: boolean;
  readOnly?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const locked = readOnly || disabled;

  useEffect(() => {
    if (readOnly) return;
    const q = query.trim();
    if (q.length < 1) {
      setHits([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = window.setTimeout(() => {
      void searchProductsForRecommendationPicker(q, excludeProductId ?? null).then((r) => {
        if (cancelled) return;
        setSearching(false);
        if (Array.isArray(r)) setHits(r);
        else setHits([]);
      });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query, excludeProductId, readOnly]);

  function add(hit: SearchHit) {
    if (!onChange) return;
    if (items.some((i) => i.id === hit.id)) return;
    if (items.length >= MAX_PRODUCT_RECOMMENDATIONS_PER_SECTION) return;
    onChange([...items, hit]);
    setQuery("");
    setHits([]);
  }

  function remove(id: string) {
    onChange?.(items.filter((i) => i.id !== id));
  }

  const pickedIds = new Set(items.map((i) => i.id));

  return (
    <fieldset className={adminFieldsetClass}>
      <legend className="px-1 text-sm font-bold text-ink dark:text-zinc-100">{title}</legend>
      <p className="mb-3 text-xs text-ink/65 dark:text-zinc-400">{description}</p>

      {items.length > 0 ? (
        <ol className="mb-3 space-y-1">
          {items.map((item, idx) => (
            <li
              key={item.id}
              className={`flex flex-wrap items-center justify-between gap-2 px-2 py-1.5 ${adminListTileClass}`}
            >
              <span>
                <span className="font-bold text-ink/50 dark:text-zinc-500">{idx + 1}.</span> {item.name}
                <span className="ml-2 font-mono text-xs text-ink/50 dark:text-zinc-500">/product/{item.slug}</span>
              </span>
              {!readOnly ? (
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => remove(item.id)}
                  className="text-xs font-bold text-coral underline"
                >
                  Remove
                </button>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="mb-3 text-xs text-ink/55 dark:text-zinc-500">None selected.</p>
      )}

      {!readOnly ? (
        <>
          <label className="block text-xs font-bold text-ink dark:text-zinc-200">
            Add product
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={locked || items.length >= MAX_PRODUCT_RECOMMENDATIONS_PER_SECTION}
              placeholder="Search name or slug…"
              className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </label>
          {searching ? <p className="mt-1 text-xs text-ink/55 dark:text-zinc-500">Searching…</p> : null}
          {hits.length > 0 ? (
            <ul className={`mt-2 max-h-40 ${adminPickerListClass}`}>
              {hits
                .filter((h) => !pickedIds.has(h.id))
                .map((h) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => add(h)}
                      className={adminPickerHitClass}
                    >
                      {h.name}
                      <span className="ml-2 font-mono text-xs text-ink/50 dark:text-zinc-500">{h.slug}</span>
                    </button>
                  </li>
                ))}
            </ul>
          ) : null}
          {items.length >= MAX_PRODUCT_RECOMMENDATIONS_PER_SECTION ? (
            <p className="mt-2 text-xs text-ink/55 dark:text-zinc-500">
              Maximum {MAX_PRODUCT_RECOMMENDATIONS_PER_SECTION} items.
            </p>
          ) : null}
        </>
      ) : null}
    </fieldset>
  );
}
