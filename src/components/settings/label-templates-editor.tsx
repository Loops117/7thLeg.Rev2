"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import {
  adminCreateLabelTemplate,
  adminDeleteLabelTemplate,
  adminSetLabelTemplateActive,
  adminUpdateLabelTemplate,
  uploadLabelTemplateBaseLayout,
  type LabelTemplateAdminPayload,
} from "@/app/actions/label-templates-admin";
import { LabelTemplatePreview } from "@/components/settings/label-template-preview";
import { btnImportantLink, btnSecondaryMd, btnSecondarySm } from "@/lib/btn-theme-classes";
import {
  LabelTemplateFinishSection,
  type LabelTemplateFinishSectionHandle,
} from "@/components/settings/label-template-finish-section";
import { LabelTemplateSortCell } from "@/components/settings/label-template-sort-cell";
import {
  adminSetTemplateFinishOptions,
  type LabelFinishOptionAdminRow,
} from "@/app/actions/label-finish-admin";
import Link from "next/link";
import { TemplateEditorStickyPreview } from "@/components/settings/template-editor-sticky-preview";
import {
  borderTextOffsetLimits,
  clampBorderConfigToCanvas,
  type LabelBorderConfig,
} from "@/lib/label-template-border";
import {
  LABEL_TEMPLATE_DESIGN_DPI,
  autoGridStepPx,
  editableRegionPx,
  labelCanvasPxFromMm,
} from "@/lib/label-template-canvas";
import type { LabelPriceTier } from "@/lib/label-template-tiers";
import { unitCentsForLabelQuantity } from "@/lib/label-template-tiers";
import { colorInputValue } from "@/lib/label-editor/typography";
import { formatPriceUsd } from "@/lib/product-slug";

export type LabelTemplateAdminRow = {
  id: string;
  name: string;
  description: string;
  active: boolean;
  sortOrder: number;
  widthMm: number;
  heightMm: number;
  marginPx: number;
  canvasWidthPx: number;
  canvasHeightPx: number;
  gridStepPx: number;
  maxElements: number;
  priceTiers: LabelPriceTier[];
  baseLayoutImageUrl: string;
  baseLayoutScalePercent: number;
  baseLayoutRotationDeg: number;
  baseLayoutOpacityPercent: number;
  baseLayoutOffsetXPx: number;
  baseLayoutOffsetYPx: number;
  borderConfig: LabelBorderConfig;
};

function centsToUsdInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

