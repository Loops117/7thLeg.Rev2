"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateSeoSettings } from "@/app/actions/seo-admin";
import { adminFieldsetClass } from "@/lib/admin-surface-classes";
import { SEO_META_DESCRIPTION_MAX, type SeoAuditSnapshot } from "@/lib/seo";
import {
  DEFAULT_COMPANY_NAME,
  DEFAULT_SITE_LINK_PREVIEW_DESCRIPTION,
  type SeoSettingsState,
} from "@/lib/site-config-types";

export function SeoSettingsEditor({
  initial,
  audit,
  siteOrigin,
}: {
  initial: SeoSettingsState;
  audit: SeoAuditSnapshot;
  siteOrigin: string;
}) {
  const router = useRouter();
  const origin = siteOrigin;
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState(initial);

  function save() {
    setMsg(null);
    startTransition(async () => {
      const r = await updateSeoSettings(form);
      if (!r.ok) {
        setMsg(r.error);
        return;
      }
      setMsg("SEO settings saved.");
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
          {pending ? "Saving…" : "Save SEO settings"}
        </button>
        {msg ? <span className="text-sm text-lagoon-dark">{msg}</span> : null}
      </div>

      <fieldset className={adminFieldsetClass}>
        <legend className="text-sm font-bold text-palm">Site-wide defaults</legend>
        <p className="mt-0 text-xs text-ink/65">
          Used on the home page, social link previews, and as fallbacks when a page has no custom description. Share
          preview <strong>images</strong> are still set under{" "}
          <Link href="/settings/global" className="font-medium text-lagoon-dark underline">
            Global → Browser icon &amp; link previews
          </Link>
          .
        </p>

        <label className="mt-4 block text-sm font-bold text-ink">
          Default site title
          <input
            type="text"
            value={form.linkPreviewTitle}
            onChange={(e) => setForm((f) => ({ ...f, linkPreviewTitle: e.target.value }))}
            placeholder={form.companyName.trim() || "Uses company name when blank"}
            className="mt-1 w-full max-w-lg border-2 border-palm-mid px-2 py-2 text-sm"
            maxLength={120}
          />
        </label>
        <p className="mt-1 text-xs text-ink/55">
          Leave blank to use the company name ({form.companyName.trim() || DEFAULT_COMPANY_NAME}). Product pages append the
          product name automatically.
        </p>

        <label className="mt-4 block text-sm font-bold text-ink">
          Default meta description
          <textarea
            value={form.linkPreviewDescription}
            onChange={(e) => setForm((f) => ({ ...f, linkPreviewDescription: e.target.value }))}
            placeholder={DEFAULT_SITE_LINK_PREVIEW_DESCRIPTION}
            rows={3}
            className="mt-1 w-full max-w-2xl border-2 border-palm-mid px-2 py-2 text-sm"
            maxLength={300}
          />
        </label>
        <p className="mt-1 text-xs text-ink/55">
          Aim for about {SEO_META_DESCRIPTION_MAX} characters in search results. Blank uses &ldquo;
          {DEFAULT_SITE_LINK_PREVIEW_DESCRIPTION}&rdquo;.
        </p>
      </fieldset>

      <fieldset className={adminFieldsetClass}>
        <legend className="text-sm font-bold text-palm">Store page</legend>
        <p className="mt-0 text-xs text-ink/65">
          Optional overrides for{" "}
          <a href={`${origin}/store`} className="font-medium text-lagoon-dark underline" target="_blank" rel="noreferrer">
            /store
          </a>
          . Leave blank to auto-build from your shop nav label and site name.
        </p>

        <label className="mt-4 block text-sm font-bold text-ink">
          Store page title
          <input
            type="text"
            value={form.seoStoreMetaTitle}
            onChange={(e) => setForm((f) => ({ ...f, seoStoreMetaTitle: e.target.value }))}
            placeholder={`Shop · ${DEFAULT_COMPANY_NAME}`}
            className="mt-1 w-full max-w-lg border-2 border-palm-mid px-2 py-2 text-sm"
            maxLength={120}
          />
        </label>

        <label className="mt-4 block text-sm font-bold text-ink">
          Store page description
          <textarea
            value={form.seoStoreMetaDescription}
            onChange={(e) => setForm((f) => ({ ...f, seoStoreMetaDescription: e.target.value }))}
            rows={3}
            className="mt-1 w-full max-w-2xl border-2 border-palm-mid px-2 py-2 text-sm"
            maxLength={300}
          />
        </label>
      </fieldset>

      <fieldset className={adminFieldsetClass}>
        <legend className="text-sm font-bold text-palm">Search engine access</legend>

        <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm font-bold text-ink">
          <input
            type="checkbox"
            checked={form.seoIndexingEnabled}
            onChange={(e) => setForm((f) => ({ ...f, seoIndexingEnabled: e.target.checked }))}
          />
          Allow search engines to index the storefront
        </label>
        <p className="mt-2 text-xs text-ink/60">
          When off, pages get <span className="font-mono">noindex</span> and robots.txt blocks crawlers — useful on a
          staging copy, not normal production.
        </p>

        <label className="mt-4 block text-sm font-bold text-ink">
          Google Search Console verification
          <input
            type="text"
            value={form.googleSiteVerification}
            onChange={(e) => setForm((f) => ({ ...f, googleSiteVerification: e.target.value }))}
            placeholder="paste the content= value only"
            className="mt-1 w-full max-w-lg border-2 border-palm-mid px-2 py-2 font-mono text-sm"
            maxLength={120}
          />
        </label>
        <p className="mt-1 text-xs text-ink/55">
          In Search Console, choose the HTML tag method and paste only the long code from{" "}
          <span className="font-mono">content=&quot;…&quot;</span> — not the whole meta tag.
        </p>

        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-ink/80">
          <li>
            <a href={`${origin}/sitemap.xml`} className="font-medium text-lagoon-dark underline" target="_blank" rel="noreferrer">
              Sitemap
            </a>{" "}
            — submit this URL in Search Console after going live.
          </li>
          <li>
            <a href={`${origin}/robots.txt`} className="font-medium text-lagoon-dark underline" target="_blank" rel="noreferrer">
              robots.txt
            </a>{" "}
            — blocks admin, account, cart, and API routes from crawlers.
          </li>
        </ul>
      </fieldset>

      <fieldset className={adminFieldsetClass}>
        <legend className="text-sm font-bold text-palm">Catalog health</legend>
        <p className="mt-0 text-xs text-ink/65">
          Product pages use each item&apos;s <strong>short description</strong> for search snippets when set; otherwise
          the long description is trimmed automatically.
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded border-2 border-palm/20 bg-white px-3 py-2">
            <dt className="text-xs font-bold uppercase tracking-wide text-ink/55">Active products</dt>
            <dd className="text-2xl font-black text-palm">{audit.activeProductCount}</dd>
          </div>
          <div className="rounded border-2 border-palm/20 bg-white px-3 py-2">
            <dt className="text-xs font-bold uppercase tracking-wide text-ink/55">Missing short description</dt>
            <dd className="text-2xl font-black text-palm">{audit.activeProductsMissingShortDescription}</dd>
          </div>
          <div className="rounded border-2 border-palm/20 bg-white px-3 py-2">
            <dt className="text-xs font-bold uppercase tracking-wide text-ink/55">Inactive (not in sitemap)</dt>
            <dd className="text-2xl font-black text-palm">{audit.inactiveProductCount}</dd>
          </div>
        </dl>
        {audit.activeProductsMissingShortDescription > 0 ? (
          <p className="mt-3 text-sm text-ink/80">
            <Link href="/settings/products" className="font-medium text-lagoon-dark underline">
              Open Catalog
            </Link>{" "}
            and add short descriptions on high-priority products first.
          </p>
        ) : (
          <p className="mt-3 text-sm text-lagoon-dark">All active products have a short description.</p>
        )}
      </fieldset>
    </div>
  );
}
