"use client";

import type { ReactNode } from "react";
import { adminDetailsPaneClass } from "@/lib/admin-surface-classes";

export type ProductEditorSectionStatus = "active" | "inactive" | "empty";

const statusClass: Record<ProductEditorSectionStatus, string> = {
  active:
    "rounded border border-lagoon-dark/40 bg-lagoon/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-lagoon-dark dark:border-emerald-700/50 dark:bg-emerald-950/40 dark:text-emerald-300",
  inactive:
    "rounded border border-palm/30 bg-surf/50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-ink/55 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  empty:
    "rounded border border-palm/25 bg-sand/40 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-ink/50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-500",
};

export function ProductEditorSection({
  title,
  status,
  statusLabel,
  meta,
  defaultOpen = false,
  children,
}: {
  title: string;
  status: ProductEditorSectionStatus;
  statusLabel: string;
  meta?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      className={`${adminDetailsPaneClass} border`}
      open={defaultOpen ? true : undefined}
      onToggle={(e) => e.stopPropagation()}
    >
      <summary className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-palm/20 px-4 py-3 dark:border-zinc-700 sm:px-5">
        <span className="text-base font-black text-palm dark:text-emerald-300">{title}</span>
        <span className={statusClass[status]}>{statusLabel}</span>
        {meta ? (
          <span className="w-full text-xs font-medium text-ink/65 dark:text-zinc-400 sm:ml-auto sm:w-auto sm:text-right">
            {meta}
          </span>
        ) : null}
      </summary>
      <div className="space-y-4 p-4 sm:p-5">{children}</div>
    </details>
  );
}
