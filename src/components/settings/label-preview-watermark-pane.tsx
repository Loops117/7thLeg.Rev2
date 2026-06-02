"use client";

import Link from "next/link";
import { btnSecondaryMd } from "@/lib/btn-theme-classes";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  updateLabelPreviewSettings,
  uploadLabelPreviewWatermark,
} from "@/app/actions/site-config-admin";
import { ProductDiagonalBrandOverlay } from "@/components/store/product-diagonal-brand-overlay";
import {
  labelPreviewProtectionClassNames,
  labelWatermarkImageStyle,
  labelWatermarkTextStyle,
  resolveLabelPreviewWatermarkImageUrl,
} from "@/lib/label-preview-watermark";
import {
  LABEL_PREVIEW_WATERMARK_KINDS,
  WATERMARK_PLACEMENTS,
  type LabelPreviewWatermarkAdminPayload,
  type LabelPreviewWatermarkKind,
  type WatermarkPlacement,
} from "@/lib/site-config-types";

const fieldClass =
  "mt-1 w-full border-2 border-palm/30 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100";

function placementLabel(p: WatermarkPlacement): string {
  switch (p) {
    case "bottomRight":
      return "Bottom right";
    case "bottomLeft":
      return "Bottom left";
    case "topRight":
      return "Top right";
    case "topLeft":
      return "Top left";
    case "center":
      return "Center";
    case "stretch":
      return "Stretch to fit";
    default:
      return p;
  }
}

function watermarkKindSummary(kind: LabelPreviewWatermarkKind): string {
  switch (kind) {
    case "global":
      return "Global image";
    case "custom":
      return "Custom image";
    case "text":
      return "Text";
    case "off":
      return "Off";
    default:
      return kind;
  }
}

