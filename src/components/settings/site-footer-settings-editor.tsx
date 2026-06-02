"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateSiteFooterSettings } from "@/app/actions/site-footer-settings";
import { RichTextEditor } from "@/components/rich-text-editor";
import { btnSecondaryMd } from "@/lib/btn-theme-classes";
import {
  BUILTIN_SITE_FOOTER,
  type SiteFooterSettings,
} from "@/lib/site-footer-settings-shared";

export function SiteFooterSettingsEditor({ initial }: { initial: SiteFooterSettings }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState<SiteFooterSettings>(initial);

  function save() {
    setMsg(null);
    startTransition(async () => {
      const r = await updateSiteFooterSettings(form);
      if (!r.ok) {
        setMsg(r.error);
        return;
      }
      setMsg("Saved. Public site footer updated.");
      router.refresh();
    });
  }

  function resetDefaults() {
    setForm({ ...BUILTIN_SITE_FOOTER });
    setMsg("Defaults loaded — click Save to apply.");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={pending} onClick={save} className={btnSecondaryMd}>
          {pending ? "Saving…" : "Save site footer"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={resetDefaults}
          className="text-sm font-bold text-lagoon-dark underline"
        >
          Reset to defaults
        </button>
        {msg ? <span className="text-sm text-lagoon-dark">{msg}</span> : null}
      </div>

      <p className="text-sm text-ink/75">
        Footer <strong>colors and border</strong> are under{" "}
        <Link href="/settings/theme" className="font-medium text-lagoon-dark underline">
          Theme → Footer
        </Link>
        . Shop / About link labels follow{" "}
        <Link href="/settings/store" className="font-medium text-lagoon-dark underline">
          header menu
        </Link>{" "}
        settings on each page.
      </p>

      <section className="rounded border-2 border-palm/25 bg-surf/30 p-4">
        <h2 className="text-sm font-black text-palm">Visibility</h2>
        <label className="mt-3 flex items-center gap-2 text-sm font-bold text-ink">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
          />
          Show site footer on customer-facing pages
        </label>
      </section>

      <section className="rounded border-2 border-palm/25 bg-surf/30 p-4">
        <h2 className="text-sm font-black text-palm">Layout &amp; alignment</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-bold text-ink">
            Text alignment
            <select
              value={form.alignment}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  alignment: e.target.value as SiteFooterSettings["alignment"],
                }))
              }
              className="mt-1 block w-full border-2 border-palm-mid bg-white px-2 py-2 text-sm"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </label>
          <label className="block text-sm font-bold text-ink">
            Bottom row layout
            <select
              value={form.layout}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  layout: e.target.value as SiteFooterSettings["layout"],
                }))
              }
              className="mt-1 block w-full border-2 border-palm-mid bg-white px-2 py-2 text-sm"
            >
              <option value="stacked">Stacked (credit above links)</option>
              <option value="split">Split (credit left, links right on wide screens)</option>
            </select>
            <p className="mt-1 text-xs font-normal text-ink/60">
              Split mirrors the classic footer: builder credit on one side, nav on the other.
            </p>
          </label>
        </div>
      </section>

      <section className="rounded border-2 border-palm/25 bg-surf/30 p-4">
        <h2 className="text-sm font-black text-palm">Content</h2>
        <p className="mt-1 text-xs text-ink/60">
          Use <code className="rounded bg-white/80 px-1">{"{year}"}</code> and{" "}
          <code className="rounded bg-white/80 px-1">{"{companyName}"}</code> in copyright (company name from Global
          settings).
        </p>

        <label className="mt-4 flex items-center gap-2 text-sm font-bold text-ink">
          <input
            type="checkbox"
            checked={form.showTagline}
            onChange={(e) => setForm((f) => ({ ...f, showTagline: e.target.checked }))}
          />
          Show tagline (bold line)
        </label>
        {form.showTagline ? (
          <RichTextEditor
            label="Tagline"
            value={form.taglineHtml}
            onChange={(taglineHtml) => setForm((f) => ({ ...f, taglineHtml }))}
            minHeightClassName="min-h-[4rem]"
          />
        ) : null}

        <label className="mt-4 flex items-center gap-2 text-sm font-bold text-ink">
          <input
            type="checkbox"
            checked={form.showCopyright}
            onChange={(e) => setForm((f) => ({ ...f, showCopyright: e.target.checked }))}
          />
          Show copyright block
        </label>
        {form.showCopyright ? (
          <RichTextEditor
            label="Copyright"
            value={form.copyrightHtml}
            onChange={(copyrightHtml) => setForm((f) => ({ ...f, copyrightHtml }))}
            minHeightClassName="min-h-[5rem]"
          />
        ) : null}

        <label className="mt-4 flex items-center gap-2 text-sm font-bold text-ink">
          <input
            type="checkbox"
            checked={form.showBuilderCredit}
            onChange={(e) => setForm((f) => ({ ...f, showBuilderCredit: e.target.checked }))}
          />
          Show builder credit
        </label>
        {form.showBuilderCredit ? (
          <label className="mt-2 block text-sm font-bold text-ink">
            Credit prefix
            <input
              type="text"
              value={form.builderCreditPrefix}
              onChange={(e) => setForm((f) => ({ ...f, builderCreditPrefix: e.target.value }))}
              className="mt-1 w-full max-w-md border-2 border-palm-mid px-3 py-2 text-sm"
              placeholder="Website by"
            />
            <p className="mt-1 text-xs font-normal text-ink/60">
              Link text uses <code className="rounded bg-white/80 px-1">NEXT_PUBLIC_SITE_BUILDER_URL</code> when set.
            </p>
          </label>
        ) : null}
      </section>

      <section className="rounded border-2 border-palm/25 bg-surf/30 p-4">
        <h2 className="text-sm font-black text-palm">Links</h2>
        <label className="mt-3 flex items-center gap-2 text-sm font-bold text-ink">
          <input
            type="checkbox"
            checked={form.showNavLinks}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                showNavLinks: e.target.checked,
                showShopLink: e.target.checked ? f.showShopLink : false,
                showAboutLink: e.target.checked ? f.showAboutLink : false,
                showAdminLink: e.target.checked ? f.showAdminLink : false,
              }))
            }
          />
          Show footer link row
        </label>
        {form.showNavLinks ? (
          <div className="mt-3 ml-6 space-y-2">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={form.showShopLink}
                onChange={(e) => setForm((f) => ({ ...f, showShopLink: e.target.checked }))}
              />
              Shop link (/store)
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={form.showAboutLink}
                onChange={(e) => setForm((f) => ({ ...f, showAboutLink: e.target.checked }))}
              />
              About link (/about)
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={form.showAdminLink}
                onChange={(e) => setForm((f) => ({ ...f, showAdminLink: e.target.checked }))}
              />
              Admin button (settings login)
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={form.showBuilderCreditLink}
                onChange={(e) => setForm((f) => ({ ...f, showBuilderCreditLink: e.target.checked }))}
              />
              Builder link in compact footer (label editor pages)
            </label>
          </div>
        ) : null}
      </section>
    </div>
  );
}
