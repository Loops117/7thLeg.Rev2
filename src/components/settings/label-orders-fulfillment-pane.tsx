"use client";

import Link from "next/link";
import { btnSecondaryMd } from "@/lib/btn-theme-classes";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateLabelFulfillmentSettings } from "@/app/actions/site-config-admin";
import { computeLabelImposition, labelFulfillmentSheetFormatLabel } from "@/lib/label-print-imposition";
import {
  LABEL_FULFILLMENT_SHEET_FORMATS,
  type LabelFulfillmentAdminState,
  type LabelFulfillmentSheetFormat,
} from "@/lib/site-config-types";

export type LabelTemplateImpositionRow = {
  id: string;
  name: string;
  active: boolean;
  widthMm: number;
  heightMm: number;
};

const fieldClass =
  "mt-1 w-full border-2 border-palm/30 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100";

function fulfillmentSummary(settings: LabelFulfillmentAdminState): string {
  const parts: string[] = [];
  if (settings.showOnOrders) parts.push("orders");
  if (settings.saveCustomerLayouts) parts.push("saved layouts");
  if (settings.allowReorder) parts.push("reorder");
  const exports: string[] = [];
  if (settings.exportPdf) exports.push("PDF");
  if (settings.exportRaster) {
    exports.push(settings.printTransparentBackground ? "raster (transparent sheet)" : "raster");
  }
  if (exports.length) parts.push(exports.join("+"));
  return parts.length ? parts.join(" · ") : "minimal";
}

