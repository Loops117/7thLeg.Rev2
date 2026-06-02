"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  updateStorefrontNavLinkEnabled,
  updateStorefrontNavLinkLabel,
} from "@/app/actions/storefront-nav-settings";
import { btnSecondaryMd } from "@/lib/btn-theme-classes";
import {
  STOREFRONT_NAV_LINK_DEFAULTS,
  type StorefrontNavLinkId,
  type StorefrontNavLinkState,
} from "@/lib/storefront-nav-settings-shared";

const LINK_META: Record<StorefrontNavLinkId, { title: string; publicPath: string; defaultLabel: string }> = {
  shop: {
    title: "Shop",
    publicPath: "/store",
    defaultLabel: STOREFRONT_NAV_LINK_DEFAULTS.shop.label,
  },
  featured: {
    title: "Featured",
    publicPath: "/featured",
    defaultLabel: STOREFRONT_NAV_LINK_DEFAULTS.featured.label,
  },
  about: {
    title: "About",
    publicPath: "/about",
    defaultLabel: STOREFRONT_NAV_LINK_DEFAULTS.about.label,
  },
};

export function StorefrontNavHeaderPanel({
  linkId,
  initial,
}: {
  linkId: StorefrontNavLinkId;
  initial: StorefrontNavLinkState;
}) {
  const meta = LINK_META[linkId];
  const storeHref = meta.publicPath;

  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState(initial);
  const [labelDraft, setLabelDraft] = useState(initial.label);
  const [msg, setMsg] = useState<string | null>(null);

  function applyEnabled(enabled: boolean) {
    setMsg(null);
    startTransition(async () => {
      const r = await updateStorefrontNavLinkEnabled(linkId, enabled);
      if (!r.ok) {
        setMsg(r.error);
        return;
      }
      setState((s) => ({ ...s, enabled }));
      setMsg(
        enabled
          ? `“${labelDraft.trim() || state.label}” will show in the site header.`
          : `Hidden from the header — ${storeHref} still works via direct URL.`,
      );
      router.refresh();
    });
  }

  function saveLabel() {
    setMsg(null);
    startTransition(async () => {
      const r = await updateStorefrontNavLinkLabel(linkId, labelDraft);
      if (!r.ok) {
        setMsg(r.error);
        return;
      }
      const trimmed = labelDraft.trim();
      setState((s) => ({ ...s, label: trimmed }));
      setLabelDraft(trimmed);
      setMsg("Header link label saved.");
      router.refresh();
    });
  }

  return (
    <section className="mb-8 rounded border-2 border-palm bg-surf/40 p-4 sm:p-5">
      <h2 className="text-lg font-black text-palm">Header menu — {meta.title}</h2>
      <p className="mt-1 max-w-2xl text-sm text-ink/80">
        Show or hide this section in the top navigation and choose the link text. Does not change Cart, Admin, or other
        menu items.
      </p>

      <div className="mt-6 flex flex-col gap-6 border-t border-palm/20 pt-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xl space-y-4">
          <div>
            <h3 className="text-sm font-black text-palm">Visibility</h3>
            <p className="mt-1 text-sm text-ink/80">
              <Link href={storeHref} className="font-bold text-lagoon-dark underline">
                {storeHref}
              </Link>{" "}
              stays available when hidden; only the header link is removed.
            </p>
          </div>
          <div>
            <label className="block text-sm font-bold text-ink" htmlFor={`nav-label-${linkId}`}>
              Header link text
            </label>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <input
                id={`nav-label-${linkId}`}
                type="text"
                maxLength={32}
                value={labelDraft}
                onChange={(e) => setLabelDraft(e.target.value)}
                className="min-w-[10rem] flex-1 border-2 border-palm-mid px-3 py-2 text-sm"
                placeholder={meta.defaultLabel}
              />
              <button
                type="button"
                disabled={pending || labelDraft.trim() === state.label}
                onClick={saveLabel}
                className={btnSecondaryMd}
              >
                Save label
              </button>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <p className="text-center text-xs font-bold uppercase tracking-wide text-ink/60 sm:text-right">
            {state.enabled ? "Shown in header" : "Hidden from header"}
          </p>
          <div className="flex flex-wrap justify-center gap-2 sm:justify-end">
            <button
              type="button"
              disabled={pending || state.enabled}
              onClick={() => applyEnabled(true)}
              className={btnSecondaryMd}
            >
              Show in header
            </button>
            <button
              type="button"
              disabled={pending || !state.enabled}
              onClick={() => applyEnabled(false)}
              className="rounded border-2 border-palm bg-white px-4 py-2.5 text-sm font-bold text-palm hover:bg-surf disabled:cursor-not-allowed disabled:opacity-50"
            >
              Hide from header
            </button>
          </div>
        </div>
      </div>

      {msg ? <p className="mt-4 text-sm font-medium text-lagoon-dark">{msg}</p> : null}
    </section>
  );
}
