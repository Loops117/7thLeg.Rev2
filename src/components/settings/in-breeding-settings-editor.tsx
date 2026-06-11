"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { RichTextEditor } from "@/components/rich-text-editor";
import { updateInBreedingPageSettings } from "@/app/actions/in-breeding-settings";
import { adminDetailsPaneClass } from "@/lib/admin-surface-classes";
import { StoreCardWidthPicker } from "@/components/settings/store-card-width-picker";
import {
  IN_BREEDING_PAGE_TITLE_DEFAULT,
  type InBreedingPageSettingsState,
} from "@/lib/in-breeding-settings-shared";
import { STORE_CARD_WIDTH_PRESETS } from "@/lib/store-settings-shared";

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
    <details open={defaultOpen} className={adminDetailsPaneClass}>
      <summary className="flex flex-wrap items-center justify-between gap-2 border-b border-palm/15 px-4 py-3 font-bold text-palm hover:bg-surf/40 dark:border-zinc-700 dark:text-emerald-300 dark:hover:bg-zinc-800/60">
        <span>{title}</span>
        <span className="text-xs font-normal text-ink/60">{summary}</span>
      </summary>
      <div className="space-y-4 p-4">{children}</div>
    </details>
  );
}

export function InBreedingSettingsEditor({ initial }: { initial: InBreedingPageSettingsState }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState<InBreedingPageSettingsState>(initial);

  function save() {
    setMsg(null);
    startTransition(async () => {
      try {
        await updateInBreedingPageSettings(form);
        setMsg("Saved. In breeding page updated.");
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
          {pending ? "Saving…" : "Save in breeding settings"}
        </button>
        {msg ? <span className="text-sm text-lagoon-dark">{msg}</span> : null}
      </div>

      <Section title="Page" summary="Title and public availability" defaultOpen>
        <label className="flex items-center gap-2 text-sm font-bold text-ink">
          <input
            type="checkbox"
            checked={form.pageEnabled}
            onChange={(e) => setForm((f) => ({ ...f, pageEnabled: e.target.checked }))}
          />
          Page is published at <span className="font-mono text-xs">/in-breeding</span>
        </label>
        <p className="text-xs text-ink/60">
          When off, the public URL returns not found (header link can still be hidden separately above).
        </p>
        <label className="block text-sm font-bold text-ink">
          Page title (main heading)
          <input
            type="text"
            maxLength={120}
            value={form.pageTitle}
            onChange={(e) => setForm((f) => ({ ...f, pageTitle: e.target.value }))}
            placeholder={IN_BREEDING_PAGE_TITLE_DEFAULT}
            className="mt-1 w-full max-w-md border-2 border-palm-mid px-2 py-2 text-sm"
          />
        </label>
      </Section>

      <Section title="Page banner" summary="Intro block above the grid">
        <label className="flex items-center gap-2 text-sm font-bold text-ink">
          <input
            type="checkbox"
            checked={form.bannerEnabled}
            onChange={(e) => setForm((f) => ({ ...f, bannerEnabled: e.target.checked }))}
          />
          Show banner on the in breeding page
        </label>
        <RichTextEditor
          label="Banner content"
          value={form.bannerHtml}
          onChange={(html) => setForm((f) => ({ ...f, bannerHtml: html }))}
          minHeightClassName="min-h-[6rem]"
          placeholder="These animals are being bred — check back soon…"
        />
      </Section>

      <Section title="Featured strip" summary="Horizontal featured row (in breeding only)" defaultOpen={false}>
        <label className="flex items-center gap-2 text-sm font-bold text-ink">
          <input
            type="checkbox"
            checked={form.featuredStripEnabled}
            onChange={(e) => setForm((f) => ({ ...f, featuredStripEnabled: e.target.checked }))}
          />
          Show featured strip on the in breeding page
        </label>
        <label className="block text-sm font-bold text-ink">
          Section title
          <input
            type="text"
            value={form.featuredStripConfig.title}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                featuredStripConfig: { ...f.featuredStripConfig, title: e.target.value },
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
            value={form.featuredStripConfig.maxProducts}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                featuredStripConfig: {
                  ...f.featuredStripConfig,
                  maxProducts: Number(e.target.value) || 8,
                },
              }))
            }
            className="mt-1 w-24 border-2 border-palm-mid px-2 py-2 text-sm"
          />
        </label>
        <p className="text-xs text-ink/60">
          Only products marked <strong>Featured</strong> and <strong>In breeding</strong> appear here.
        </p>
      </Section>

      <Section title="Product cards" summary="Grid card width" defaultOpen={false}>
        <p className="text-sm text-ink/80 dark:text-zinc-300">
          Card colors and hover (zoom vs glow) are under{" "}
          <a href="/settings/theme" className="font-medium text-lagoon-dark underline dark:text-emerald-400">
            Settings → Theme → Shop &amp; product cards
          </a>
          .
        </p>
        <StoreCardWidthPicker
          legend="In breeding catalog grid"
          presets={STORE_CARD_WIDTH_PRESETS}
          valuePx={form.productCardConfig.cardWidthPx}
          onChangePx={(cardWidthPx) =>
            setForm((f) => ({ ...f, productCardConfig: { cardWidthPx } }))
          }
          radioName="inBreedingCardWidth"
          minPx={120}
          maxPx={320}
          hint="Product grid on /in-breeding. Square images (cover). Cards wrap in centered rows."
        />
      </Section>

      <Section title="Page footer" summary="Text below the grid" defaultOpen={false}>
        <label className="flex items-center gap-2 text-sm font-bold text-ink">
          <input
            type="checkbox"
            checked={form.footerEnabled}
            onChange={(e) => setForm((f) => ({ ...f, footerEnabled: e.target.checked }))}
          />
          Show footer on the in breeding page
        </label>
        <RichTextEditor
          label="Footer content"
          value={form.footerHtml}
          onChange={(html) => setForm((f) => ({ ...f, footerHtml: html }))}
          minHeightClassName="min-h-[6rem]"
          placeholder="Availability notes, contact…"
        />
      </Section>
    </div>
  );
}
