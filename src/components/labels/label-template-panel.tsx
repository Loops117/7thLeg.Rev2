"use client";

import { LabelTemplateChooserPreview } from "@/components/labels/label-template-chooser-preview";
import { useLabelEditor, useSwitchTemplate } from "@/components/labels/label-editor-context";
import { labelTierBreakdownAtQuantity, labelUnitCentsDisplay } from "@/lib/label-cart-pricing";
import { countDocumentElements } from "@/lib/label-editor/document";
import { labelTierSummary } from "@/lib/label-template-tiers";

export function LabelTemplatePanel() {
  const { templates, templateId, template, state, publicConfig, starterDocumentJsonByTemplateId } =
    useLabelEditor();
  const switchTemplate = useSwitchTemplate();
  const elementCount = countDocumentElements(state.doc);

  return (
    <div className="mt-4 min-w-0 space-y-4">
      <h2 className="text-sm font-black text-palm">Template</h2>
      <p className="text-[10px] text-ink/60">
        {elementCount}/{template.maxElements} elements on current design
      </p>

      <div className="max-h-[min(36vh,16rem)] overflow-auto rounded border border-palm/20 dark:border-zinc-600">
        <table className="w-full min-w-0 border-collapse text-[10px]">
          <thead className="sticky top-0 z-[1] bg-surf dark:bg-zinc-800">
            <tr className="text-left text-[8px] font-black uppercase tracking-wide text-ink/45">
              <th className="border-b border-palm/15 px-2 py-1.5 dark:border-zinc-600">Template</th>
              <th className="border-b border-palm/15 px-2 py-1.5 dark:border-zinc-600">Size</th>
              <th className="border-b border-palm/15 px-2 py-1.5 dark:border-zinc-600">Pricing</th>
              <th className="border-b border-palm/15 px-2 py-1.5 text-right dark:border-zinc-600">Max</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => {
              const isSelected = t.id === templateId;
              return (
                <tr
                  key={t.id}
                  className={
                    isSelected ? "bg-palm/15 dark:bg-emerald-900/30" : "hover:bg-surf dark:hover:bg-zinc-800/80"
                  }
                >
                  <td className="border-b border-palm/10 p-0 dark:border-zinc-700">
                    <button
                      type="button"
                      onClick={() => switchTemplate(t.id)}
                      className="w-full px-2 py-2 text-left"
                    >
                      <span className="block font-bold text-ink dark:text-zinc-100">{t.name}</span>
                      {t.description ? (
                        <span className="mt-0.5 block line-clamp-1 text-[9px] text-ink/45">{t.description}</span>
                      ) : null}
                    </button>
                  </td>
                  <td className="border-b border-palm/10 px-2 py-2 align-top text-ink/70 dark:border-zinc-700">
                    {t.widthMm}×{t.heightMm}
                  </td>
                  <td className="border-b border-palm/10 px-2 py-2 align-top text-[9px] text-ink/60 dark:border-zinc-700">
                    {labelTierSummary(t.priceTiers)}
                  </td>
                  <td className="border-b border-palm/10 px-2 py-2 text-right align-top text-ink/55 dark:border-zinc-700">
                    {t.maxElements}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="min-w-0 space-y-3 border-t border-palm/15 pt-3 dark:border-zinc-700">
        <p className="text-[10px] font-black uppercase tracking-wide text-palm">Preview</p>
        <div className="flex justify-center">
          <LabelTemplateChooserPreview
            template={template}
            starterDocumentRaw={starterDocumentJsonByTemplateId[template.id] ?? null}
            publicConfig={publicConfig}
          />
        </div>

        <dl className="grid min-w-0 grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[10px]">
          <dt className="font-bold text-ink/50">Print size</dt>
          <dd className="min-w-0 text-ink/80">
            {template.widthMm} × {template.heightMm} mm
          </dd>
          <dt className="font-bold text-ink/50">Design canvas</dt>
          <dd className="min-w-0 text-ink/80">
            {template.canvasWidthPx} × {template.canvasHeightPx} px
          </dd>
          <dt className="font-bold text-ink/50">Margin</dt>
          <dd className="text-ink/80">{template.marginPx}px inset</dd>
          <dt className="font-bold text-ink/50">Snap grid</dt>
          <dd className="text-ink/80">{template.gridStepPx}px</dd>
          <dt className="font-bold text-ink/50">Element limit</dt>
          <dd className="text-ink/80">{template.maxElements}</dd>
        </dl>

        {template.description ? (
          <p className="text-[10px] leading-relaxed text-ink/70">{template.description}</p>
        ) : null}

        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wide text-palm">Pricing</p>
          <p className="mt-0.5 text-[9px] text-ink/50">
            Unit at qty 1: {labelUnitCentsDisplay(template.priceTiers, 1)}
          </p>
          <ul className="mt-2 space-y-1 text-[9px]">
            {labelTierBreakdownAtQuantity(template.priceTiers, 1).map((row) => (
              <li
                key={row.minQty}
                className={`flex justify-between gap-2 rounded px-1.5 py-0.5 ${
                  row.active ? "bg-palm/10 font-bold dark:bg-emerald-900/25" : ""
                }`}
              >
                <span className="text-ink/60">{row.minQty}+ labels</span>
                <span className="shrink-0 text-ink/85">{row.unitDisplay} each</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
