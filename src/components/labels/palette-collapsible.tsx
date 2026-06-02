"use client";

import { useState, type ReactNode } from "react";

export function PaletteCollapsible({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded border border-palm/20 dark:border-zinc-600">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-[10px] font-black uppercase tracking-wide text-palm dark:text-emerald-300"
      >
        <span>{title}</span>
        <span className="text-ink/50" aria-hidden>
          {open ? "−" : "+"}
        </span>
      </button>
      {open ? <div className="space-y-2 border-t border-palm/10 px-2 pb-2 pt-2 dark:border-zinc-700">{children}</div> : null}
    </div>
  );
}