export function LabelOrdersFulfillmentPane({
  initialSettings,
  templates,
}: {
  initialSettings: LabelFulfillmentAdminState;
  templates: LabelTemplateImpositionRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [settings, setSettings] = useState(initialSettings);
  const [msg, setMsg] = useState("");

  const activeTemplates = useMemo(() => templates.filter((t) => t.active), [templates]);
  const [previewTemplateId, setPreviewTemplateId] = useState(
    () => activeTemplates[0]?.id ?? templates[0]?.id ?? "",
  );

  const previewTemplate =
    templates.find((t) => t.id === previewTemplateId) ?? activeTemplates[0] ?? templates[0] ?? null;

  const imposition = previewTemplate
    ? computeLabelImposition({
        labelWidthMm: previewTemplate.widthMm,
        labelHeightMm: previewTemplate.heightMm,
        sheetFormat: settings.sheetFormat,
        sheetMarginMm: settings.sheetMarginMm,
        labelGapMm: settings.labelGapMm,
      })
    : null;

  function save() {
    setMsg("");
    startTransition(async () => {
      const r = await updateLabelFulfillmentSettings(settings);
      if (!r.ok) {
        setMsg(r.error);
        return;
      }
      setMsg("Orders & fulfillment settings saved.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink/85 dark:text-zinc-300">
        Configure how paid label batches appear in admin, what customers can save and reorder, and how print sheets are
        laid out for fulfillment. Export pipelines will read these defaults when label checkout ships.
      </p>

      <section className="rounded border border-palm/25 bg-surf/30 p-4 dark:border-zinc-600 dark:bg-zinc-900/40">
        <h3 className="text-xs font-black uppercase tracking-wide text-palm dark:text-emerald-300">Orders & admin</h3>
        <div className="mt-3 space-y-3">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-ink dark:text-zinc-200">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-palm"
              checked={settings.showOnOrders}
              onChange={(e) => setSettings((s) => ({ ...s, showOnOrders: e.target.checked }))}
              disabled={pending}
            />
            <span>
              <strong>Show label batches on orders</strong> — when label line items exist, surface layout snapshots and
              quantities on{" "}
              <Link href="/settings/sales" className="font-bold text-lagoon-dark underline dark:text-emerald-300">
                Sales
              </Link>{" "}
              order detail (requires label order data at checkout).
            </span>
          </label>
        </div>
      </section>

      <section className="rounded border border-palm/25 bg-surf/30 p-4 dark:border-zinc-600 dark:bg-zinc-900/40">
        <h3 className="text-xs font-black uppercase tracking-wide text-palm dark:text-emerald-300">
          Customer account
        </h3>
        <div className="mt-3 space-y-3">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-ink dark:text-zinc-200">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-palm"
              checked={settings.saveCustomerLayouts}
              onChange={(e) => {
                const checked = e.target.checked;
                setSettings((s) => ({
                  ...s,
                  saveCustomerLayouts: checked,
                  allowReorder: checked ? s.allowReorder : false,
                }));
              }}
              disabled={pending}
            />
            <span>
              <strong>Save layouts to account</strong> — reusable designs (positions, fonts, field roles) separate from
              per-order value snapshots.
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-ink dark:text-zinc-200">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-palm"
              checked={settings.allowReorder}
              onChange={(e) => setSettings((s) => ({ ...s, allowReorder: e.target.checked }))}
              disabled={pending || !settings.saveCustomerLayouts}
            />
            <span>
              <strong>Allow reorder from past purchases</strong> — start a new editable draft from a previous batch
              (copies last-used field values when available).
            </span>
          </label>
          {!settings.saveCustomerLayouts ? (
            <p className="text-xs text-ink/55">Enable saved layouts to offer reorder from account history.</p>
          ) : null}
        </div>
      </section>

      <section className="rounded border border-palm/25 bg-surf/30 p-4 dark:border-zinc-600 dark:bg-zinc-900/40">
        <h3 className="text-xs font-black uppercase tracking-wide text-palm dark:text-emerald-300">Export formats</h3>
        <div className="mt-3 flex flex-wrap gap-6">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-ink dark:text-zinc-200">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-palm"
              checked={settings.exportPdf}
              onChange={(e) => setSettings((s) => ({ ...s, exportPdf: e.target.checked }))}
              disabled={pending}
            />
            <span>
              <strong>PDF print sheets</strong> — imposition onto {labelFulfillmentSheetFormatLabel(settings.sheetFormat)}
              .
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-ink dark:text-zinc-200">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-palm"
              checked={settings.exportRaster}
              onChange={(e) => setSettings((s) => ({ ...s, exportRaster: e.target.checked }))}
              disabled={pending}
            />
            <span>
              <strong>Raster print sheets</strong> — PNG at {settings.printDpi} DPI (imposed sheets for download).
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-ink dark:text-zinc-200">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-palm"
              checked={settings.printTransparentBackground}
              onChange={(e) => setSettings((s) => ({ ...s, printTransparentBackground: e.target.checked }))}
              disabled={pending || !settings.exportRaster}
            />
            <span>
              <strong>Transparent sheet background</strong> — the full print sheet is transparent except where label
              artwork is placed (for die-cut machines that trim transparent areas).
            </span>
          </label>
        </div>
        {!settings.exportPdf && !settings.exportRaster ? (
          <p className="mt-2 text-xs text-coral">Enable at least one export format for fulfillment.</p>
        ) : null}
      </section>

      <section className="rounded border border-palm/25 bg-surf/30 p-4 dark:border-zinc-600 dark:bg-zinc-900/40">
        <h3 className="text-xs font-black uppercase tracking-wide text-palm dark:text-emerald-300">
          Print sheet imposition
        </h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-xs font-bold uppercase text-ink/55">
            Sheet size
            <select
              className={fieldClass}
              value={settings.sheetFormat}
              onChange={(e) =>
                setSettings((s) => ({ ...s, sheetFormat: e.target.value as LabelFulfillmentSheetFormat }))
              }
              disabled={pending}
            >
              {LABEL_FULFILLMENT_SHEET_FORMATS.map((f) => (
                <option key={f} value={f}>
                  {labelFulfillmentSheetFormatLabel(f)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-bold uppercase text-ink/55">
            Margin (mm)
            <input
              type="number"
              min={0}
              max={40}
              step={0.5}
              className={fieldClass}
              value={settings.sheetMarginMm}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  sheetMarginMm: Math.min(40, Math.max(0, Number.parseFloat(e.target.value) || 0)),
                }))
              }
              disabled={pending}
            />
          </label>
          <label className="block text-xs font-bold uppercase text-ink/55">
            Gap between labels (mm)
            <input
              type="number"
              min={0}
              max={20}
              step={0.5}
              className={fieldClass}
              value={settings.labelGapMm}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  labelGapMm: Math.min(20, Math.max(0, Number.parseFloat(e.target.value) || 0)),
                }))
              }
              disabled={pending}
            />
          </label>
          <label className="block text-xs font-bold uppercase text-ink/55">
            Print DPI
            <input
              type="number"
              min={150}
              max={600}
              step={50}
              className={fieldClass}
              value={settings.printDpi}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  printDpi: Math.min(600, Math.max(150, Number.parseInt(e.target.value, 10) || 300)),
                }))
              }
              disabled={pending}
            />
          </label>
        </div>

        {templates.length > 0 ? (
          <div className="mt-4">
            <label className="block max-w-md text-xs font-bold uppercase text-ink/55">
              Imposition preview template
              <select
                className={fieldClass}
                value={previewTemplateId}
                onChange={(e) => setPreviewTemplateId(e.target.value)}
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.widthMm}×{t.heightMm} mm){t.active ? "" : " — inactive"}
                  </option>
                ))}
              </select>
            </label>

            {imposition && previewTemplate ? (
              <div className="mt-4 flex flex-wrap items-start gap-6">
                <div
                  className="relative aspect-[17/22] w-full max-w-[200px] rounded border-2 border-palm/40 bg-white p-2 shadow-inner dark:bg-zinc-950"
                  aria-hidden
                >
                  <div
                    className="grid h-full w-full gap-[2px]"
                    style={{
                      gridTemplateColumns: `repeat(${Math.max(imposition.columns, 1)}, 1fr)`,
                      gridTemplateRows: `repeat(${Math.max(imposition.rows, 1)}, 1fr)`,
                    }}
                  >
                    {Array.from({ length: Math.max(imposition.labelsPerSheet, 1) }).map((_, i) => (
                      <div
                        key={i}
                        className={`rounded-sm border ${
                          imposition.doesNotFit
                            ? "border-coral/60 bg-coral/10"
                            : "border-palm/50 bg-palm/15 dark:bg-emerald-900/30"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <dl className="min-w-[12rem] space-y-2 text-xs text-ink/85 dark:text-zinc-300">
                  <div>
                    <dt className="font-bold text-ink/55">Sheet</dt>
                    <dd>
                      {imposition.sheetLabel} — {imposition.sheetWidthMm.toFixed(1)}×{imposition.sheetHeightMm.toFixed(1)}{" "}
                      mm
                    </dd>
                  </div>
                  <div>
                    <dt className="font-bold text-ink/55">Printable area</dt>
                    <dd>
                      {imposition.usableWidthMm.toFixed(1)}×{imposition.usableHeightMm.toFixed(1)} mm (after{" "}
                      {settings.sheetMarginMm} mm margin)
                    </dd>
                  </div>
                  <div>
                    <dt className="font-bold text-ink/55">Grid</dt>
                    <dd>
                      {imposition.doesNotFit ? (
                        <span className="text-coral">Template does not fit on this sheet with current margins.</span>
                      ) : (
                        <>
                          {imposition.columns}×{imposition.rows} = <strong>{imposition.labelsPerSheet}</strong> labels per
                          sheet
                        </>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-bold text-ink/55">Template</dt>
                    <dd>
                      {previewTemplate.name} — {previewTemplate.widthMm}×{previewTemplate.heightMm} mm
                    </dd>
                  </div>
                </dl>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-xs text-ink/55">Add a label template above to preview imposition.</p>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className={btnSecondaryMd}
        >
          {pending ? "Saving…" : "Save fulfillment settings"}
        </button>
        <span className="text-xs text-ink/55">Current: {fulfillmentSummary(settings)}</span>
        {msg ? (
          <p className={`text-sm font-semibold ${msg.includes("saved") ? "text-palm" : "text-coral"}`}>{msg}</p>
        ) : null}
      </div>
    </div>
  );
}