function parseUsdToCents(raw: string): number | null {
  const n = Number.parseFloat(raw.replace(/,/g, "").trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

const BASE_LAYOUT_DEFAULT_SCALE = 100;
const BASE_LAYOUT_DEFAULT_ROTATION = 0;
const BASE_LAYOUT_DEFAULT_OPACITY = 100;
const BASE_LAYOUT_DEFAULT_OFFSET_X = 0;
const BASE_LAYOUT_DEFAULT_OFFSET_Y = 0;

type TemplateSettingsPaneId = "margin" | "base" | "border" | "maxElements";

function tierSummary(tiers: LabelPriceTier[]): string {
  if (tiers.length === 0) return "—";
  const parts = tiers.slice(0, 3).map((t) => `${formatPriceUsd(t.unitCents)} @ ${t.minQty}+`);
  const extra = tiers.length > 3 ? ` (+${tiers.length - 3} more)` : "";
  return parts.join(" · ") + extra;
}

function ActiveInactiveRocker({
  active,
  pending,
  onActive,
}: {
  active: boolean;
  pending: boolean;
  onActive: (next: boolean) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Template active state"
      className="inline-flex overflow-hidden rounded border-2 border-palm text-[10px] font-black uppercase tracking-wide dark:border-zinc-600"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        disabled={pending || active}
        onClick={() => onActive(true)}
        className={`px-2.5 py-1 transition-colors disabled:cursor-default ${
          active
            ? "bg-palm text-sand dark:bg-emerald-800"
            : "bg-white text-palm hover:bg-surf dark:bg-zinc-950 dark:text-emerald-200 dark:hover:bg-zinc-800"
        }`}
      >
        Active
      </button>
      <button
        type="button"
        disabled={pending || !active}
        onClick={() => onActive(false)}
        className={`border-l-2 border-palm px-2.5 py-1 transition-colors disabled:cursor-default dark:border-zinc-600 ${
          !active
            ? "bg-palm text-sand dark:bg-emerald-800"
            : "bg-white text-palm hover:bg-surf dark:bg-zinc-950 dark:text-emerald-200 dark:hover:bg-zinc-800"
        }`}
      >
        Inactive
      </button>
    </div>
  );
}

function CollapsedPane({
  title,
  subtitle,
  children,
  defaultOpen = false,
  accordionId,
  accordionOpenId,
  onAccordionChange,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  accordionId?: TemplateSettingsPaneId;
  accordionOpenId?: TemplateSettingsPaneId | null;
  onAccordionChange?: (id: TemplateSettingsPaneId | null) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isAccordion = accordionId != null && onAccordionChange != null;
  const open = isAccordion ? accordionOpenId === accordionId : internalOpen;

  function toggle() {
    if (isAccordion) {
      onAccordionChange(open ? null : accordionId);
    } else {
      setInternalOpen((v) => !v);
    }
  }

  return (
    <div className="overflow-hidden rounded border-2 border-palm bg-white shadow-sm dark:border-zinc-600 dark:bg-zinc-900/55">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full cursor-pointer flex-wrap items-center justify-between gap-2 border-b border-palm/15 px-4 py-3 text-left font-bold text-palm hover:bg-surf/40 dark:border-zinc-700 dark:text-emerald-300"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span aria-hidden className="text-zinc-500 dark:text-zinc-400">
            {open ? "▼" : "▶"}
          </span>
          <span>{title}</span>
        </span>
        {subtitle ? (
          <span className="max-w-[12rem] truncate text-xs font-normal text-ink/60 dark:text-zinc-500">{subtitle}</span>
        ) : null}
      </button>
      {open ? <div className="p-4">{children}</div> : null}
    </div>
  );
}

function TemplateCard({
  row,
  startOpen = false,
  globalFinishOptions = [],
}: {
  row: LabelTemplateAdminRow;
  startOpen?: boolean;
  globalFinishOptions?: LabelFinishOptionAdminRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [paneOpen, setPaneOpen] = useState(startOpen);
  const [settingsPaneOpen, setSettingsPaneOpen] = useState<TemplateSettingsPaneId | null>(null);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const finishRef = useRef<LabelTemplateFinishSectionHandle>(null);

  const [name, setName] = useState(row.name);
  const [description, setDescription] = useState(row.description);
  const [active, setActive] = useState(row.active);
  const [sortOrder, setSortOrder] = useState(String(row.sortOrder));
  const [widthMm, setWidthMm] = useState(String(row.widthMm));
  const [heightMm, setHeightMm] = useState(String(row.heightMm));
  const [marginPx, setMarginPx] = useState(row.marginPx);
  const [maxElements, setMaxElements] = useState(String(row.maxElements));
  const [baseLayoutImageUrl, setBaseLayoutImageUrl] = useState(row.baseLayoutImageUrl);
  const [baseScale, setBaseScale] = useState(row.baseLayoutScalePercent);
  const [baseRot, setBaseRot] = useState(row.baseLayoutRotationDeg);
  const [baseOp, setBaseOp] = useState(row.baseLayoutOpacityPercent);
  const [baseOffX, setBaseOffX] = useState(row.baseLayoutOffsetXPx);
  const [baseOffY, setBaseOffY] = useState(row.baseLayoutOffsetYPx);
  const [borderConfig, setBorderConfig] = useState<LabelBorderConfig>(row.borderConfig);

  const [tierMinQty, setTierMinQty] = useState<string[]>(() => row.priceTiers.map((t) => String(t.minQty)));
  const [tierUsd, setTierUsd] = useState<string[]>(() => row.priceTiers.map((t) => centsToUsdInput(t.unitCents)));

  useEffect(() => {
    setName(row.name);
    setDescription(row.description);
    setActive(row.active);
    setSortOrder(String(row.sortOrder));
    setWidthMm(String(row.widthMm));
    setHeightMm(String(row.heightMm));
    setMarginPx(row.marginPx);
    setMaxElements(String(row.maxElements));
    setBaseLayoutImageUrl(row.baseLayoutImageUrl);
    setBaseScale(row.baseLayoutScalePercent);
    setBaseRot(row.baseLayoutRotationDeg);
    setBaseOp(row.baseLayoutOpacityPercent);
    setBaseOffX(row.baseLayoutOffsetXPx);
    setBaseOffY(row.baseLayoutOffsetYPx);
    setBorderConfig(row.borderConfig);
    setTierMinQty(row.priceTiers.map((t) => String(t.minQty)));
    setTierUsd(row.priceTiers.map((t) => centsToUsdInput(t.unitCents)));
  }, [row]);

  const wMm = Math.max(1, Number.parseInt(widthMm, 10) || 1);
  const hMm = Math.max(1, Number.parseInt(heightMm, 10) || 1);
  const { widthPx: cw, heightPx: ch } = labelCanvasPxFromMm(wMm, hMm);
  const gridAuto = autoGridStepPx(cw, ch, marginPx);
  const { widthPx: ew, heightPx: eh, inset } = editableRegionPx(cw, ch, marginPx);
  const offsetClampSpan = Math.max(cw, ch) * 4;

  const borderTextLimits = useMemo(
    () => borderTextOffsetLimits(cw, ch, borderConfig),
    [cw, ch, borderConfig],
  );

  const displayBorderConfig = useMemo(
    () => clampBorderConfigToCanvas(borderConfig, cw, ch),
    [borderConfig, cw, ch],
  );

  useEffect(() => {
    setBorderConfig((b) => {
      const clamped = clampBorderConfigToCanvas(b, cw, ch);
      if (clamped.textOffsetXPx === b.textOffsetXPx && clamped.textOffsetYPx === b.textOffsetYPx) return b;
      return clamped;
    });
  }, [cw, ch, borderConfig.insetPx, borderConfig.strokePx, borderConfig.bottomText, borderConfig.textPaddingPx]);

  function clampBaseOffset(x: number, y: number) {
    return {
      x: Math.min(offsetClampSpan, Math.max(-offsetClampSpan, Math.round(x))),
      y: Math.min(offsetClampSpan, Math.max(-offsetClampSpan, Math.round(y))),
    };
  }

  function buildPayload(): LabelTemplateAdminPayload | { error: string } {
    const tiers: LabelPriceTier[] = [];
    for (let i = 0; i < tierMinQty.length; i++) {
      const minQty = Math.max(1, Math.floor(Number(tierMinQty[i]) || 0));
      const c = parseUsdToCents(tierUsd[i] ?? "0");
      if (c === null) return { error: `Tier ${i + 1}: enter a valid price.` };
      tiers.push({ minQty, unitCents: c });
    }
    const w = Number.parseInt(widthMm, 10);
    const h = Number.parseInt(heightMm, 10);
    const mx = Number.parseInt(maxElements, 10);
    const so = Number.parseInt(sortOrder, 10);
    return {
      name,
      description,
      active,
      sortOrder: Number.isFinite(so) ? so : 0,
      widthMm: Number.isFinite(w) ? w : 0,
      heightMm: Number.isFinite(h) ? h : 0,
      marginPx,
      maxElements: Number.isFinite(mx) ? mx : 24,
      priceTiers: tiers,
      baseLayoutImageUrl,
      baseLayoutScalePercent: baseScale,
      baseLayoutRotationDeg: baseRot,
      baseLayoutOpacityPercent: baseOp,
      baseLayoutOffsetXPx: baseOffX,
      baseLayoutOffsetYPx: baseOffY,
      borderConfig,
    };
  }

  function applyActive(next: boolean) {
    setMsg("");
    startTransition(async () => {
      const r = await adminSetLabelTemplateActive(row.id, next);
      if (!r.ok) {
        setMsg(r.error);
        return;
      }
      setActive(next);
      setMsg(next ? "Template is active on the Labels page." : "Template is inactive.");
      router.refresh();
    });
  }

  function save() {
    setMsg("");
    const payload = buildPayload();
    if ("error" in payload) {
      setMsg(payload.error);
      return;
    }
    const finishLinks = finishRef.current?.validateAndGetLinks();
    if (typeof finishLinks === "string") {
      setMsg(finishLinks);
      return;
    }
    startTransition(async () => {
      const r = await adminUpdateLabelTemplate(row.id, payload);
      if (!r.ok) {
        setMsg(r.error);
        return;
      }
      if (finishLinks) {
        const fr = await adminSetTemplateFinishOptions(row.id, finishLinks);
        if (!fr.ok) {
          setMsg(fr.error);
          return;
        }
      }
      setMsg("Saved.");
      setPaneOpen(false);
      router.refresh();
    });
  }

  function del() {
    if (!confirm(`Delete label template “${name.replace(/"/g, "'") || row.id.slice(0, 8)}”?`)) return;
    setMsg("");
    startTransition(async () => {
      const r = await adminDeleteLabelTemplate(row.id);
      setMsg(r.ok ? "" : r.error);
      if (r.ok) router.refresh();
    });
  }

  function addTier() {
    setTierMinQty((a) => [...a, "1"]);
    setTierUsd((a) => [...a, "1.00"]);
  }

  function removeTier(index: number) {
    setTierMinQty((a) => a.filter((_, i) => i !== index));
    setTierUsd((a) => a.filter((_, i) => i !== index));
  }

  function pickFile() {
    fileRef.current?.click();
  }

  function resetBaseLayoutTransform() {
    setBaseScale(BASE_LAYOUT_DEFAULT_SCALE);
    setBaseRot(BASE_LAYOUT_DEFAULT_ROTATION);
    setBaseOp(BASE_LAYOUT_DEFAULT_OPACITY);
    setBaseOffX(BASE_LAYOUT_DEFAULT_OFFSET_X);
    setBaseOffY(BASE_LAYOUT_DEFAULT_OFFSET_Y);
  }

  const baseLayoutPaneOpen = settingsPaneOpen === "base";

  const baseLayoutAtDefaults =
    baseScale === BASE_LAYOUT_DEFAULT_SCALE &&
    baseRot === BASE_LAYOUT_DEFAULT_ROTATION &&
    baseOp === BASE_LAYOUT_DEFAULT_OPACITY &&
    baseOffX === BASE_LAYOUT_DEFAULT_OFFSET_X &&
    baseOffY === BASE_LAYOUT_DEFAULT_OFFSET_Y;

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setMsg("");
    const fd = new FormData();
    fd.set("file", f);
    startTransition(async () => {
      const r = await uploadLabelTemplateBaseLayout(row.id, fd);
      setMsg(r.ok ? "Image uploaded — save again if you changed other fields." : r.error);
      if (r.ok) {
        setBaseLayoutImageUrl(r.url);
        router.refresh();
      }
    });
  }

  const previewPayload = buildPayload();
  const previewTiers = "error" in previewPayload ? row.priceTiers : previewPayload.priceTiers;
  const preview1 = unitCentsForLabelQuantity(previewTiers, 1);
  const preview10 = unitCentsForLabelQuantity(previewTiers, 10);
  const preview50 = unitCentsForLabelQuantity(previewTiers, 50);

  const fieldClass =
    "border-2 border-palm/25 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100";

  return (
    <div className="rounded border border-palm/25 bg-white/95 shadow-sm dark:border-zinc-600 dark:bg-zinc-900/40 [&_summary]:list-none [&_summary::-webkit-details-marker]:hidden">
      <details
        open={paneOpen}
        onToggle={(e) => {
          const outer = e.currentTarget as HTMLDetailsElement;
          if (e.target !== outer) return;
          setPaneOpen(outer.open);
        }}
        className="rounded"
      >
        <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-black/[0.03] dark:hover:bg-white/5">
          <span className="flex min-w-0 flex-wrap items-center gap-2 font-bold text-ink dark:text-zinc-100">
            <span aria-hidden className="text-zinc-500 dark:text-zinc-400">{paneOpen ? "▼" : "▶"}</span>
            <span className="truncate">{name.trim() ? name : "Untitled"}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="hidden text-xs font-medium text-ink/70 sm:inline dark:text-zinc-400">
              {wMm}×{hMm} mm · {tierSummary(row.priceTiers)}
            </span>
            <ActiveInactiveRocker active={active} pending={pending} onActive={applyActive} />
          </span>
        </summary>
        <div className="grid gap-4 border-t border-palm/20 px-4 pb-4 pt-4 dark:border-zinc-600">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-black uppercase tracking-wide text-palm dark:text-emerald-300">Name</span>
            <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} disabled={pending} />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-black uppercase tracking-wide text-palm dark:text-emerald-300">
              Description / notes
            </span>
            <textarea
              rows={3}
              className={fieldClass}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={pending}
            />
          </label>

          <TemplateEditorStickyPreview
            enabled={paneOpen}
            preview={
              <LabelTemplatePreview
                widthMm={wMm}
                heightMm={hMm}
                widthMmInput={widthMm}
                heightMmInput={heightMm}
                onWidthMmChange={setWidthMm}
                onHeightMmChange={setHeightMm}
                sizeFieldsDisabled={pending}
                canvasWidthPx={cw}
                canvasHeightPx={ch}
                marginPx={marginPx}
                baseLayoutImageUrl={baseLayoutImageUrl}
                baseLayoutScalePercent={baseScale}
                baseLayoutRotationDeg={baseRot}
                baseLayoutOpacityPercent={baseOp}
                baseLayoutOffsetXPx={baseOffX}
                baseLayoutOffsetYPx={baseOffY}
                baseLayoutDragEnabled={baseLayoutPaneOpen}
                onBaseOffsetChange={
                  baseLayoutPaneOpen
                    ? (x, y) => {
                        const c = clampBaseOffset(x, y);
                        setBaseOffX(c.x);
                        setBaseOffY(c.y);
                      }
                    : undefined
                }
                borderConfig={displayBorderConfig}
              />
            }
          >
          <CollapsedPane
            title="Non-editable margin (design px)"
            subtitle={`${marginPx}px · ${ew}×${eh}px editable`}
            accordionId="margin"
            accordionOpenId={settingsPaneOpen}
            onAccordionChange={setSettingsPaneOpen}
          >
            <label className="flex flex-col gap-2">
              <span className="text-xs font-black uppercase tracking-wide text-palm dark:text-emerald-300">
                Margin: {marginPx}px
              </span>
              <input
                type="range"
                min={0}
                max={128}
                step={1}
                value={marginPx}
                onChange={(e) => setMarginPx(Number(e.target.value))}
                disabled={pending}
                className="w-full accent-palm"
              />
              <p className="text-[11px] text-ink/65 dark:text-zinc-400">
                Customers cannot place fields in this inset — red dashed preview shows the editable zone ({ew}×{eh}px at{" "}
                {LABEL_TEMPLATE_DESIGN_DPI} DPI, inset {inset}px).
              </p>
            </label>
            <div className="mt-4 border-t border-palm/15 pt-4 dark:border-zinc-700">
              <p className="font-bold text-palm dark:text-emerald-300">Editor canvas (automatic)</p>
              <p className="mt-1 font-mono text-sm text-ink/85 dark:text-zinc-300">
                {cw} × {ch} px @ {LABEL_TEMPLATE_DESIGN_DPI} DPI
              </p>
              <p className="mt-1 text-xs text-ink/65 dark:text-zinc-400">
                Snap grid auto: <strong>{gridAuto}px</strong> (saved when you click Save changes).
              </p>
            </div>
          </CollapsedPane>

          <CollapsedPane
            title="Base layout image"
            subtitle={baseLayoutImageUrl ? "Image set" : "None"}
            accordionId="base"
            accordionOpenId={settingsPaneOpen}
            onAccordionChange={setSettingsPaneOpen}
          >
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={pickFile}
                className={btnSecondarySm}
              >
                Upload image
              </button>
              {baseLayoutImageUrl ? (
                <button
                  type="button"
                  disabled={pending}
                  className="text-xs font-bold text-coral underline"
                  onClick={() => setBaseLayoutImageUrl("")}
                >
                  Remove from preview (save to persist)
                </button>
              ) : null}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase text-ink/55">Zoom {baseScale}%</span>
                <input
                  type="range"
                  min={50}
                  max={300}
                  value={baseScale}
                  onChange={(e) => setBaseScale(Number(e.target.value))}
                  disabled={pending}
                  className="accent-palm"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase text-ink/55">Rotate {baseRot}°</span>
                <input
                  type="range"
                  min={-180}
                  max={180}
                  value={baseRot}
                  onChange={(e) => setBaseRot(Number(e.target.value))}
                  disabled={pending}
                  className="accent-palm"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase text-ink/55">Opacity {baseOp}%</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={baseOp}
                  onChange={(e) => setBaseOp(Number(e.target.value))}
                  disabled={pending}
                  className="accent-palm"
                />
              </label>
            </div>
            <button
              type="button"
              disabled={pending || baseLayoutAtDefaults}
              onClick={resetBaseLayoutTransform}
              className={`mt-3 ${btnSecondarySm} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              Reset zoom, rotate, opacity & position
            </button>
          </CollapsedPane>

          <CollapsedPane
            title="Boarder Settings"
            subtitle={borderConfig.mode === "none" ? "None" : borderConfig.mode}
            accordionId="border"
            accordionOpenId={settingsPaneOpen}
            onAccordionChange={setSettingsPaneOpen}
          >
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase text-ink/55">Style</span>
              <select
                className={fieldClass}
                value={borderConfig.mode}
                onChange={(e) =>
                  setBorderConfig((b) => ({
                    ...b,
                    mode: e.target.value as LabelBorderConfig["mode"],
                  }))
                }
                disabled={pending}
              >
                <option value="none">None</option>
                <option value="solid">Solid rectangle</option>
                <option value="solid_with_bottom_text">Rectangle with edge text</option>
              </select>
            </label>
            {borderConfig.mode !== "none" ? (
              <div className="mt-3 space-y-3">
                <label className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold uppercase text-ink/55 dark:text-zinc-500">
                    Border inset from outer edge (design px): {borderConfig.insetPx}px
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={128}
                    step={1}
                    value={borderConfig.insetPx}
                    onChange={(e) =>
                      setBorderConfig((b) => ({ ...b, insetPx: Number.parseInt(e.target.value, 10) || 0 }))
                    }
                    disabled={pending}
                    className="w-full accent-palm"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase text-ink/55">Stroke (design px)</span>
                    <input
                      type="number"
                      min={1}
                      max={64}
                      className={fieldClass}
                      value={borderConfig.strokePx}
                      onChange={(e) =>
                        setBorderConfig((b) => ({ ...b, strokePx: Number.parseInt(e.target.value, 10) || 1 }))
                      }
                      disabled={pending}
                    />
                  </label>
                  <label className="flex flex-col gap-1 sm:col-span-2">
                    <span className="text-[10px] font-bold uppercase text-ink/55">Border color</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        className="h-9 w-12 shrink-0 cursor-pointer border border-palm/25 dark:border-zinc-600"
                        value={colorInputValue(borderConfig.color)}
                        onChange={(e) => setBorderConfig((b) => ({ ...b, color: e.target.value }))}
                        disabled={pending}
                      />
                      <input
                        type="text"
                        className={`${fieldClass} min-w-0 flex-1`}
                        value={borderConfig.color}
                        onChange={(e) => setBorderConfig((b) => ({ ...b, color: e.target.value }))}
                        disabled={pending}
                        placeholder="#1b4332"
                      />
                    </div>
                  </label>
                </div>
                {borderConfig.mode === "solid_with_bottom_text" ? (
                  <>
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold uppercase text-ink/55">Edge text color</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          className="h-9 w-12 shrink-0 cursor-pointer border border-palm/25 dark:border-zinc-600"
                          value={colorInputValue(borderConfig.textColor || borderConfig.color)}
                          onChange={(e) => setBorderConfig((b) => ({ ...b, textColor: e.target.value }))}
                          disabled={pending}
                        />
                        <input
                          type="text"
                          className={`${fieldClass} min-w-0 flex-1`}
                          value={borderConfig.textColor}
                          onChange={(e) => setBorderConfig((b) => ({ ...b, textColor: e.target.value }))}
                          disabled={pending}
                          placeholder="Same as border"
                        />
                      </div>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold uppercase text-ink/55">Edge text</span>
                      <input
                        type="text"
                        className={fieldClass}
                        value={borderConfig.bottomText}
                        onChange={(e) => setBorderConfig((b) => ({ ...b, bottomText: e.target.value }))}
                        placeholder="7thLeg.com"
                        disabled={pending}
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold uppercase text-ink/55">Text placement</span>
                      <select
                        className={fieldClass}
                        value={borderConfig.textPlacement}
                        onChange={(e) =>
                          setBorderConfig((b) => ({
                            ...b,
                            textPlacement: e.target.value as LabelBorderConfig["textPlacement"],
                          }))
                        }
                        disabled={pending}
                      >
                        <option value="top">Top</option>
                        <option value="bottom">Bottom</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="text-[10px] font-bold uppercase text-ink/55 dark:text-zinc-500">
                        Text padding: {borderConfig.textPaddingPx}px
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={48}
                        step={1}
                        value={borderConfig.textPaddingPx}
                        onChange={(e) =>
                          setBorderConfig((b) => ({
                            ...b,
                            textPaddingPx: Number.parseInt(e.target.value, 10) || 0,
                          }))
                        }
                        disabled={pending}
                        className="w-full accent-palm"
                      />
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="text-[10px] font-bold uppercase text-ink/55 dark:text-zinc-500">
                        Left / right: {borderConfig.textOffsetXPx}px (±{borderTextLimits.maxX})
                      </span>
                      <input
                        type="range"
                        min={-borderTextLimits.maxX}
                        max={borderTextLimits.maxX}
                        step={1}
                        value={borderConfig.textOffsetXPx}
                        onChange={(e) =>
                          setBorderConfig((b) => ({
                            ...b,
                            textOffsetXPx: Number.parseInt(e.target.value, 10) || 0,
                          }))
                        }
                        disabled={pending}
                        className="w-full accent-palm"
                      />
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="text-[10px] font-bold uppercase text-ink/55 dark:text-zinc-500">
                        Up / down: {borderConfig.textOffsetYPx}px (±{borderTextLimits.maxY})
                      </span>
                      <input
                        type="range"
                        min={-borderTextLimits.maxY}
                        max={borderTextLimits.maxY}
                        step={1}
                        value={borderConfig.textOffsetYPx}
                        onChange={(e) =>
                          setBorderConfig((b) => ({
                            ...b,
                            textOffsetYPx: Number.parseInt(e.target.value, 10) || 0,
                          }))
                        }
                        disabled={pending}
                        className="w-full accent-palm"
                      />
                    </label>
                  </>
                ) : null}
              </div>
            ) : null}
          </CollapsedPane>

          <CollapsedPane
            title="Max elements"
            subtitle={`Limit ${maxElements} · order ${sortOrder}`}
            accordionId="maxElements"
            accordionOpenId={settingsPaneOpen}
            onAccordionChange={setSettingsPaneOpen}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-black uppercase tracking-wide text-palm dark:text-emerald-300">
                  Max elements
                </span>
                <input
                  type="number"
                  min={1}
                  className={fieldClass}
                  value={maxElements}
                  onChange={(e) => setMaxElements(e.target.value)}
                  disabled={pending}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-black uppercase tracking-wide text-palm dark:text-emerald-300">
                  Customer dropdown order
                </span>
                <input
                  type="number"
                  className={fieldClass}
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  disabled={pending}
                  title="Lower numbers appear first in the customer template list on /labels"
                />
              </label>
            </div>
          </CollapsedPane>

          <CollapsedPane title="Pricing" subtitle={tierSummary(previewTiers)} defaultOpen={true}>
            <p className="text-xs text-ink/65 dark:text-zinc-400">
              Minimum quantity (inclusive) → USD per label. Higher tiers override for larger quantities.
            </p>
            <ul className="mt-2 space-y-2">
              {tierMinQty.map((mq, i) => (
                <li key={i} className="flex flex-wrap items-end gap-2">
                  <label className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold uppercase text-ink/55">Min qty</span>
                    <input
                      type="number"
                      min={1}
                      className={`${fieldClass} w-24`}
                      value={mq}
                      onChange={(e) =>
                        setTierMinQty((arr) => {
                          const next = [...arr];
                          next[i] = e.target.value;
                          return next;
                        })
                      }
                      disabled={pending}
                    />
                  </label>
                  <label className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold uppercase text-ink/55">Per label (USD)</span>
                    <input
                      inputMode="decimal"
                      className={`${fieldClass} w-28`}
                      value={tierUsd[i] ?? ""}
                      onChange={(e) =>
                        setTierUsd((arr) => {
                          const next = [...arr];
                          next[i] = e.target.value;
                          return next;
                        })
                      }
                      disabled={pending}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={pending || tierMinQty.length <= 1}
                    className="mb-0.5 text-xs font-bold text-coral underline disabled:opacity-40"
                    onClick={() => removeTier(i)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled={pending || tierMinQty.length >= 12}
              className="mt-2 text-xs font-bold text-lagoon-dark underline dark:text-emerald-300"
              onClick={addTier}
            >
              + Add tier
            </button>
            <p className="mt-2 text-xs text-ink/70 dark:text-zinc-400">
              Preview: qty 1 → {formatPriceUsd(preview1)} · qty 10 → {formatPriceUsd(preview10)} · qty 50 →{" "}
              {formatPriceUsd(preview50)}
            </p>
          </CollapsedPane>

          <LabelTemplateFinishSection ref={finishRef} templateId={row.id} globalOptions={globalFinishOptions} />

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={pending}
              className={btnSecondaryMd}
              onClick={save}
            >
              Save changes
            </button>
            <button
              type="button"
              disabled={pending}
              className={`${btnImportantLink} disabled:opacity-50`}
              onClick={del}
            >
              Delete template
            </button>
          </div>
          {msg ? <p className="text-xs text-ink/80 dark:text-zinc-400">{msg}</p> : null}
          <p className="font-mono text-[10px] text-ink/45 dark:text-zinc-600">{row.id}</p>
          </TemplateEditorStickyPreview>
        </div>
      </details>
    </div>
  );
}

type TemplateListSort = "sort_asc" | "name_asc" | "name_desc" | "active_first" | "size_desc";

function AddTemplateControl() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");

  function add() {
    setMsg("");
    startTransition(async () => {
      const r = await adminCreateLabelTemplate();
      setMsg(r.ok ? "" : r.error);
      if (r.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        className={`border-dashed ${btnSecondaryMd}`}
        onClick={add}
      >
        {pending ? "Creating…" : "+ Add label template"}
      </button>
      {msg ? <p className="text-xs text-coral">{msg}</p> : null}
    </div>
  );
}

export function LabelTemplatesEditor({
  initial,
  globalFinishOptions = [],
}: {
  initial: LabelTemplateAdminRow[];
  globalFinishOptions?: LabelFinishOptionAdminRow[];
}) {
  const [search, setSearch] = useState("");
  const [listSort, setListSort] = useState<TemplateListSort>("sort_asc");
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = initial;
    if (q) {
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          `${t.widthMm}x${t.heightMm}`.includes(q),
      );
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (listSort) {
        case "name_asc":
          return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        case "name_desc":
          return b.name.localeCompare(a.name, undefined, { sensitivity: "base" });
        case "active_first":
          if (a.active !== b.active) return a.active ? -1 : 1;
          return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
        case "size_desc":
          return b.widthMm * b.heightMm - a.widthMm * a.heightMm;
        case "sort_asc":
        default:
          return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
      }
    });
    return sorted;
  }, [initial, search, listSort]);

  const editingRow = editingId ? initial.find((r) => r.id === editingId) : null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink/80 dark:text-zinc-400">
        Set print size (mm), margin, base artwork, borders, and pricing. Canvas pixels and snap grid use{" "}
        {LABEL_TEMPLATE_DESIGN_DPI} DPI. Click <strong>Edit</strong> to open the full template editor.{" "}
        <strong>Sort order</strong> controls the customer template dropdown on{" "}
        <code className="text-xs">/labels</code> (lower numbers appear first).
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="block min-w-[12rem] flex-1 text-xs font-bold text-ink dark:text-zinc-200">
          Search templates
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, notes, size…"
            className="mt-1 w-full border-2 border-palm/30 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>
        <label className="block min-w-[10rem] text-xs font-bold text-ink dark:text-zinc-200">
          Sort
          <select
            value={listSort}
            onChange={(e) => setListSort(e.target.value as TemplateListSort)}
            className="mt-1 w-full border-2 border-palm/30 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value="sort_asc">Sort order</option>
            <option value="name_asc">Name A–Z</option>
            <option value="name_desc">Name Z–A</option>
            <option value="active_first">Active first</option>
            <option value="size_desc">Largest size</option>
          </select>
        </label>
      </div>

      <div className="admin-table-shell max-h-[min(24rem,50vh)] overflow-auto rounded border border-palm/25 bg-white shadow-sm dark:border-zinc-600 dark:bg-zinc-900/40">
        <table className="admin-striped w-full min-w-[640px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-palm/10 dark:bg-zinc-800/95">
            <tr className="border-b-2 border-palm/30">
              <th className="px-3 py-2 text-xs font-bold text-palm">Name</th>
              <th className="px-3 py-2 text-xs font-bold text-palm">Size</th>
              <th className="px-3 py-2 text-xs font-bold text-palm" title="Customer dropdown order (lower = first)">
                Customer order
              </th>
              <th className="px-3 py-2 text-xs font-bold text-palm">Status</th>
              <th className="px-3 py-2 text-xs font-bold text-palm">Pricing</th>
              <th className="px-3 py-2 text-xs font-bold text-palm" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-ink/60">
                  {initial.length === 0 ? "No templates yet — add one below." : "No templates match your search."}
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-palm/15 ${editingId === row.id ? "bg-palm/10 dark:bg-emerald-950/40" : ""}`}
                >
                  <td className="px-3 py-2 font-bold text-ink dark:text-zinc-100">
                    {row.name.trim() || "Untitled"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-ink/85">
                    {row.widthMm}×{row.heightMm} mm
                  </td>
                  <td className="px-3 py-2">
                    <LabelTemplateSortCell templateId={row.id} sortOrder={row.sortOrder} />
                  </td>
                  <td className="px-3 py-2">
                    {row.active ? (
                      <span className="text-xs font-bold text-palm dark:text-emerald-300">Active</span>
                    ) : (
                      <span className="text-xs font-bold text-ink/50">Inactive</span>
                    )}
                  </td>
                  <td className="max-w-[14rem] truncate px-3 py-2 text-xs text-ink/75" title={tierSummary(row.priceTiers)}>
                    {tierSummary(row.priceTiers)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <Link
                      href={`/settings/labels/templates/${row.id}/layout`}
                      className="mr-2 text-xs font-bold text-palm underline dark:text-emerald-300"
                    >
                      Layout
                    </Link>
                    <button
                      type="button"
                      onClick={() => setEditingId((id) => (id === row.id ? null : row.id))}
                      className="text-xs font-bold text-lagoon-dark underline dark:text-emerald-300"
                    >
                      {editingId === row.id ? "Close" : "Edit"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-ink/55 dark:text-zinc-500">
        Showing {filtered.length} of {initial.length} template{initial.length === 1 ? "" : "s"}.
      </p>

      {editingRow ? (
        <div className="pt-2">
          <TemplateCard
            key={editingRow.id}
            row={editingRow}
            startOpen
            globalFinishOptions={globalFinishOptions}
          />
        </div>
      ) : null}

      <AddTemplateControl />
    </div>
  );
}