export function LabelPreviewWatermarkPane({ initial }: { initial: LabelPreviewWatermarkAdminPayload }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [settings, setSettings] = useState(initial.settings);
  const [msg, setMsg] = useState("");
  const { global } = initial;

  const showDiagonal =
    settings.matchDiagonalBrand && global.productDiagonalBrandOverlay && global.companyName.trim().length > 0;

  const imageUrl = resolveLabelPreviewWatermarkImageUrl(
    settings.watermarkKind,
    global.watermarkImageUrl,
    settings.watermarkImageUrl,
  );
  const showImageWatermark =
    (settings.watermarkKind === "global" || settings.watermarkKind === "custom") && !!imageUrl;
  const showTextWatermark = settings.watermarkKind === "text" && settings.watermarkText.trim().length > 0;

  const watermarkImageStyle = useMemo(
    () =>
      labelWatermarkImageStyle(
        settings.watermarkPlacement,
        settings.watermarkOpacityPercent,
        settings.watermarkScalePercent,
      ),
    [settings.watermarkPlacement, settings.watermarkOpacityPercent, settings.watermarkScalePercent],
  );

  const watermarkTextStyle = useMemo(
    () =>
      labelWatermarkTextStyle(
        settings.watermarkPlacement,
        settings.watermarkOpacityPercent,
        settings.watermarkScalePercent,
      ),
    [settings.watermarkPlacement, settings.watermarkOpacityPercent, settings.watermarkScalePercent],
  );

  const protectionClass = labelPreviewProtectionClassNames(settings.protectPreviewInteraction);

  const showWatermarkControls = settings.watermarkKind !== "off";

  function save() {
    setMsg("");
    startTransition(async () => {
      const r = await updateLabelPreviewSettings({
        ...settings,
        matchProductWatermark: settings.watermarkKind === "global",
      });
      if (!r.ok) {
        setMsg(r.error);
        return;
      }
      setMsg("Preview & watermark settings saved.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink/85 dark:text-zinc-300">
        Control customer-facing label preview overlays. Use the Global product watermark, upload a label-only image, or
        enter custom text. Opacity and zoom apply to whichever image or text watermark you choose. Production print files
        stay separate when enabled below.
      </p>

      <section className="rounded border border-palm/25 bg-surf/30 p-4 dark:border-zinc-600 dark:bg-zinc-900/40">
        <h3 className="text-xs font-black uppercase tracking-wide text-palm dark:text-emerald-300">Preview watermark</h3>

        <fieldset className="mt-3 space-y-2">
          <legend className="sr-only">Watermark type</legend>
          {LABEL_PREVIEW_WATERMARK_KINDS.map((kind) => (
            <label
              key={kind}
              className="flex cursor-pointer items-start gap-3 rounded border border-transparent px-1 py-1 text-sm text-ink hover:border-palm/20 dark:text-zinc-200"
            >
              <input
                type="radio"
                name="labelPreviewWatermarkKind"
                className="mt-1 h-4 w-4 accent-palm"
                checked={settings.watermarkKind === kind}
                disabled={pending}
                onChange={() =>
                  setSettings((s) => ({
                    ...s,
                    watermarkKind: kind,
                    matchProductWatermark: kind === "global",
                  }))
                }
              />
              <span>
                {kind === "global" ? (
                  <>
                    <strong>Global product watermark</strong> — same file as{" "}
                    <Link href="/settings/global" className="font-bold text-lagoon-dark underline dark:text-emerald-300">
                      Global settings
                    </Link>
                    {!global.watermarkImageUrl.trim() ? (
                      <span className="mt-1 block text-xs text-coral">No watermark file in Global yet.</span>
                    ) : null}
                  </>
                ) : kind === "custom" ? (
                  <>
                    <strong>Label-only image</strong> — upload a watermark used only on label previews (not product
                    photos).
                  </>
                ) : kind === "text" ? (
                  <>
                    <strong>Text watermark</strong> — your own phrase (e.g. “This is a preview”).
                  </>
                ) : (
                  <strong>No image or text watermark</strong>
                )}
              </span>
            </label>
          ))}
        </fieldset>

        {settings.watermarkKind === "custom" ? (
          <div className="mt-4 rounded border border-palm/20 bg-white/60 p-3 dark:border-zinc-600 dark:bg-zinc-950/40">
            <p className="text-xs font-bold uppercase text-ink/55">Label watermark file</p>
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <label className="text-sm font-bold text-ink dark:text-zinc-200">
                Upload image
                <input
                  type="file"
                  accept="image/png,image/webp,image/jpeg,image/gif"
                  disabled={pending}
                  className="mt-1 block text-sm"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    setMsg("");
                    startTransition(async () => {
                      const fd = new FormData();
                      fd.set("file", file);
                      const r = await uploadLabelPreviewWatermark(fd);
                      if (!r.ok) {
                        setMsg(r.error);
                        return;
                      }
                      setSettings((s) => ({
                        ...s,
                        watermarkKind: "custom",
                        watermarkImageUrl: r.url,
                        matchProductWatermark: false,
                      }));
                      setMsg("Label watermark uploaded. Save to persist placement and opacity.");
                      router.refresh();
                    });
                  }}
                />
              </label>
              {settings.watermarkImageUrl ? (
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={settings.watermarkImageUrl}
                    alt="Label watermark"
                    className="h-14 w-auto max-w-[120px] rounded border border-palm/30 bg-surf/50 object-contain p-1"
                  />
                  <button
                    type="button"
                    disabled={pending}
                    className="text-xs font-bold text-coral underline"
                    onClick={() =>
                      setSettings((s) => ({
                        ...s,
                        watermarkImageUrl: "",
                      }))
                    }
                  >
                    Clear file
                  </button>
                </div>
              ) : (
                <p className="text-xs text-ink/55">No label watermark uploaded yet.</p>
              )}
            </div>
          </div>
        ) : null}

        {settings.watermarkKind === "text" ? (
          <label className="mt-4 block text-xs font-bold uppercase text-ink/55">
            Watermark text
            <input
              type="text"
              maxLength={120}
              className={fieldClass}
              value={settings.watermarkText}
              onChange={(e) => setSettings((s) => ({ ...s, watermarkText: e.target.value }))}
              disabled={pending}
              placeholder="This is a preview"
            />
          </label>
        ) : null}

        {showWatermarkControls ? (
          <div className="mt-4 grid gap-4 border-t border-palm/15 pt-4 dark:border-zinc-700 sm:grid-cols-2">
            <label className="block text-xs font-bold uppercase text-ink/55 sm:col-span-2">
              Placement
              <select
                className={fieldClass}
                value={settings.watermarkPlacement}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    watermarkPlacement: e.target.value as WatermarkPlacement,
                  }))
                }
                disabled={pending}
              >
                {WATERMARK_PLACEMENTS.map((p) => (
                  <option key={p} value={p}>
                    {placementLabel(p)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-bold uppercase text-ink/55">
              Opacity ({settings.watermarkOpacityPercent}%)
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                className="mt-2 w-full accent-palm"
                value={settings.watermarkOpacityPercent}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    watermarkOpacityPercent: Number(e.target.value),
                  }))
                }
                disabled={pending}
              />
            </label>
            <label className="block text-xs font-bold uppercase text-ink/55">
              Zoom ({settings.watermarkScalePercent}%)
              <input
                type="range"
                min={25}
                max={300}
                step={5}
                className="mt-2 w-full accent-palm"
                value={settings.watermarkScalePercent}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    watermarkScalePercent: Number(e.target.value),
                  }))
                }
                disabled={pending}
              />
            </label>
          </div>
        ) : null}
      </section>

      <section className="rounded border border-palm/25 bg-surf/30 p-4 dark:border-zinc-600 dark:bg-zinc-900/40">
        <h3 className="text-xs font-black uppercase tracking-wide text-palm dark:text-emerald-300">
          Other preview options
        </h3>
        <div className="mt-3 space-y-3">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-ink dark:text-zinc-200">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-palm"
              checked={settings.matchDiagonalBrand}
              onChange={(e) => setSettings((s) => ({ ...s, matchDiagonalBrand: e.target.checked }))}
              disabled={pending}
            />
            <span>
              <strong>Match diagonal store-name band</strong> — when Global has diagonal branding enabled, show it on
              label previews too.
              {!global.productDiagonalBrandOverlay ? (
                <span className="mt-1 block text-xs text-ink/55">Diagonal overlay is off in Global.</span>
              ) : null}
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-ink dark:text-zinc-200">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-palm"
              checked={settings.protectPreviewInteraction}
              onChange={(e) => setSettings((s) => ({ ...s, protectPreviewInteraction: e.target.checked }))}
              disabled={pending}
            />
            <span>
              <strong>Protect preview surface</strong> — discourage selection and image grab on the customer preview.
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-ink dark:text-zinc-200">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-palm"
              checked={settings.productionUnwatermarked}
              onChange={(e) => setSettings((s) => ({ ...s, productionUnwatermarked: e.target.checked }))}
              disabled={pending}
            />
            <span>
              <strong>Production assets without watermark</strong> — print/export for fulfillment never uses preview
              overlays (recommended).
            </span>
          </label>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={save}
          className={`mt-4 ${btnSecondaryMd}`}
        >
          Save preview settings
        </button>
        {msg ? (
          <p className="mt-2 text-sm text-ink/85 dark:text-zinc-300" role="status">
            {msg}
          </p>
        ) : null}
      </section>

      <section className="rounded border border-palm/25 bg-white p-4 dark:border-zinc-600 dark:bg-zinc-950/50">
        <h3 className="text-xs font-black uppercase tracking-wide text-palm dark:text-emerald-300">
          Live preview mock
        </h3>
        <p className="mt-1 text-xs text-ink/65 dark:text-zinc-400">
          {watermarkKindSummary(settings.watermarkKind)}
          {showWatermarkControls
            ? ` · ${settings.watermarkPlacement} · ${settings.watermarkOpacityPercent}% opacity · ${settings.watermarkScalePercent}% zoom`
            : ""}
        </p>

        <div className="mt-4 flex flex-wrap gap-6">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-ink/50">Customer preview</p>
            <div
              className={`relative mx-auto aspect-[5/3] w-full max-w-[280px] overflow-hidden rounded border-2 border-palm/30 bg-zinc-100 dark:bg-zinc-900 ${protectionClass}`}
              onContextMenu={settings.protectPreviewInteraction ? (e) => e.preventDefault() : undefined}
            >
              <div className="absolute inset-[12%] border border-dashed border-red-500/70" aria-hidden />
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                <p className="text-xs font-medium text-ink/40 dark:text-zinc-500">Sample label artwork</p>
              </div>
              {showDiagonal ? (
                <ProductDiagonalBrandOverlay
                  brandName={global.companyName}
                  spacingPx={global.productDiagonalNameGapPx}
                  opacityPercent={global.watermarkOpacityPercent}
                />
              ) : null}
              {showImageWatermark && imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="" style={watermarkImageStyle} />
              ) : null}
              {showTextWatermark ? (
                <div className="absolute inset-0 overflow-hidden" aria-hidden>
                  <p style={watermarkTextStyle}>{settings.watermarkText.trim()}</p>
                </div>
              ) : null}
            </div>
            {settings.protectPreviewInteraction ? (
              <p className="mt-1 text-[10px] text-ink/50">Protected — try selecting or right-clicking the mock.</p>
            ) : null}
          </div>

          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-ink/50">Production print</p>
            <div className="relative mx-auto aspect-[5/3] w-full max-w-[280px] overflow-hidden rounded border-2 border-palm/30 bg-white dark:bg-zinc-950">
              <div className="absolute inset-[12%] border border-dashed border-red-500/40" aria-hidden />
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                <p className="text-xs font-medium text-ink/55 dark:text-zinc-400">Clean print file</p>
              </div>
            </div>
            <p className="mt-1 text-[10px] text-ink/50">
              {settings.productionUnwatermarked
                ? "No watermark on fulfillment output."
                : "Would include preview overlays if production option is off."}
            </p>
          </div>
        </div>

        <dl className="mt-4 grid gap-2 border-t border-palm/15 pt-4 text-xs dark:border-zinc-700 sm:grid-cols-2">
          <div>
            <dt className="font-bold text-ink/55">Watermark mode</dt>
            <dd className="text-ink/80">{watermarkKindSummary(settings.watermarkKind)}</dd>
          </div>
          <div>
            <dt className="font-bold text-ink/55">Label opacity / zoom</dt>
            <dd className="text-ink/80">
              {settings.watermarkOpacityPercent}% · {settings.watermarkScalePercent}%
            </dd>
          </div>
          <div>
            <dt className="font-bold text-ink/55">Global watermark file</dt>
            <dd className="text-ink/80">{global.watermarkImageUrl.trim() ? "Uploaded" : "None"}</dd>
          </div>
          <div>
            <dt className="font-bold text-ink/55">Label watermark file</dt>
            <dd className="text-ink/80">{settings.watermarkImageUrl.trim() ? "Uploaded" : "None"}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
