"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { saveProductTypeDefaultShippingExclusions } from "@/app/actions/product-type-shipping-defaults-admin";
import { adminFieldsetClass } from "@/lib/admin-surface-classes";
import { btnSecondaryMd } from "@/lib/btn-theme-classes";
import type { ProductShippingOptionRef } from "@/lib/products-admin-types";

export function ProductTypeShippingDefaultsEditor({
  typeId,
  typeName,
  shippingOptions,
  initialExcludedShippingOptionIds,
}: {
  typeId: string;
  typeName: string;
  shippingOptions: ProductShippingOptionRef[];
  initialExcludedShippingOptionIds: string[];
}) {
  const [excludedIds, setExcludedIds] = useState(initialExcludedShippingOptionIds);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setExcludedIds(initialExcludedShippingOptionIds);
  }, [typeId, initialExcludedShippingOptionIds]);

  function toggle(id: string) {
    setExcludedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function save() {
    setMsg(null);
    setErr(null);
    startTransition(async () => {
      const r = await saveProductTypeDefaultShippingExclusions({
        typeId,
        excludedShippingOptionIds: excludedIds,
      });
      if (!r.ok) {
        setErr(r.error);
        return;
      }
      setMsg("Shipping defaults saved.");
    });
  }

  return (
    <section className="mt-8 border-t-2 border-palm/30 pt-6 dark:border-zinc-700">
      <h2 className="text-lg font-black text-palm dark:text-emerald-300">Default shipping exclusions</h2>
      <p className="mt-2 max-w-2xl text-sm text-ink/75 dark:text-zinc-400">
        When you assign type <strong>{typeName}</strong> (or a child type) to a product, these boxes are pre-checked
        under <strong>Cannot ship in these boxes</strong> on the product form. Products still save their own exclusions;
        changing types in the editor reapplies these defaults.
      </p>

      {shippingOptions.length === 0 ? (
        <p className="mt-4 text-sm text-ink/70 dark:text-zinc-400">
          No shipping options yet. Add presets under{" "}
          <Link href="/settings/shipping" className="font-medium text-lagoon-dark underline dark:text-emerald-400">
            Settings → Shipping
          </Link>{" "}
          first.
        </p>
      ) : (
        <fieldset className={`mt-4 ${adminFieldsetClass}`}>
          <legend className="px-1 text-sm font-bold text-ink dark:text-zinc-100">
            Cannot ship in these boxes (default for this type)
          </legend>
          <p className="mb-3 text-xs text-ink/60 dark:text-zinc-400">
            Checked = excluded by default for new products with this type. Unchecked = allowed unless the product
            excludes it manually.
          </p>
          <div className="flex flex-wrap gap-3">
            {shippingOptions.map((opt) => (
              <label
                key={opt.id}
                className="flex items-center gap-2 text-sm text-ink dark:text-zinc-200"
              >
                <input
                  type="checkbox"
                  checked={excludedIds.includes(opt.id)}
                  disabled={pending}
                  onChange={() => toggle(opt.id)}
                  className="accent-palm"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <button
        type="button"
        disabled={pending || shippingOptions.length === 0}
        onClick={save}
        className={`mt-4 ${btnSecondaryMd}`}
      >
        {pending ? "Saving…" : "Save shipping defaults"}
      </button>
      {msg ? <p className="mt-2 text-sm text-lagoon-dark">{msg}</p> : null}
      {err ? <p className="mt-2 text-sm text-coral">{err}</p> : null}
    </section>
  );
}
