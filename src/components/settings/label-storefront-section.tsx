"use client";

import Link from "next/link";
import { btnSecondaryMd } from "@/lib/btn-theme-classes";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateLabelBuilderSettings } from "@/app/actions/site-config-admin";
import type { LabelBuilderAdminState } from "@/lib/site-config-types";

export function LabelStorefrontSection({ initial }: { initial: LabelBuilderAdminState }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);

  function save(next: LabelBuilderAdminState, successMessage: string) {
    setMsg(null);
    startTransition(async () => {
      const r = await updateLabelBuilderSettings(next);
      if (!r.ok) {
        setMsg(r.error);
        return;
      }
      setState(next);
      setMsg(successMessage);
      router.refresh();
    });
  }

  function applyCreatorEnabled(next: boolean) {
    save(
      { ...state, labelBuilderEnabled: next },
      next
        ? "Label creator is on — /labels works for anyone with the link."
        : "Label creator is off — /labels returns not found and the header link is hidden.",
    );
  }

  function applyHeaderNav(next: boolean) {
    save(
      { ...state, labelBuilderNavEnabled: next },
      next
        ? "Labels appears in the site header (when the creator is enabled)."
        : "Labels is hidden from the header — /labels still works via direct URL.",
    );
  }

  return (
    <section className="rounded border-2 border-palm bg-surf/40 p-4 sm:p-5 dark:border-zinc-600 dark:bg-zinc-900/40">
      <h2 className="text-lg font-black text-palm dark:text-emerald-200">Storefront section</h2>
      <p className="mt-1 max-w-2xl text-sm text-ink/80 dark:text-zinc-400">
        Control whether the label creator is live and whether it is advertised in the main site menu. Useful for testing
        with admin and customer accounts using a direct link without promoting it to everyone.
      </p>

      <div className="mt-6 space-y-6">
        <div className="flex flex-col gap-4 border-t border-palm/20 pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-700">
          <div className="max-w-xl">
            <h3 className="text-sm font-black text-palm dark:text-emerald-300">Label creator</h3>
            <p className="mt-1 text-sm text-ink/80 dark:text-zinc-400">
              When enabled,{" "}
              <Link href="/labels" className="font-bold text-lagoon-dark underline dark:text-emerald-300">
                /labels
              </Link>{" "}
              loads the editor for anyone who opens that URL. When disabled, that page returns “not found”.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
            <p className="text-center text-xs font-bold uppercase tracking-wide text-ink/60 sm:text-right dark:text-zinc-500">
              {state.labelBuilderEnabled ? "Enabled" : "Disabled"}
            </p>
            <div className="flex flex-wrap justify-center gap-2 sm:justify-end">
              <button
                type="button"
                disabled={pending || state.labelBuilderEnabled}
                onClick={() => applyCreatorEnabled(true)}
                className={btnSecondaryMd}
              >
                Enable
              </button>
              <button
                type="button"
                disabled={pending || !state.labelBuilderEnabled}
                onClick={() => applyCreatorEnabled(false)}
                className="rounded border-2 border-palm bg-white px-4 py-2.5 text-sm font-bold text-palm hover:bg-surf disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-emerald-200"
              >
                Disable
              </button>
              {state.labelBuilderEnabled ? (
                <Link
                  href="/labels"
                  className="inline-flex items-center justify-center rounded border-2 border-palm-mid bg-white px-4 py-2.5 text-sm font-bold text-palm hover:bg-surf dark:border-zinc-600 dark:bg-zinc-950 dark:text-emerald-200"
                >
                  Open /labels
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-palm/20 pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-700">
          <div className="max-w-xl">
            <h3 className="text-sm font-black text-palm dark:text-emerald-300">Header link</h3>
            <p className="mt-1 text-sm text-ink/80 dark:text-zinc-400">
              When shown, <strong>Labels</strong> appears in the main menu after Featured. Turn off to keep the creator
              available only via direct URL (no public nav entry).
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
            <p className="text-center text-xs font-bold uppercase tracking-wide text-ink/60 sm:text-right dark:text-zinc-500">
              {!state.labelBuilderEnabled
                ? "Creator off"
                : state.labelBuilderNavEnabled
                  ? "Shown"
                  : "Hidden"}
            </p>
            <div className="flex flex-wrap justify-center gap-2 sm:justify-end">
              <button
                type="button"
                disabled={pending || !state.labelBuilderEnabled || state.labelBuilderNavEnabled}
                onClick={() => applyHeaderNav(true)}
                className={btnSecondaryMd}
              >
                Show in header
              </button>
              <button
                type="button"
                disabled={pending || !state.labelBuilderEnabled || !state.labelBuilderNavEnabled}
                onClick={() => applyHeaderNav(false)}
                className="rounded border-2 border-palm bg-white px-4 py-2.5 text-sm font-bold text-palm hover:bg-surf disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-emerald-200"
              >
                Hide from header
              </button>
            </div>
          </div>
        </div>
      </div>

      {msg ? (
        <p
          className="mt-6 border-t border-palm/20 pt-4 text-sm text-ink/85 dark:border-zinc-700 dark:text-zinc-300"
          role="status"
        >
          {msg}
        </p>
      ) : null}
    </section>
  );
}
