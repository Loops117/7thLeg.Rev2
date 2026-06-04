"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  saveProductRecommendations,
  searchProductsForRecommendationPicker,
} from "@/app/actions/product-recommendations-mutations";
import { ProductEditorSection } from "@/components/settings/product-editor-section";
import {
  adminFieldsetClass,
  adminListTileClass,
  adminPickerHitClass,
  adminPickerListClass,
} from "@/lib/admin-surface-classes";
import { btnSecondaryMd } from "@/lib/btn-theme-classes";
import { MAX_PRODUCT_RECOMMENDATIONS_PER_SECTION } from "@/lib/product-recommendations-shared";

type PickedProduct = { id: string; name: string; slug: string };

type SearchHit = { id: string; name: string; slug: string };

function RecommendationListEditor({
  title,
  description,
  productId,
  items,
  onChange,
  disabled,
}: {
  title: string;
  description: string;
  productId: string;
  items: PickedProduct[];
  onChange: (next: PickedProduct[]) => void;
  disabled: boolean;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setHits([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = window.setTimeout(() => {
      void searchProductsForRecommendationPicker(q, productId).then((r) => {
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
  }, [query, productId]);

  function add(hit: SearchHit) {
    if (items.some((i) => i.id === hit.id)) return;
    if (items.length >= MAX_PRODUCT_RECOMMENDATIONS_PER_SECTION) return;
    onChange([...items, hit]);
    setQuery("");
    setHits([]);
  }

  function remove(id: string) {
    onChange(items.filter((i) => i.id !== id));
  }

  const pickedIds = new Set(items.map((i) => i.id));

  return (
    <fieldset className={adminFieldsetClass}>
      <legend className="px-1 text-sm font-bold text-ink dark:text-zinc-100">{title}</legend>
      <p className="mb-3 text-xs text-ink/65">{description}</p>

      {items.length > 0 ? (
        <ol className="mb-3 space-y-1">
          {items.map((item, idx) => (
            <li
              key={item.id}
              className={`flex flex-wrap items-center justify-between gap-2 px-2 py-1.5 ${adminListTileClass}`}
            >
              <span>
                <span className="font-bold text-ink/50">{idx + 1}.</span> {item.name}
                <span className="ml-2 font-mono text-xs text-ink/50">/product/{item.slug}</span>
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => remove(item.id)}
                className="text-xs font-bold text-coral underline"
              >
                Remove
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mb-3 text-xs text-ink/55">None selected.</p>
      )}

      <label className="block text-xs font-bold text-ink">
        Add product
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={disabled || items.length >= MAX_PRODUCT_RECOMMENDATIONS_PER_SECTION}
          placeholder="Search name or slug…"
          className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm"
        />
      </label>
      {searching ? <p className="mt-1 text-xs text-ink/55">Searching…</p> : null}
      {hits.length > 0 ? (
        <ul className={`mt-2 max-h-40 ${adminPickerListClass}`}>
          {hits
            .filter((h) => !pickedIds.has(h.id))
            .map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => add(h)}
                  className={adminPickerHitClass}
                >
                  {h.name}
                  <span className="ml-2 font-mono text-xs text-ink/50">{h.slug}</span>
                </button>
              </li>
            ))}
        </ul>
      ) : null}
      {items.length >= MAX_PRODUCT_RECOMMENDATIONS_PER_SECTION ? (
        <p className="mt-2 text-xs text-ink/55">Maximum {MAX_PRODUCT_RECOMMENDATIONS_PER_SECTION} items.</p>
      ) : null}
    </fieldset>
  );
}

export function ProductRecommendationsEditor({
  productId,
  initialRelated,
  initialYouMayAlsoWant,
}: {
  productId: string;
  initialRelated: PickedProduct[];
  initialYouMayAlsoWant: PickedProduct[];
}) {
  const [related, setRelated] = useState(initialRelated);
  const [youMayAlsoWant, setYouMayAlsoWant] = useState(initialYouMayAlsoWant);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setRelated(initialRelated);
    setYouMayAlsoWant(initialYouMayAlsoWant);
  }, [productId, initialRelated, initialYouMayAlsoWant]);

  const save = useCallback(() => {
    setMsg(null);
    setErr(null);
    startTransition(async () => {
      const r = await saveProductRecommendations({
        productId,
        relatedProductIds: related.map((p) => p.id),
        youMayAlsoWantProductIds: youMayAlsoWant.map((p) => p.id),
      });
      if (!r.ok) {
        setErr(r.error);
        return;
      }
      setMsg("Related items saved.");
    });
  }, [productId, related, youMayAlsoWant]);

  const curatedCount = related.length + youMayAlsoWant.length;
  const inUse = curatedCount > 0;

  return (
    <ProductEditorSection
      title="Related items & You may also want"
      status={inUse ? "active" : "empty"}
      statusLabel={inUse ? "In use" : "Not configured"}
      meta={
        inUse
          ? `${related.length} related · ${youMayAlsoWant.length} you may also want`
          : "Optional storefront cross-sell blocks"
      }
    >
      <p className="max-w-2xl text-xs text-ink/65 dark:text-zinc-400">
        Curated per product (not per variation). Shown on the public product page when linked products are active in
        the catalog. Order matches the list below.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <RecommendationListEditor
          title="Related items"
          description="Products shoppers often view alongside this one."
          productId={productId}
          items={related}
          onChange={setRelated}
          disabled={pending}
        />
        <RecommendationListEditor
          title="You may also want"
          description="Complementary picks — add-ons, supplies, or pairings."
          productId={productId}
          items={youMayAlsoWant}
          onChange={setYouMayAlsoWant}
          disabled={pending}
        />
      </div>

      <button type="button" disabled={pending} onClick={save} className={btnSecondaryMd}>
        {pending ? "Saving…" : "Save related items"}
      </button>
      {msg ? <p className="text-sm text-lagoon-dark">{msg}</p> : null}
      {err ? <p className="text-sm text-coral">{err}</p> : null}
    </ProductEditorSection>
  );
}
