"use client";

import { type ReactNode } from "react";
import { LabelCartCheckoutPane, type LabelTemplatePricingRow } from "@/components/settings/label-cart-checkout-pane";
import { LabelOrdersFulfillmentPane } from "@/components/settings/label-orders-fulfillment-pane";
import { LabelPreviewWatermarkPane } from "@/components/settings/label-preview-watermark-pane";
import { SpeciesCatalogPreviewPane } from "@/components/settings/species-catalog-preview-pane";
import type {
  LabelCartAdminState,
  LabelFulfillmentAdminState,
  LabelPreviewWatermarkAdminPayload,
} from "@/lib/site-config-types";
import type { SpeciesCatalogRow } from "@/lib/species-catalog";

function Section({
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="rounded border-2 border-palm bg-white shadow-sm [&_summary]:cursor-pointer [&_summary]:list-none [&_summary::-webkit-details-marker]:hidden dark:border-zinc-600 dark:bg-zinc-900/55"
    >
      <summary className="flex flex-wrap items-center justify-between gap-2 border-b border-palm/15 px-4 py-3 font-bold text-palm hover:bg-surf/40 dark:border-zinc-700 dark:text-emerald-300">
        <span>{title}</span>
        <span className="text-xs font-normal text-ink/60 dark:text-zinc-500">{summary}</span>
      </summary>
      <div className="space-y-3 p-4 text-sm text-ink/80">{children}</div>
    </details>
  );
}

export function LabelBuilderSettingsEditor({
  speciesRows,
  labelCartSettings,
  pricingTemplates,
  labelPreviewWatermark,
  labelFulfillmentSettings,
}: {
  speciesRows: SpeciesCatalogRow[];
  labelCartSettings: LabelCartAdminState;
  pricingTemplates: LabelTemplatePricingRow[];
  labelPreviewWatermark: LabelPreviewWatermarkAdminPayload;
  labelFulfillmentSettings: LabelFulfillmentAdminState;
}) {
  return (
    <div className="max-w-5xl space-y-4">
      <Section
        title="Species catalog"
        summary={`${speciesRows.length} entr${speciesRows.length === 1 ? "y" : "ies"} loaded`}
        defaultOpen={false}
      >
        <SpeciesCatalogPreviewPane initialRows={speciesRows} />
      </Section>

      <Section
        title="Cart & checkout preview"
        summary={
          labelCartSettings.showSubtotalPreview
            ? "Subtotal preview on · tiers on templates"
            : "Subtotal preview off"
        }
        defaultOpen={false}
      >
        <LabelCartCheckoutPane initialSettings={labelCartSettings} templates={pricingTemplates} />
      </Section>

      <Section
        title="Previews & watermarks"
        summary={
          labelPreviewWatermark.settings.watermarkKind === "off"
            ? labelPreviewWatermark.settings.productionUnwatermarked
              ? "No preview watermark · print clean"
              : "No preview watermark"
            : labelPreviewWatermark.settings.watermarkKind === "text"
              ? `Text · ${labelPreviewWatermark.settings.watermarkText.slice(0, 24)}${labelPreviewWatermark.settings.watermarkText.length > 24 ? "…" : ""}`
              : labelPreviewWatermark.settings.watermarkKind === "custom"
                ? "Custom image watermark"
                : "Global watermark"
        }
        defaultOpen={false}
      >
        <LabelPreviewWatermarkPane initial={labelPreviewWatermark} />
      </Section>

      <Section
        title="Orders & fulfillment"
        summary={
          labelFulfillmentSettings.showOnOrders
            ? `${labelFulfillmentSettings.sheetFormat === "letter" ? "Letter" : "A4"} sheets · ${labelFulfillmentSettings.printDpi} DPI`
            : "Fulfillment defaults"
        }
        defaultOpen={false}
      >
        <LabelOrdersFulfillmentPane
          initialSettings={labelFulfillmentSettings}
          templates={pricingTemplates.map((t) => ({
            id: t.id,
            name: t.name,
            active: t.active,
            widthMm: t.widthMm,
            heightMm: t.heightMm,
          }))}
        />
      </Section>
    </div>
  );
}
