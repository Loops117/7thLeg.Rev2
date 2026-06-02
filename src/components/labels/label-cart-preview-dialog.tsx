"use client";

import { LabelDesignPreview } from "@/components/labels/label-design-preview";
import type { LabelBuilderPublicConfig } from "@/lib/label-builder-public";
import { cartLabelEntryDescription } from "@/lib/label-cart-display";
import type { CartLabelBundleLineEntry } from "@/lib/cart-label-types";
import { btnMainMd } from "@/lib/btn-theme-classes";

export function LabelCartPreviewDialog({
  open,
  title,
  entries,
  publicConfig,
  onClose,
}: {
  open: boolean;
  title: string;
  entries: CartLabelBundleLineEntry[];
  publicConfig: LabelBuilderPublicConfig;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="label-cart-preview-title"
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border-2 border-palm bg-white shadow-xl dark:border-zinc-600 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-palm/15 px-4 py-3 dark:border-zinc-700">
          <h2 id="label-cart-preview-title" className="text-sm font-black text-palm">
            {title}
          </h2>
          <p className="mt-1 text-xs text-ink/60">
            Watermarked previews only — right-click save is disabled. To change a design, remove this item from your
            cart, edit in the label builder, and add it again.
          </p>
        </div>

        <ul className="min-h-0 flex-1 grid gap-3 overflow-y-auto p-4 sm:grid-cols-2 md:grid-cols-3">
          {entries.map((entry, idx) => (
            <li
              key={`${entry.displayName}-${idx}`}
              className="flex flex-col rounded border border-palm/15 bg-surf/20 p-2 dark:border-zinc-600"
            >
              <p className="line-clamp-2 text-[11px] font-bold leading-tight text-ink">
                {cartLabelEntryDescription(entry.displayName)}
              </p>
              <p className="mt-0.5 text-[10px] text-ink/55">
                {entry.templateName} · <span className="font-bold text-ink/80">Qty: {entry.quantity}</span>
              </p>
              <div className="mt-2 flex flex-1 items-center justify-center rounded bg-white/90 p-2 shadow-inner">
                <LabelDesignPreview
                  template={entry.template}
                  doc={entry.doc}
                  publicConfig={publicConfig}
                  maxWidthPx={140}
                  showWatermark
                />
              </div>
            </li>
          ))}
        </ul>

        <div className="border-t border-palm/15 p-4 dark:border-zinc-700">
          <button
            type="button"
            className={`w-full ${btnMainMd}`}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
