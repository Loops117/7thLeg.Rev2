"use client";

import { btnImportantMd, btnSecondaryMd } from "@/lib/btn-theme-classes";
import { LABEL_REMOVAL_MESSAGES } from "@/lib/label-editor/confirm-removal";

export function LabelClearConfirmDialog({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/40 p-4 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="label-clear-dialog-title"
        className="w-full max-w-sm rounded-xl border-2 border-palm bg-white shadow-2xl dark:border-zinc-600 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-palm/15 px-4 py-3 dark:border-zinc-700">
          <h2 id="label-clear-dialog-title" className="text-sm font-black text-palm dark:text-emerald-300">
            Clear label?
          </h2>
          <p className="mt-2 text-xs text-ink/70 dark:text-zinc-400">{LABEL_REMOVAL_MESSAGES.clearLabel}</p>
        </div>
        <div className="flex flex-col gap-2 p-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className={btnSecondaryMd}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className={btnImportantMd}>
            Clear label
          </button>
        </div>
      </div>
    </div>
  );
}
