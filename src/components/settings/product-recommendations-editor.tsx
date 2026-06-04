"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { saveProductRecommendations } from "@/app/actions/product-recommendations-mutations";
import { ProductEditorSection } from "@/components/settings/product-editor-section";
import {
  RecommendationListEditor,
  type PickedRecommendationProduct,
} from "@/components/settings/recommendation-list-editor";
import { btnSecondaryMd } from "@/lib/btn-theme-classes";

export function ProductRecommendationsEditor({
  productId,
  initialRelated,
  initialYouMayAlsoWant,
  inheritedFromTypes,
}: {
  productId: string;
  initialRelated: PickedRecommendationProduct[];
  initialYouMayAlsoWant: PickedRecommendationProduct[];
  inheritedFromTypes: {
    related: PickedRecommendationProduct[];
    youMayAlsoWant: PickedRecommendationProduct[];
  };
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

  const inheritedCount =
    inheritedFromTypes.related.length + inheritedFromTypes.youMayAlsoWant.length;
  const productCount = related.length + youMayAlsoWant.length;
  const inUse = inheritedCount > 0 || productCount > 0;

  return (
    <ProductEditorSection
      title="Related items & You may also want"
      status={inUse ? "active" : "empty"}
      statusLabel={inUse ? "In use" : "Not configured"}
      meta={
        inUse
          ? `${inheritedFromTypes.related.length} type + ${related.length} product related · ${inheritedFromTypes.youMayAlsoWant.length} type + ${youMayAlsoWant.length} product also-want`
          : "Optional storefront cross-sell blocks"
      }
    >
      <p className="max-w-2xl text-xs text-ink/65 dark:text-zinc-400">
        Shown on the public product page when linked products are active.{" "}
        <Link href="/settings/products/types" className="text-lagoon-dark underline dark:text-emerald-400">
          Product type defaults
        </Link>{" "}
        apply to every product in that type (and child types). Related items on the storefront also include other
        products in the same type(s). Add extra picks below for this product only.
      </p>

      {inheritedCount > 0 ? (
        <div className="rounded border-2 border-palm/25 bg-surf/30 p-3 dark:border-zinc-700 dark:bg-zinc-900/50">
          <p className="mb-3 text-xs font-bold text-ink dark:text-zinc-200">From product types (read-only)</p>
          <div className="grid gap-4 lg:grid-cols-2">
            <RecommendationListEditor
              title="Related items (type defaults)"
              description="Inherited from this product’s types. Edit under Settings → Product types."
              excludeProductId={productId}
              items={inheritedFromTypes.related}
              readOnly
            />
            <RecommendationListEditor
              title="You may also want (type defaults)"
              description="Inherited from this product’s types."
              excludeProductId={productId}
              items={inheritedFromTypes.youMayAlsoWant}
              readOnly
            />
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <RecommendationListEditor
          title="Related items (this product)"
          description="Extra products beyond type defaults."
          excludeProductId={productId}
          items={related}
          onChange={setRelated}
          disabled={pending}
        />
        <RecommendationListEditor
          title="You may also want (this product)"
          description="Extra complementary picks for this product."
          excludeProductId={productId}
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
