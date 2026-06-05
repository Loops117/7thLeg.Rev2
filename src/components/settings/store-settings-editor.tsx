"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { RichTextEditor } from "@/components/rich-text-editor";
import { updateStoreSettings } from "@/app/actions/store-settings";
import { adminDetailsPaneClass } from "@/lib/admin-surface-classes";
import { StoreCardWidthPicker } from "@/components/settings/store-card-width-picker";
import { normalizePaneColorHex } from "@/lib/pane-config";
import {
  RECOMMENDATION_CARD_WIDTH_PRESETS,
  STORE_CARD_WIDTH_PRESETS,
  type StoreRecommendationCardConfig,
  type StoreSettingsState,
} from "@/lib/store-settings-shared";

function Section({
  title,
  summary,
  defaultOpen = true,
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
      className={adminDetailsPaneClass}
    >
      <summary className="flex flex-wrap items-center justify-between gap-2 border-b border-palm/15 px-4 py-3 font-bold text-palm hover:bg-surf/40 dark:border-zinc-700 dark:text-emerald-300 dark:hover:bg-zinc-800/60">
        <span>{title}</span>
        <span className="text-xs font-normal text-ink/60">{summary}</span>
      </summary>
      <div className="space-y-4 p-4">{children}</div>
    </details>
  );
}

function RecommendationStripHoverSettings({
  config,
  onChange,
}: {
  config: StoreRecommendationCardConfig;
  onChange: (patch: Partial<StoreRecommendationCardConfig>) => void;
}) {
  const glowHex = normalizePaneColorHex(config.hoverGlowHex) ?? "#2a9d8f";

  return (
    <fieldset className="mt-4 border-t border-palm/15 pt-4 dark:border-zinc-700">
      <legend className="text-sm font-bold text-ink dark:text-zinc-100">
        Product page card hover preview
      </legend>
      <p className="mt-1 text-xs text-ink/60 dark:text-zinc-400">
        When a shopper hovers a related / also-want strip card or a customer supplied product
        image, it enlarges in place with a colored glow. Related strips scroll horizontally only;
        the enlarged preview floats above the page.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-4">
        <label className="block text-sm font-bold text-ink dark:text-zinc-100">
          Glow color
          <div className="mt-1 flex items-center gap-2">
            <input
              type="color"
              value={glowHex}
              onChange={(e) => onChange({ hoverGlowHex: e.target.value })}
              className="h-10 w-14 cursor-pointer border-2 border-palm-mid dark:border-zinc-600"
            />
            <input
              type="text"
              value={config.hoverGlowHex}
              onChange={(e) => {
                const n = normalizePaneColorHex(e.target.value);
                onChange({ hoverGlowHex: n ?? e.target.value });
              }}
              placeholder="#2a9d8f"
              className="w-28 border-2 border-palm-mid px-2 py-2 font-mono text-sm dark:border-zinc-600 dark:bg-zinc-900"
            />
          </div>
        </label>
        <label className="block text-sm font-bold text-ink dark:text-zinc-100">
          Glow thickness (px)
          <input
            type="number"
            min={1}
            max={24}
            value={config.hoverGlowThicknessPx}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isNaN(n)) return;
              onChange({ hoverGlowThicknessPx: Math.min(24, Math.max(1, Math.floor(n))) });
            }}
            className="mt-1 block w-24 border-2 border-palm-mid px-2 py-2 font-mono text-sm dark:border-zinc-600 dark:bg-zinc-900"
          />
        </label>
        <label className="block text-sm font-bold text-ink dark:text-zinc-100">
          Zoom on hover (%)
          <input
            type="number"
            min={100}
            max={200}
            value={config.hoverZoomPercent}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isNaN(n)) return;
              onChange({ hoverZoomPercent: Math.min(200, Math.max(100, Math.floor(n))) });
            }}
            className="mt-1 block w-24 border-2 border-palm-mid px-2 py-2 font-mono text-sm dark:border-zinc-600 dark:bg-zinc-900"
          />
          <span className="mt-1 block text-xs font-normal text-ink/60 dark:text-zinc-400">
            125 = 25% larger than the base card
          </span>
        </label>
      </div>
    </fieldset>
  );
}

