"use client";

import { useMemo, useState, useTransition } from "react";
import { btnSecondaryMd } from "@/lib/btn-theme-classes";
import { useRouter } from "next/navigation";
import { updateLabelCartSettings } from "@/app/actions/site-config-admin";
import {
  labelLineSubtotalDisplay,
  labelTierBreakdownAtQuantity,
  labelUnitCentsDisplay,
} from "@/lib/label-cart-pricing";
import type { LabelPriceTier } from "@/lib/label-template-tiers";
import type { LabelCartAdminState } from "@/lib/site-config-types";
export type LabelTemplatePricingRow = {
  id: string;
  name: string;
  active: boolean;
  widthMm: number;
  heightMm: number;
  priceTiers: LabelPriceTier[];
};

const fieldClass =
  "mt-1 w-full border-2 border-palm/30 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100";

export function LabelCartCheckoutPane({
  initialSettings,
  templates,
}: {
  initialSettings: LabelCartAdminState;
  templates: LabelTemplatePricingRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [settings, setSettings] = useState(initialSettings);
  const [msg, setMsg] = useState("");

  const activeTemplates = useMemo(() => templates.filter((t) => t.active), [templates]);
  const [previewTemplateId, setPreviewTemplateId] = useState(
    () => activeTemplates[0]?.id ?? templates[0]?.id ?? "",
  );
  const [previewQty, setPreviewQty] = useState(String(Math.max(initialSettings.minQuantity, 10)));

  const previewTemplate =
    templates.find((t) => t.id === previewTemplateId) ?? activeTemplates[0] ?? templates[0] ?? null;

  const qtyNum = Math.max(
    settings.minQuantity,
    Math.min(99999, Math.floor(Number.parseInt(previewQty, 10) || settings.minQuantity)),
  );

  const tierRows = previewTemplate ? labelTierBreakdownAtQuantity(previewTemplate.priceTiers, qtyNum) : [];

  function saveSettings() {
    setMsg("");
    startTransition(async () => {
      const r = await updateLabelCartSettings(settings);
      if (!r.ok) {
        setMsg(r.error);
        return;
      }
      setMsg("Cart & checkout settings saved.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink/85 dark:text-zinc-300">
        Control how label pricing appears before customers add to cart. Per-label <strong>price tiers</strong> are set on
        each template above; this pane configures checkout behavior and lets you preview totals.
      </p>

      <section className="rounded border border-palm/25 bg-surf/30 p-4 dark:border-zinc-600 dark:bg-zinc-900/40">
        <h3 className="text-xs font-black uppercase tracking-wide text-palm dark:text-emerald-300">Checkout behavior</h3>
        <div className="mt-3 space-y-3">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-ink dark:text-zinc-200">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-palm"
              checked={settings.showSubtotalPreview}
              onChange={(e) => setSettings((s) => ({ ...s, showSubtotalPreview: e.target.checked }))}
              disabled={pending}
            />
            <span>
              <strong>Show subtotal preview</strong> in the label builder (quantity × unit price before add to cart).
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-ink dark:text-zinc-200">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-palm"
              checked={settings.mergeWithStoreCart}
              onChange={(e) => setSettings((s) => ({ ...s, mergeWithStoreCart: e.target.checked }))}
              disabled={pending}
            />
            <span>
              <strong>Merge with storefront cart</strong> — label lines use the same cart as products (recommended).
              When off, a separate label-only cart can be added later.
            </span>
          </label>
          <label className="block max-w-[10rem] text-xs font-bold uppercase text-ink/55">
            Minimum quantity per add
            <input
              type="number"
              min={1}
              max={9999}
              className={fieldClass}
              value={settings.minQuantity}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  minQuantity: Math.min(9999, Math.max(1, Number.parseInt(e.target.value, 10) || 1)),
                }))
              }
              disabled={pending}
            />
          </label>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={saveSettings}
          className={`mt-4 ${btnSecondaryMd}`}
        >
          Save checkout settings
        </button>
        {msg ? (
          <p className="mt-2 text-sm text-ink/85 dark:text-zinc-300" role="status">
            {msg}
          </p>
        ) : null}
      </section>

      <section className="rounded border border-palm/25 bg-white p-4 dark:border-zinc-600 dark:bg-zinc-950/50">
        <h3 className="text-xs font-black uppercase tracking-wide text-palm dark:text-emerald-300">
          Pricing preview (customer view)
        </h3>
        <p className="mt-1 text-xs text-ink/65 dark:text-zinc-400">
          Simulates tiered unit pricing and line subtotal at a chosen quantity. The live label builder will use these
          rules when cart integration ships.
        </p>

        {templates.length === 0 ? (
          <p className="mt-4 text-sm text-ink/70">Add at least one label template above to preview pricing.</p>
        ) : (
          <>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <label className="block min-w-[12rem] flex-1 text-xs font-bold text-ink dark:text-zinc-200">
                Template
                <select
                  className={fieldClass}
                  value={previewTemplateId}
                  onChange={(e) => setPreviewTemplateId(e.target.value)}
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name.trim() || "Untitled"}
                      {!t.active ? " (inactive)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block w-28 text-xs font-bold text-ink dark:text-zinc-200">
                Quantity
                <input
                  type="number"
                  min={settings.minQuantity}
                  max={99999}
                  className={fieldClass}
                  value={previewQty}
                  onChange={(e) => setPreviewQty(e.target.value)}
                />
              </label>
            </div>

            {previewTemplate ? (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded border border-palm/20 bg-surf/40 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-ink/50">Preview card</p>
                  <p className="mt-2 font-bold text-palm dark:text-emerald-200">
                    {previewTemplate.name.trim() || "Untitled"}
                  </p>
                  <p className="text-xs text-ink/70">
                    {previewTemplate.widthMm}×{previewTemplate.heightMm} mm · qty {qtyNum}
                  </p>
                  {settings.showSubtotalPreview ? (
                    <dl className="mt-3 space-y-1 text-sm">
                      <div className="flex justify-between gap-2">
                        <dt className="text-ink/70">Unit price</dt>
                        <dd className="font-bold text-ink">
                          {labelUnitCentsDisplay(previewTemplate.priceTiers, qtyNum)} each
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2 border-t border-palm/15 pt-2 dark:border-zinc-700">
                        <dt className="font-bold text-palm">Subtotal</dt>
                        <dd className="font-black text-palm dark:text-emerald-200">
                          {labelLineSubtotalDisplay(previewTemplate.priceTiers, qtyNum)}
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="mt-3 text-xs text-ink/60 italic">Subtotal preview is turned off in settings.</p>
                  )}
                  <p className="mt-3 text-[10px] text-ink/55">
                    {settings.mergeWithStoreCart
                      ? "Adds to your main cart with product lines at checkout."
                      : "Will use a separate label cart when that flow is built."}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-ink/50">Tier breakdown</p>
                  <div className="mt-2 overflow-x-auto rounded border border-palm/15 dark:border-zinc-700">
                    <table className="w-full min-w-[240px] border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-palm/20 bg-palm/5">
                          <th className="px-2 py-1.5 font-bold text-palm">Min qty</th>
                          <th className="px-2 py-1.5 font-bold text-palm">Unit</th>
                          <th className="px-2 py-1.5 font-bold text-palm">At qty {qtyNum}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tierRows.map((row) => (
                          <tr
                            key={row.minQty}
                            className={`border-b border-palm/10 ${row.active ? "bg-palm/10 font-bold dark:bg-emerald-950/50" : ""}`}
                          >
                            <td className="px-2 py-1.5">{row.minQty}+</td>
                            <td className="px-2 py-1.5">{row.unitDisplay}</td>
                            <td className="px-2 py-1.5">{row.active ? "Applies" : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}

            {activeTemplates.length > 0 ? (
              <div className="mt-6 border-t border-palm/15 pt-4 dark:border-zinc-700">
                <p className="text-[10px] font-bold uppercase tracking-wide text-ink/50">
                  All active templates @ qty 1 / 10 / 50
                </p>
                <div className="mt-2 max-h-[12rem] overflow-auto rounded border border-palm/15 dark:border-zinc-700">
                  <table className="admin-striped w-full min-w-[420px] border-collapse text-left text-xs">
                    <thead className="sticky top-0 bg-palm/10 dark:bg-zinc-800">
                      <tr>
                        <th className="px-2 py-1.5 font-bold text-palm">Template</th>
                        <th className="px-2 py-1.5 font-bold text-palm">Qty 1</th>
                        <th className="px-2 py-1.5 font-bold text-palm">Qty 10</th>
                        <th className="px-2 py-1.5 font-bold text-palm">Qty 50</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeTemplates.map((t) => (
                        <tr key={t.id} className="border-b border-palm/10">
                          <td className="px-2 py-1.5 font-medium text-ink">{t.name.trim() || "Untitled"}</td>
                          <td className="px-2 py-1.5">{labelLineSubtotalDisplay(t.priceTiers, 1)}</td>
                          <td className="px-2 py-1.5">{labelLineSubtotalDisplay(t.priceTiers, 10)}</td>
                          <td className="px-2 py-1.5">{labelLineSubtotalDisplay(t.priceTiers, 50)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-xs text-ink/60">No active templates — activate a template to include it in checkout.</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
