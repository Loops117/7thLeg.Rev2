import { listLabelFinishOptionsAdmin } from "@/app/actions/label-finish-admin";
import { listLabelStickerAssetsAdmin } from "@/app/actions/label-stickers-admin";
import { LabelBuilderSettingsEditor } from "@/components/settings/label-builder-settings-editor";
import { LabelStickersEditor } from "@/components/settings/label-stickers-editor";
import { LabelStorefrontSection } from "@/components/settings/label-storefront-section";
import { LabelTemplatesEditor, type LabelTemplateAdminRow } from "@/components/settings/label-templates-editor";
import { parseLabelBorderConfig } from "@/lib/label-template-border";
import { parsePriceTiersJson } from "@/lib/label-template-tiers";
import type { SpeciesCatalogRow } from "@/lib/species-catalog";
import {
  getLabelBuilderForAdmin,
  getLabelCartSettingsForAdmin,
  getLabelFulfillmentSettingsForAdmin,
  getLabelPreviewWatermarkForAdmin,
} from "@/lib/site-config";
import { prisma } from "@/lib/prisma";

export default async function SettingsLabelsPage() {
  const [
    labelBuilder,
    labelCartSettings,
    labelPreviewWatermark,
    labelFulfillmentSettings,
    templateRows,
    speciesDbRows,
    stickerAssets,
    globalFinishOptions,
  ] = await Promise.all([
    getLabelBuilderForAdmin(),
    getLabelCartSettingsForAdmin(),
    getLabelPreviewWatermarkForAdmin(),
    getLabelFulfillmentSettingsForAdmin(),
    prisma.labelTemplate.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.speciesCatalogEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 2000,
      select: {
        id: true,
        type: true,
        genus: true,
        species: true,
        commonName: true,
        morph: true,
        approved: true,
        createdAt: true,
      },
    }),
    listLabelStickerAssetsAdmin(),
    listLabelFinishOptionsAdmin(),
  ]);

  const templates: LabelTemplateAdminRow[] = templateRows.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    active: t.active,
    sortOrder: t.sortOrder,
    widthMm: t.widthMm,
    heightMm: t.heightMm,
    marginPx: t.marginPx,
    canvasWidthPx: t.canvasWidthPx,
    canvasHeightPx: t.canvasHeightPx,
    gridStepPx: t.gridStepPx,
    maxElements: t.maxElements,
    priceTiers: parsePriceTiersJson(t.priceTiersJson),
    baseLayoutImageUrl: t.baseLayoutImageUrl,
    baseLayoutScalePercent: t.baseLayoutScalePercent,
    baseLayoutRotationDeg: t.baseLayoutRotationDeg,
    baseLayoutOpacityPercent: t.baseLayoutOpacityPercent,
    baseLayoutOffsetXPx: t.baseLayoutOffsetXPx,
    baseLayoutOffsetYPx: t.baseLayoutOffsetYPx,
    borderConfig: parseLabelBorderConfig(t.borderConfigJson),
  }));

  const speciesRows: SpeciesCatalogRow[] = speciesDbRows.map((r) => ({
    id: r.id,
    type: r.type,
    genus: r.genus,
    species: r.species,
    commonName: r.commonName,
    morph: r.morph,
    approved: r.approved,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div>
      <h1 className="border-b-4 border-palm pb-3 text-2xl font-black text-palm">Labels</h1>
      <p className="mt-4 max-w-3xl text-ink/80">
        Custom label ordering: enable the storefront section, manage templates, and maintain the species catalog for the
        label builder. Customer editor and cart integration will follow.
      </p>

      <div className="mt-8">
        <LabelStorefrontSection initial={labelBuilder} />
      </div>

      <details className="mt-8 overflow-hidden rounded border-2 border-palm bg-white shadow-sm dark:border-zinc-600 dark:bg-zinc-900/55 [&_summary]:cursor-pointer [&_summary]:list-none [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex flex-wrap items-center justify-between gap-2 border-b border-palm/15 px-4 py-3 font-bold text-palm hover:bg-surf/40 dark:border-zinc-700 dark:text-emerald-300">
          <span>Customer stickers</span>
          <span className="text-xs font-normal text-ink/60 dark:text-zinc-500">
            {stickerAssets.length} sticker{stickerAssets.length === 1 ? "" : "s"}
          </span>
        </summary>
        <div className="p-4">
          <LabelStickersEditor initial={stickerAssets} />
        </div>
      </details>

      <details className="mt-8 overflow-hidden rounded border-2 border-palm bg-white shadow-sm dark:border-zinc-600 dark:bg-zinc-900/55 [&_summary]:cursor-pointer [&_summary]:list-none [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex flex-wrap items-center justify-between gap-2 border-b border-palm/15 px-4 py-3 font-bold text-palm hover:bg-surf/40 dark:border-zinc-700 dark:text-emerald-300">
          <span>Label templates</span>
          <span className="text-xs font-normal text-ink/60 dark:text-zinc-500">
            {templates.length} template{templates.length === 1 ? "" : "s"}
          </span>
        </summary>
        <div className="p-4">
          <LabelTemplatesEditor initial={templates} globalFinishOptions={globalFinishOptions} />
        </div>
      </details>

      <div className="mt-8">
        <LabelBuilderSettingsEditor
          speciesRows={speciesRows}
          labelCartSettings={labelCartSettings}
          pricingTemplates={templates.map((t) => ({
            id: t.id,
            name: t.name,
            active: t.active,
            widthMm: t.widthMm,
            heightMm: t.heightMm,
            priceTiers: t.priceTiers,
          }))}
          labelPreviewWatermark={labelPreviewWatermark}
          labelFulfillmentSettings={labelFulfillmentSettings}
        />
      </div>
    </div>
  );
}
