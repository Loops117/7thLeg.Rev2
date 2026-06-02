"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { addLabelsToCartAction } from "@/app/actions/label-cart";
import { LabelBatchFinishPicker } from "@/components/labels/label-batch-finish-picker";
import { useLabelEditor } from "@/components/labels/label-editor-context";
import { bagItemDisplayName } from "@/lib/label-bag-stats";
import { bagSubtotalCentsWithFinish } from "@/lib/label-bag-pricing";
import {
  defaultBatchFinishSelection,
  mergeFinishOptionsForBatch,
  type BatchFinishSelection,
} from "@/lib/label-finish-options";
import { btnMainMd, btnSecondaryMd } from "@/lib/btn-theme-classes";
import type { LabelBagItem } from "@/lib/label-editor/label-bag";
import type { LabelTemplatePickerOption } from "@/lib/label-editor/template-meta";
import { formatPriceUsd } from "@/lib/product-slug";

export function LabelAddToCartDialog({
  open,
  items,
  templates,
  onClose,
  onClearBag,
}: {
  open: boolean;
  items: LabelBagItem[];
  templates: LabelTemplatePickerOption[];
  onClose: () => void;
  onClearBag: () => void;
}) {
  const router = useRouter();
  const { finishOptionsByTemplateId } = useLabelEditor();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [finishSelection, setFinishSelection] = useState<BatchFinishSelection>({ choices: [] });

  const templateIdsInBag = useMemo(
    () => [...new Set(items.map((i) => i.templateId))],
    [items],
  );

  const batchOptions = useMemo(
    () => mergeFinishOptionsForBatch(finishOptionsByTemplateId, templateIdsInBag),
    [finishOptionsByTemplateId, templateIdsInBag],
  );

  const hasOptions = batchOptions.length > 0;

  useEffect(() => {
    if (!open || !hasOptions) return;
    setFinishSelection((prev) => {
      const def = defaultBatchFinishSelection(batchOptions);
      const complete =
        prev.choices.length > 0 &&
        def.choices.every((d) =>
          prev.choices.some(
            (c) => c.finishOptionId === d.finishOptionId || finishGroupMatches(c, d),
          ),
        );
      return complete ? prev : def;
    });
  }, [open, hasOptions, batchOptions]);

  const totalCents = useMemo(
    () => bagSubtotalCentsWithFinish(items, templates, finishOptionsByTemplateId, finishSelection),
    [items, templates, finishOptionsByTemplateId, finishSelection],
  );
  const totalQty = useMemo(() => items.reduce((s, i) => s + Math.max(1, i.quantity), 0), [items]);

  if (!open) return null;

  const onConfirm = () => {
    setError("");
    startTransition(async () => {
      const r = await addLabelsToCartAction(
        items.map((item) => ({
          templateId: item.templateId,
          savedDesignId: item.savedDesignId,
          displayName: bagItemDisplayName(item),
          document: item.document,
          quantity: item.quantity,
          dataRowLabel: item.dataRowLabel,
        })),
        hasOptions ? finishSelection : undefined,
      );
      if (!r.ok) {
        setError(r.error);
        return;
      }
      onClearBag();
      onClose();
      router.refresh();
      router.push("/cart");
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-lg border-2 border-palm bg-white shadow-xl dark:border-zinc-600 dark:bg-zinc-900"
      >
        <div className="border-b border-palm/15 px-4 py-3 dark:border-zinc-700">
          <h2 className="text-sm font-black text-palm">Add labels to cart</h2>
          <p className="mt-1 text-xs text-ink/60">
            One cart line for this batch. Choose one option in each group — applies to every label below.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <p className="text-xs font-bold text-ink/55">
            {items.length} design{items.length === 1 ? "" : "s"} · {totalQty} label{totalQty === 1 ? "" : "s"}
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-ink/80">
            {items.map((item) => (
              <li key={item.id}>{bagItemDisplayName(item)}</li>
            ))}
          </ul>

          {hasOptions ? (
            <div className="mt-4">
              <h3 className="text-xs font-black uppercase text-palm dark:text-emerald-300">Options</h3>
              <div className="mt-2">
                <LabelBatchFinishPicker
                  labelQty={totalQty}
                  options={batchOptions}
                  selection={finishSelection}
                  items={items}
                  finishOptionsByTemplateId={finishOptionsByTemplateId}
                  onChange={setFinishSelection}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t border-palm/15 px-4 py-3 dark:border-zinc-700">
          <div className="flex justify-between text-sm font-black">
            <span>Total</span>
            <span className="text-palm">{formatPriceUsd(totalCents)}</span>
          </div>
          <p className="mt-0.5 text-[11px] text-ink/50">Includes bulk label pricing and selected options.</p>
          {error ? (
            <p className="mt-2 text-xs font-bold text-coral">
              {error.includes("Sign in") ? (
                <>
                  {error}{" "}
                  <Link href="/login?callbackUrl=/labels" className="underline">
                    Log in
                  </Link>
                </>
              ) : (
                error
              )}
            </p>
          ) : null}
        </div>

        <div className="flex gap-2 border-t border-palm/15 p-4 dark:border-zinc-700">
          <button
            type="button"
            className={`flex-1 ${btnSecondaryMd}`}
            onClick={onClose}
            disabled={pending}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending || items.length === 0}
            className={`flex-1 ${btnMainMd}`}
            onClick={onConfirm}
          >
            {pending ? "Adding…" : "Add to cart"}
          </button>
        </div>
      </div>
    </div>
  );
}

function finishGroupMatches(
  a: { groupName: string },
  b: { groupName: string },
): boolean {
  const key = (g: string) => g.trim() || "Other";
  return key(a.groupName) === key(b.groupName);
}
