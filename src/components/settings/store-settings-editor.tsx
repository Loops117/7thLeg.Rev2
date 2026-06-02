"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { RichTextEditor } from "@/components/rich-text-editor";
import { updateStoreSettings } from "@/app/actions/store-settings";
import type { StoreSettingsState } from "@/lib/store-settings";

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
      className="rounded border-2 border-palm bg-white shadow-sm [&_summary]:cursor-pointer [&_summary]:list-none [&_summary::-webkit-details-marker]:hidden"
    >
      <summary className="flex flex-wrap items-center justify-between gap-2 border-b border-palm/15 px-4 py-3 font-bold text-palm hover:bg-surf/40">
        <span>{title}</span>
        <span className="text-xs font-normal text-ink/60">{summary}</span>
      </summary>
      <div className="space-y-4 p-4">{children}</div>
    </details>
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

      <Section title="Product cards" summary="Colors & hover — moved to Theme" defaultOpen={false}>
        <p className="text-sm text-ink/80">
          Product card colors and hover style (zoom vs glow) are configured under{" "}
          <a href="/settings/theme" className="font-medium text-lagoon-dark underline">
            Settings → Theme → Shop &amp; product cards
          </a>
          . Save the theme after changing them.
        </p>
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
