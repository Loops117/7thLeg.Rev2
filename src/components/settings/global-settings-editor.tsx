"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  regenerateSiteBrandingFromCompanyLogo,
  updateGlobalSettings,
  uploadCompanyLogo,
  uploadSiteBrandingImage,
  uploadSiteWatermark,
} from "@/app/actions/site-config-admin";
import { PUBLIC_DEFAULT_BRAND_LOGO_PATH } from "@/lib/brand-assets";
import { btnSecondaryMd } from "@/lib/btn-theme-classes";
import type { SiteBrandingSource } from "@/lib/site-branding";
import {
  LOGO_PLACEMENTS,
  WATERMARK_PLACEMENTS,
  type CompanyLogoPlacement,
  type GlobalSettingsState,
  type WatermarkPlacement,
} from "@/lib/site-config-types";

export function GlobalSettingsEditor({ initial }: { initial: GlobalSettingsState }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState<GlobalSettingsState>(initial);

  function save() {
    setMsg(null);
    startTransition(async () => {
      const r = await updateGlobalSettings(form);
      if (!r.ok) {
        setMsg(r.error);
        return;
      }
      setMsg("Saved. Site header and config updated.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={save}
          className="border-2 border-black bg-black px-4 py-2 text-sm font-bold text-white hover:bg-neutral-900 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save global settings"}
        </button>
        {msg ? <span className="text-sm text-lagoon-dark">{msg}</span> : null}
      </div>

      <fieldset className="rounded border-2 border-palm/25 bg-white p-4">
        <legend className="text-sm font-bold text-palm">Storefront branding</legend>
        <label className="mt-0 block text-sm font-bold text-ink">
          Company / site name
          <input
            type="text"
            value={form.companyName}
            onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
            className="mt-1 w-full max-w-md border-2 border-palm-mid px-2 py-2 text-sm"
            maxLength={120}
          />
        </label>

        <div className="mt-4 flex flex-col gap-2 text-sm font-bold text-ink">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={form.headerShowCompanyName}
              onChange={(e) => setForm((f) => ({ ...f, headerShowCompanyName: e.target.checked }))}
            />
            Show company name in storefront header
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={form.headerShowCompanyLogo}
              onChange={(e) => setForm((f) => ({ ...f, headerShowCompanyLogo: e.target.checked }))}
            />
            Show company logo in storefront header (when a logo URL is set)
          </label>
          <p className="text-xs font-normal text-ink/60">
            Hiding both name and logo leaves the header with navigation only.
          </p>
        </div>

        <label className="mt-4 block text-sm font-bold text-ink">
          Logo position (in header)
          <select
            value={form.companyLogoPlacement}
            onChange={(e) =>
              setForm((f) => ({ ...f, companyLogoPlacement: e.target.value as CompanyLogoPlacement }))
            }
            className="mt-1 block w-full max-w-sm border-2 border-palm-mid bg-white px-2 py-2 text-sm"
          >
            {LOGO_PLACEMENTS.map((p) => (
              <option key={p} value={p}>
                {p === "beside" ? "Beside the name" : p === "above" ? "Above the name" : "Name centered under logo"}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-sm font-bold text-ink">
            Company logo
            <input
              type="file"
              accept="image/png,image/webp,image/jpeg,image/gif,image/avif"
              disabled={pending}
              className="mt-1 block text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setMsg(null);
                startTransition(async () => {
                  const fd = new FormData();
                  fd.set("file", file);
                  const r = await uploadCompanyLogo(fd);
                  if (!r.ok) {
                    setMsg(r.error);
                    return;
                  }
                  setForm((f) => ({ ...f, companyLogoUrl: r.url }));
                  setMsg("Logo uploaded. Save to persist all settings, or it is already stored.");
                  router.refresh();
                });
              }}
            />
          </label>
          {form.companyLogoUrl ? (
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.companyLogoUrl}
                alt="Current logo"
                className="h-14 w-auto max-w-[160px] rounded border border-palm/30 bg-surf/50 object-contain p-1"
              />
              <button
                type="button"
                disabled={pending}
                className="text-xs font-bold text-coral underline"
                onClick={() => {
                  startTransition(async () => {
                    const next = { ...form, companyLogoUrl: "" };
                    setForm(next);
                    const r = await updateGlobalSettings(next);
                    if (!r.ok) {
                      setMsg(r.error);
                      return;
                    }
                    setMsg("Logo cleared from settings.");
                    router.refresh();
                  });
                }}
              >
                Clear
              </button>
            </div>
          ) : (
            <p className="text-xs text-ink/55">No logo — only the name shows in the header.</p>
          )}
        </div>
        <p className="mt-2 text-xs text-ink/60">Uploads are resized on the server (see &ldquo;Image upload limits&rdquo; below).</p>
      </fieldset>

      <fieldset className="rounded border-2 border-palm/25 bg-white p-4">
        <legend className="text-sm font-bold text-palm">Browser icon &amp; link previews</legend>
        <p className="mt-0 text-xs text-ink/65">
          Controls the favicon, Apple touch icon, and the image shown when your site is shared (Open Graph / Twitter).
          Upload one square-ish image; the server generates 16×16, 32×32, 180×180, and 1200×630 sizes.
        </p>

        <label className="mt-4 block text-sm font-bold text-ink">
          Icon source
          <select
            value={form.siteBrandingSource}
            onChange={(e) =>
              setForm((f) => ({ ...f, siteBrandingSource: e.target.value as SiteBrandingSource }))
            }
            className="mt-1 block w-full max-w-md border-2 border-palm-mid bg-white px-2 py-2 text-sm"
          >
            <option value="default">Built-in brand image ({PUBLIC_DEFAULT_BRAND_LOGO_PATH})</option>
            <option value="companyLogo">Company logo (generate multiple sizes)</option>
            <option value="custom">Custom upload (generate multiple sizes)</option>
          </select>
        </label>

        {form.siteBrandingSource === "default" ? (
          <p className="mt-3 text-xs text-ink/60">
            Uses the default file in <code className="rounded bg-black/5 px-1">public/brand/</code>. Save global
            settings after switching here.
          </p>
        ) : null}

        {form.siteBrandingSource === "companyLogo" ? (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-ink/65">
              Uses your <strong>company logo</strong> above. Wide logos are center-cropped to square for favicons; link
              previews use a 1200×630 crop.
            </p>
            <button
              type="button"
              disabled={pending || !form.companyLogoUrl}
              onClick={() => {
                setMsg(null);
                startTransition(async () => {
                  const r = await regenerateSiteBrandingFromCompanyLogo();
                  if (!r.ok) {
                    setMsg(r.error);
                    return;
                  }
                  setForm((f) => ({
                    ...f,
                    siteBrandingSource: "companyLogo",
                    siteBrandingAssets: r.assets,
                  }));
                  setMsg("Icons generated from company logo.");
                  router.refresh();
                });
              }}
              className={btnSecondaryMd}
            >
              Generate sizes from company logo
            </button>
            {!form.companyLogoUrl ? (
              <p className="text-xs text-coral">Upload a company logo first.</p>
            ) : null}
          </div>
        ) : null}

        {form.siteBrandingSource === "custom" ? (
          <div className="mt-4 space-y-3">
            <label className="block text-sm font-bold text-ink">
              Upload source image
              <input
                type="file"
                accept="image/png,image/webp,image/jpeg,image/gif,image/avif"
                disabled={pending}
                className="mt-1 block text-sm"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  setMsg(null);
                  startTransition(async () => {
                    const fd = new FormData();
                    fd.set("file", file);
                    const r = await uploadSiteBrandingImage(fd);
                    if (!r.ok) {
                      setMsg(r.error);
                      return;
                    }
                    setForm((f) => ({
                      ...f,
                      siteBrandingSource: "custom",
                      siteBrandingAssets: r.assets,
                    }));
                    setMsg("Site icons generated and saved.");
                    router.refresh();
                  });
                }}
              />
            </label>
            <p className="text-xs text-ink/60">Recommended: at least 512×512 PNG with simple artwork.</p>
          </div>
        ) : null}

        {form.siteBrandingAssets ? (
          <div className="mt-4 rounded border border-palm/20 bg-surf/30 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-ink/55">Generated assets</p>
            <ul className="mt-2 grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["Favicon 16", form.siteBrandingAssets.icon16],
                  ["Favicon 32", form.siteBrandingAssets.icon32],
                  ["Apple 180", form.siteBrandingAssets.apple180],
                  ["Link preview", form.siteBrandingAssets.og1200],
                ] as const
              ).map(([label, src]) => (
                <li key={label} className="flex items-center gap-2 text-xs">
                  <span className="w-24 shrink-0 font-bold text-ink/70">{label}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt=""
                    className="h-10 w-10 rounded border border-palm/25 bg-white object-contain p-0.5"
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : form.siteBrandingSource !== "default" ? (
          <p className="mt-3 text-xs text-ink/55">No generated sizes yet — use the actions above, then save.</p>
        ) : null}
      </fieldset>

      <fieldset className="rounded border-2 border-palm/25 bg-white p-4">
        <legend className="text-sm font-bold text-palm">Image upload limits</legend>
        <p className="mb-3 text-xs text-ink/65">
          Longest edge in pixels and JPEG quality apply to new product, theme, logo, and watermark images (and similar
          uploads).
        </p>
        <div className="flex flex-wrap gap-4">
          <label className="block text-sm font-bold text-ink">
            Max edge (px)
            <input
              type="number"
              min={256}
              max={8192}
              value={form.uploadImageMaxEdgePx}
              onChange={(e) => setForm((f) => ({ ...f, uploadImageMaxEdgePx: Number(e.target.value) }))}
              className="mt-1 w-32 border-2 border-palm-mid px-2 py-2 text-sm"
            />
          </label>
          <label className="block text-sm font-bold text-ink">
            JPEG quality (1–100)
            <input
              type="number"
              min={1}
              max={100}
              value={form.uploadImageJpegQuality}
              onChange={(e) => setForm((f) => ({ ...f, uploadImageJpegQuality: Number(e.target.value) }))}
              className="mt-1 w-28 border-2 border-palm-mid px-2 py-2 text-sm"
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="rounded border-2 border-palm/25 bg-white p-4">
        <legend className="text-sm font-bold text-palm">Checkout sales tax</legend>
        <p className="mb-3 text-xs text-ink/65 dark:text-zinc-400">
          Percentage of <strong className="text-ink dark:text-zinc-200">merchandise subtotal only</strong> added at
          checkout (before shipping). Set to <strong className="text-ink dark:text-zinc-200">0</strong> for no tax. Stripe,
          Square, and cart previews use the same rate.
        </p>
        <label className="block text-sm font-bold text-ink dark:text-zinc-200">
          Tax rate (%)
          <input
            type="number"
            step="0.01"
            min={0}
            max={99.999}
            value={form.checkoutSalesTaxPercent}
            onChange={(e) => {
              const n = Number.parseFloat(e.target.value);
              setForm((f) => ({
                ...f,
                checkoutSalesTaxPercent: Number.isFinite(n) && n >= 0 ? Math.min(99.999, n) : 0,
              }));
            }}
            className="mt-1 w-36 border-2 border-palm-mid bg-white px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>
      </fieldset>

      <fieldset className="rounded border-2 border-palm/25 bg-white p-4">
        <legend className="text-sm font-bold text-palm">Product image watermark</legend>
        <p className="mb-3 text-xs text-ink/65">
          Used when you apply a watermark on catalog image uploads. Prefer a PNG with transparency for logo-style marks.
        </p>
        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-bold text-ink">
            Watermark location
            <select
              value={form.watermarkPlacement}
              onChange={(e) =>
                setForm((f) => ({ ...f, watermarkPlacement: e.target.value as WatermarkPlacement }))
              }
              className="mt-1 block w-full border-2 border-palm-mid bg-white px-2 py-2 text-sm"
            >
              {WATERMARK_PLACEMENTS.map((p) => (
                <option key={p} value={p}>
                  {p === "bottomRight"
                    ? "Bottom right"
                    : p === "bottomLeft"
                      ? "Bottom left"
                      : p === "topRight"
                        ? "Top right"
                        : p === "topLeft"
                          ? "Top left"
                          : p === "center"
                            ? "Center"
                            : "Stretch to fit"}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-bold text-ink">
            Watermark opacity ({form.watermarkOpacityPercent}%)
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={form.watermarkOpacityPercent}
              onChange={(e) => setForm((f) => ({ ...f, watermarkOpacityPercent: Number(e.target.value) }))}
              className="mt-2 w-full"
            />
          </label>
        </div>
        <div className="mb-4 rounded border border-palm/25 bg-sand/30 p-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-ink">
            <input
              type="checkbox"
              checked={form.productDiagonalBrandOverlay}
              onChange={(e) => setForm((f) => ({ ...f, productDiagonalBrandOverlay: e.target.checked }))}
            />
            Repeat store name diagonally on product images
          </label>
          <label className="mt-3 block text-sm font-bold text-ink">
            Diagonal text spacing ({form.productDiagonalNameGapPx}px)
            <input
              type="range"
              min={0}
              max={64}
              step={1}
              value={form.productDiagonalNameGapPx}
              onChange={(e) => setForm((f) => ({ ...f, productDiagonalNameGapPx: Number(e.target.value) }))}
              className="mt-2 w-full"
            />
          </label>
          <p className="mt-2 text-xs text-ink/65">
            Diagonal text now alternates light and dark lines to stay visible on both bright and dark photos.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-bold text-ink">
            Upload watermark
            <input
              type="file"
              accept="image/png,image/webp,image/jpeg,image/gif"
              disabled={pending}
              className="mt-1 block text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setMsg(null);
                startTransition(async () => {
                  const fd = new FormData();
                  fd.set("file", file);
                  const r = await uploadSiteWatermark(fd);
                  if (!r.ok) {
                    setMsg(r.error);
                    return;
                  }
                  setForm((f) => ({ ...f, watermarkImageUrl: r.url }));
                  setMsg("Watermark uploaded.");
                  router.refresh();
                });
              }}
            />
          </label>
          {form.watermarkImageUrl ? (
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.watermarkImageUrl}
                alt="Current watermark"
                className="h-16 w-auto max-w-[120px] rounded border border-palm/30 bg-surf/50 object-contain p-1"
              />
              <button
                type="button"
                disabled={pending}
                className="text-xs font-bold text-coral underline"
                onClick={() => {
                  startTransition(async () => {
                    const next = { ...form, watermarkImageUrl: "" };
                    setForm(next);
                    const r = await updateGlobalSettings(next);
                    if (!r.ok) {
                      setMsg(r.error);
                      return;
                    }
                    setMsg("Watermark cleared.");
                    router.refresh();
                  });
                }}
              >
                Clear (save to persist)
              </button>
            </div>
          ) : (
            <p className="text-xs text-ink/55">No watermark on file yet.</p>
          )}
        </div>
      </fieldset>

    </div>
  );
}
