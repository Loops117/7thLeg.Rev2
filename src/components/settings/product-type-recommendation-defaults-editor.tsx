"use client";

import { useEffect, useState, useTransition } from "react";
import { saveProductTypeDefaultRecommendations } from "@/app/actions/product-type-recommendation-defaults-admin";
import {
  RecommendationListEditor,
  type PickedRecommendationProduct,
} from "@/components/settings/recommendation-list-editor";
import { btnSecondaryMd } from "@/lib/btn-theme-classes";

export function ProductTypeRecommendationDefaultsEditor({
  typeId,
  typeName,
  initialRelated,
  initialYouMayAlsoWant,
}: {
  typeId: string;
  typeName: string;
  initialRelated: PickedRecommendationProduct[];
  initialYouMayAlsoWant: PickedRecommendationProduct[];
}) {
  const [related, setRelated] = useState(initialRelated);
  const [youMayAlsoWant, setYouMayAlsoWant] = useState(initialYouMayAlsoWant);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setRelated(initialRelated);
    setYouMayAlsoWant(initialYouMayAlsoWant);
  }, [typeId, initialRelated, initialYouMayAlsoWant]);

  function save() {
    setMsg(null);
    setErr(null);
    startTransition(async () => {
      const r = await saveProductTypeDefaultRecommendations({
        typeId,
        relatedProductIds: related.map((p) => p.id),
        youMayAlsoWantProductIds: youMayAlsoWant.map((p) => p.id),
      });
      if (!r.ok) {
        setErr(r.error);
        return;
      }
      setMsg("Type defaults saved.");
    });
  }

  const count = related.length + youMayAlsoWant.length;

  return (
    <section className="mt-8 border-t-2 border-palm/30 pt-6 dark:border-zinc-700">
      <h2 className="text-lg font-black text-palm dark:text-emerald-300">Default related items</h2>
      <p className="mt-2 max-w-2xl text-sm text-ink/75 dark:text-zinc-400">
        Products with type <strong>{typeName}</strong> (or a more specific child type) automatically include these picks
        on the storefront. Type defaults appear first; per-product picks add on top (up to{" "}
        12 per section). Edit inherited picks on parent types from their edit page.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <RecommendationListEditor
          title="Related items"
          description="Always suggested alongside products in this type."
          items={related}
          onChange={setRelated}
          disabled={pending}
        />
        <RecommendationListEditor
          title="You may also want"
          description="Complementary picks for every product in this type."
          items={youMayAlsoWant}
          onChange={setYouMayAlsoWant}
          disabled={pending}
        />
      </div>

      <button type="button" disabled={pending} onClick={save} className={`mt-4 ${btnSecondaryMd}`}>
        {pending ? "Saving…" : count > 0 ? "Save type defaults" : "Save (clear type defaults)"}
      </button>
      {msg ? <p className="mt-2 text-sm text-lagoon-dark">{msg}</p> : null}
      {err ? <p className="mt-2 text-sm text-coral">{err}</p> : null}
    </section>
  );
}
