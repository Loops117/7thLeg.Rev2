"use client";

import { useMemo, useState, useTransition } from "react";
import { LabelClearConfirmDialog } from "@/components/labels/label-clear-confirm-dialog";
import {
  LabelEditorSaveDialog,
  type LabelEditorSaveDialogMode,
} from "@/components/labels/label-editor-save-dialog";
import { LabelEditorDesignPicker } from "@/components/labels/label-editor-design-picker";
import { useLabelEditor } from "@/components/labels/label-editor-context";
import { btnImportantSm, btnSecondarySm } from "@/lib/btn-theme-classes";
import { countDocumentElements } from "@/lib/label-editor/document";

export function LabelEditorSaveActions({ onMessage }: { onMessage?: (msg: string) => void }) {
  const {
    isLoggedInCustomer,
    savedDesignId,
    isDocumentDirty,
    saveCurrentDesign,
    state,
    dispatch,
    canUndo,
    canRedo,
    undo,
    redo,
  } = useLabelEditor();
  const [pending, startTransition] = useTransition();
  const [dialogMode, setDialogMode] = useState<LabelEditorSaveDialogMode | null>(null);
  const [clearOpen, setClearOpen] = useState(false);

  const hasCanvasContent = useMemo(
    () => countDocumentElements(state.doc) > 0 || state.doc.strokes.length > 0,
    [state.doc],
  );

  const onSaveClick = () => {
    if (!isLoggedInCustomer) return;
    if (!savedDesignId) {
      setDialogMode("first-save");
      return;
    }
    startTransition(async () => {
      const r = await saveCurrentDesign();
      if (!r.ok) onMessage?.(r.error);
      else onMessage?.("Saved.");
    });
  };

  const onClearConfirm = () => {
    dispatch({ type: "CLEAR_LABEL" });
    setClearOpen(false);
    onMessage?.("Label cleared.");
  };

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center gap-1 sm:gap-1.5">
        {isLoggedInCustomer ? <LabelEditorDesignPicker onMessage={onMessage} /> : null}

        <button type="button" disabled={!canUndo} onClick={undo} className={btnSecondarySm} title="Undo">
          Undo
        </button>
        <button type="button" disabled={!canRedo} onClick={redo} className={btnSecondarySm} title="Redo">
          Redo
        </button>
        <button
          type="button"
          disabled={!hasCanvasContent}
          onClick={() => setClearOpen(true)}
          className={btnImportantSm}
          title="Clear label"
        >
          Clear label
        </button>

        {isLoggedInCustomer ? (
          <>
            <span className="hidden h-4 w-px bg-palm/20 sm:inline dark:bg-zinc-600" aria-hidden />
            {isDocumentDirty ? (
              <span className="hidden text-[10px] font-bold text-mango sm:inline">Unsaved</span>
            ) : savedDesignId ? (
              <span className="hidden text-[10px] text-ink/45 sm:inline dark:text-zinc-500">Saved</span>
            ) : null}
            <button
              type="button"
              disabled={pending}
              onClick={onSaveClick}
              className={btnSecondarySm}
            >
              Save
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setDialogMode("save-as")}
              className={btnSecondarySm}
            >
              Save as…
            </button>
          </>
        ) : null}
      </div>

      <LabelClearConfirmDialog
        open={clearOpen}
        onCancel={() => setClearOpen(false)}
        onConfirm={onClearConfirm}
      />

      {isLoggedInCustomer ? (
        <LabelEditorSaveDialog
          open={dialogMode !== null}
          mode={dialogMode ?? "first-save"}
          onClose={() => setDialogMode(null)}
          onSaved={() => onMessage?.(dialogMode === "save-as" ? "Saved as new design." : "Saved to your account.")}
          onError={onMessage}
        />
      ) : null}
    </>
  );
}