export function StoreSettingsEditor({ initial }: { initial: StoreSettingsState }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState<StoreSettingsState>(initial);

  function save() {
    setMsg(null);
    startTransition(async () => {
      try {
        await updateStoreSettings(form);
        setMsg("Saved. Store page updated.");
        router.refresh();
      } catch {
        setMsg("Could not save.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={save}
          className="border-2 border-black bg-black px-4 py-2 text-sm font-bold text-white hover:bg-neutral-900 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save store settings"}
        </button>
        {msg ? <span className="text-sm text-lagoon-dark">{msg}</span> : null}
      </div>

      <Section title="Store banner" summary="Intro block above the grid" defaultOpen>
        <label className="flex items-center gap-2 text-sm font-bold text-ink">
          <input
            type="checkbox"
            checked={form.storeBannerEnabled}
            onChange={(e) => setForm((f) => ({ ...f, storeBannerEnabled: e.target.checked }))}
          />
          Show banner on the store page
        </label>
        <RichTextEditor
          label="Banner content"
          value={form.storeBannerHtml}
          onChange={(html) => setForm((f) => ({ ...f, storeBannerHtml: html }))}
          minHeightClassName="min-h-[6rem]"
          placeholder="Welcome to the shop…"
        />
      </Section>

      <Section title="Featured strip" summary="Horizontal featured products row" defaultOpen={false}>
        <label className="flex items-center gap-2 text-sm font-bold text-ink">
          <input
            type="checkbox"
            checked={form.storeFeaturedStripEnabled}
            onChange={(e) => setForm((f) => ({ ...f, storeFeaturedStripEnabled: e.target.checked }))}
          />
          Show featured strip on the store page
        </label>
        <label className="block text-sm font-bold text-ink">
          Section title
          <input
            type="text"
            value={form.storeFeaturedStripConfig.title}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                storeFeaturedStripConfig: { ...f.storeFeaturedStripConfig, title: e.target.value },
              }))
            }
            className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm"
          />
        </label>
        <label className="block text-sm font-bold text-ink">
          Max products in strip
          <input
            type="number"
            min={1}
            max={48}
            value={form.storeFeaturedStripConfig.maxProducts}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                storeFeaturedStripConfig: {
                  ...f.storeFeaturedStripConfig,
                  maxProducts: Number(e.target.value) || 8,
                },
              }))
            }
            className="mt-1 w-24 border-2 border-palm-mid px-2 py-2 text-sm"
          />
        </label>
        <p className="text-xs text-ink/60">
          Product selection will use featured inventory flags when the grid is wired up.
        </p>
      </Section>

      <Section title="Product cards" summary="Store grid & product-page suggestion strips" defaultOpen={false}>
        <p className="text-sm text-ink/80 dark:text-zinc-300">
          Card colors and hover (zoom vs glow) are under{" "}
          <a href="/settings/theme" className="font-medium text-lagoon-dark underline dark:text-emerald-400">
            Settings → Theme → Shop &amp; product cards
          </a>
          . The featured strip on the store page keeps its own fixed layout.
        </p>
        <StoreCardWidthPicker
          legend="Store catalog grid"
          presets={STORE_CARD_WIDTH_PRESETS}
          valuePx={form.storeProductCardConfig.cardWidthPx}
          onChangePx={(cardWidthPx) =>
            setForm((f) => ({ ...f, storeProductCardConfig: { cardWidthPx } }))
          }
          radioName="storeCardWidth"
          minPx={120}
          maxPx={320}
          hint="Main /store product grid. Square images (cover). Cards wrap in centered rows."
        />
        <StoreCardWidthPicker
          legend="Related items & You may also want (product page)"
          presets={RECOMMENDATION_CARD_WIDTH_PRESETS}
          valuePx={form.storeRecommendationCardConfig.cardWidthPx}
          onChangePx={(cardWidthPx) =>
            setForm((f) => ({
              ...f,
              storeRecommendationCardConfig: { ...f.storeRecommendationCardConfig, cardWidthPx },
            }))
          }
          radioName="recommendationCardWidth"
          minPx={56}
          maxPx={200}
          hint="Related / also-want strips and customer supplied product images on each product page."
        />
        <RecommendationStripHoverSettings
          config={form.storeRecommendationCardConfig}
          onChange={(patch) =>
            setForm((f) => ({
              ...f,
              storeRecommendationCardConfig: { ...f.storeRecommendationCardConfig, ...patch },
            }))
          }
        />
      </Section>

      <Section title="Store footer" summary="Text below the grid" defaultOpen={false}>
        <label className="flex items-center gap-2 text-sm font-bold text-ink">
          <input
            type="checkbox"
            checked={form.storeFooterEnabled}
            onChange={(e) => setForm((f) => ({ ...f, storeFooterEnabled: e.target.checked }))}
          />
          Show footer on the store page
        </label>
        <RichTextEditor
          label="Footer content"
          value={form.storeFooterHtml}
          onChange={(html) => setForm((f) => ({ ...f, storeFooterHtml: html }))}
          minHeightClassName="min-h-[6rem]"
          placeholder="Shipping, returns, contact…"
        />
      </Section>
    </div>
  );
}
