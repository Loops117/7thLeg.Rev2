"use client";

import { useEffect, useMemo, useState } from "react";
import { LabelDesignPreview } from "@/components/labels/label-design-preview";
import { useLabelEditor } from "@/components/labels/label-editor-context";
import {
  cloneDocument,
  newBagItemId,
  parseDataRowSelection,
  type LabelBagItem,
} from "@/lib/label-editor/label-bag";
import { btnMainMd, btnSecondaryMd, btnSecondarySm } from "@/lib/btn-theme-classes";

export function LabelAddToBagDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, template, publicConfig, addBagItems, savedDesignId, designName, markDocumentSaved } =
    useLabelEditor();
  const dataRows = state.doc.dataSheet?.rows.length ?? 0;
  const hasData = dataRows > 0;

  const [quantity, setQuantity] = useState(1);
  const [rowMode, setRowMode] = useState<"all" | "custom">("all");
  const [rowInput, setRowInput] = useState("");
  const [previewRow, setPreviewRow] = useState(state.doc.dataRowIndex);

  useEffect(() => {
    if (open) setPreviewRow(state.doc.dataRowIndex);
  }, [open, state.doc.dataRowIndex]);

  const previewDoc = useMemo(() => {
    const d = cloneDocument(state.doc);
    d.dataRowIndex = previewRow;
    return d;
  }, [state.doc, previewRow]);

  if (!open) return null;

  const rowIndices = hasData
    ? rowMode === "all"
      ? parseDataRowSelection("all", dataRows)
      : parseDataRowSelection(rowInput, dataRows)
    : [0];

  const onAdd = () => {
    const qty = Math.max(1, Math.min(999, Math.floor(quantity) || 1));
    const items: LabelBagItem[] = [];
    if (hasData && rowIndices.length > 0) {
      for (const rowIdx of rowIndices) {
        const doc = cloneDocument(state.doc);
        doc.dataRowIndex = rowIdx;
        items.push({
          id: newBagItemId(),
          templateId: template.id,
          templateName: template.name,
          widthMm: template.widthMm,
          heightMm: template.heightMm,
          document: doc,
          quantity: qty,
          dataRowLabel: `Row ${rowIdx + 1}`,
          savedDesignId: savedDesignId ?? null,
          savedDesignName: designName.trim() || null,
          addedAt: Date.now(),
          inBag: true,
        });
      }
    } else {
      items.push({
        id: newBagItemId(),
        templateId: template.id,
        templateName: template.name,
        widthMm: template.widthMm,
        heightMm: template.heightMm,
        document: cloneDocument(state.doc),
        quantity: qty,
        dataRowLabel: null,
        savedDesignId: savedDesignId ?? null,
        savedDesignName: designName.trim() || null,
        addedAt: Date.now(),
        inBag: true,
      });
    }
    addBagItems(items);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-lg border-2 border-palm bg-white shadow-xl dark:border-zinc-600 dark:bg-zinc-900"
      >
        <div className="border-b border-palm/15 px-4 py-3 dark:border-zinc-700">
          <h2 className="text-sm font-black text-palm">Add to bag</h2>
          <p className="text-xs text-ink/60">{template.name}</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <LabelDesignPreview template={template} doc={previewDoc} publicConfig={publicConfig} maxWidthPx={240} />

          {hasData ? (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  aria-label="Previous row"
                  className={btnSecondarySm}
                  onClick={() => setPreviewRow((r) => (r <= 0 ? dataRows - 1 : r - 1))}
                >
                  ‹
                </button>
                <p className="text-xs font-bold text-ink/70">
                  Preview row {previewRow + 1} of {dataRows}
                </p>
                <button
                  type="button"
                  aria-label="Next row"
                  className={btnSecondarySm}
                  onClick={() => setPreviewRow((r) => (r >= dataRows - 1 ? 0 : r + 1))}
                >
                  ›
                </button>
              </div>

              <fieldset className="space-y-2 text-xs">
                <legend className="font-bold text-ink/55">Rows to add</legend>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={rowMode === "all"}
                    onChange={() => setRowMode("all")}
                  />
                  All rows ({dataRows})
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={rowMode === "custom"}
                    onChange={() => setRowMode("custom")}
                  />
                  Choose rows
                </label>
                {rowMode === "custom" ? (
                  <input
                    value={rowInput}
                    onChange={(e) => setRowInput(e.target.value)}
                    placeholder="e.g. 1,2,4 or 1-21"
                    className="w-full border px-2 py-1 font-mono text-xs dark:bg-zinc-950"
                  />
                ) : null}
                <p className="text-[10px] text-ink/50">
                  Use comma-separated numbers or a range like 1-21. Quantity applies to each selected row.
                </p>
              </fieldset>
            </div>
          ) : null}

          <label className="mt-4 block text-xs font-bold text-ink/55">
            Quantity per line
            <input
              type="number"
              min={1}
              max={999}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="mt-1 w-full border px-2 py-1.5 dark:bg-zinc-950"
            />
          </label>
        </div>

        <div className="flex gap-2 border-t border-palm/15 p-4 dark:border-zinc-700">
          <button
            type="button"
            className={`flex-1 ${btnSecondaryMd}`}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`flex-1 ${btnMainMd}`}
            onClick={onAdd}
            disabled={hasData && rowMode === "custom" && rowIndices.length === 0}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
