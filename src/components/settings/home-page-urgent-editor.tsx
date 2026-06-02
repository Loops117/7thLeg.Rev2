"use client";

import { btnImportantMd } from "@/lib/btn-theme-classes";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateHomeUrgentNotification } from "@/app/actions/site-config-admin";
import type { HomePageUrgentState } from "@/lib/site-config-types";

export function HomePageUrgentEditor({ initial }: { initial: HomePageUrgentState }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [revision, setRevision] = useState(initial.homeUrgentNotificationRevision);
  const [form, setForm] = useState<Omit<HomePageUrgentState, "homeUrgentNotificationRevision">>({
    homeUrgentNotificationEnabled: initial.homeUrgentNotificationEnabled,
    homeUrgentNotificationTitle: initial.homeUrgentNotificationTitle,
    homeUrgentNotificationBody: initial.homeUrgentNotificationBody,
  });

  function save() {
    setMsg(null);
    startTransition(async () => {
      const r = await updateHomeUrgentNotification(form);
      if (!r.ok) {
        setMsg(r.error);
        return;
      }
      setRevision(r.revision);
      setMsg("Saved. Home banner pop-up settings updated.");
      router.refresh();
    });
  }

  const enabled = form.homeUrgentNotificationEnabled;

  return (
    <details className="group rounded border-2 border-coral/40 bg-white dark:border-orange-900/55 dark:bg-zinc-900/55 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-black text-palm dark:text-orange-400">Home page — urgent notice</span>
          <span className="text-xs font-medium text-ink/60 dark:text-zinc-500">
            Full-screen banner on `/` · tap to edit
          </span>
        </div>
        <span
          className={`shrink-0 rounded border-2 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${
            enabled
              ? "border-green-700/50 bg-green-900/35 text-green-200"
              : "border-zinc-500/60 bg-zinc-800/90 text-zinc-400 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-500"
          }`}
          aria-live="polite"
        >
          {enabled ? "Enabled" : "Disabled"}
        </span>
      </summary>

      <div className="space-y-4 border-t border-coral/25 px-4 py-4 dark:border-orange-900/35">
        <p className="text-xs text-ink/65 dark:text-zinc-400">
          When enabled, visitors landing on the <strong>home page</strong> see a message they must dismiss before using the
          rest of the site. Changing title or body bumps the <strong>revision</strong> so returning visitors see new copy after
          a previous dismiss.
        </p>
        <p className="text-xs font-mono text-ink/55 dark:text-zinc-500">Current revision: {revision}</p>
        <label className="flex items-center gap-2 text-sm font-bold text-ink dark:text-zinc-200">
          <input
            type="checkbox"
            checked={enabled}
            disabled={pending}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                homeUrgentNotificationEnabled: e.target.checked,
              }))
            }
          />
          Show urgent notice on home
        </label>
        <label className="block text-sm font-bold text-ink dark:text-zinc-200">
          Title (optional — default is &ldquo;Important notice&rdquo;)
          <input
            type="text"
            value={form.homeUrgentNotificationTitle}
            disabled={pending}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                homeUrgentNotificationTitle: e.target.value,
              }))
            }
            className="mt-1 w-full border-2 border-palm-mid bg-white px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            maxLength={200}
          />
        </label>
        <label className="block text-sm font-bold text-ink dark:text-zinc-200">
          Message
          <textarea
            value={form.homeUrgentNotificationBody}
            disabled={pending}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                homeUrgentNotificationBody: e.target.value,
              }))
            }
            className="mt-1 min-h-[8rem] w-full border-2 border-palm-mid bg-white px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            maxLength={8000}
            placeholder="This text is required for the pop-up to appear. Line breaks are kept."
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={save}
            className={btnImportantMd}
          >
            {pending ? "Saving…" : "Save urgent notice"}
          </button>
          {msg ? <span className="text-sm dark:text-zinc-400">{msg}</span> : null}
        </div>
      </div>
    </details>
  );
}
