"use client";

import type { ReactNode } from "react";
import { useState } from "react";

export function SettingsCollapsibleSection({
  title,
  trailing,
  defaultOpen = false,
  children,
}: {
  title: string;
  trailing?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded border-2 border-palm bg-surf/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left hover:bg-surf/60 sm:px-5"
      >
        <span aria-hidden className="shrink-0 text-sm text-ink/45">
          {open ? "▼" : "▶"}
        </span>
        <span className="min-w-0 flex-1 text-lg font-black text-palm">{title}</span>
        {trailing ? <span className="flex shrink-0 items-center justify-end">{trailing}</span> : null}
      </button>
      {open ? <div className="border-t border-palm/20 px-4 pb-5 pt-4 sm:px-5">{children}</div> : null}
    </section>
  );
}
