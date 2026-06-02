"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  createCustomerLabelDesignFolder,
  listCustomerLabelDesignFolders,
  type LabelDesignFolderSummary,
} from "@/app/actions/label-design-folders";
import {
  listCustomerLabelDesigns,
  saveCustomerLabelDesign,
  type SavedLabelDesignSummary,
} from "@/app/actions/label-designs";
import { useLabelEditor } from "@/components/labels/label-editor-context";
import { btnMainMd, btnSecondaryMd, btnSecondarySm } from "@/lib/btn-theme-classes";

type SaveMode = "new" | "overwrite";

function formatSavedDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export function LabelSaveBeforeBagDialog({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const {
    state,
    template,
    savedDesignId,
    setSavedDesignId,
    designName,
    setDesignName,
    markDocumentSaved,
  } = useLabelEditor();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");
  const [folders, setFolders] = useState<LabelDesignFolderSummary[]>([]);
  const [savedDesigns, setSavedDesigns] = useState<SavedLabelDesignSummary[]>([]);
  const [folderId, setFolderId] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [saveMode, setSaveMode] = useState<SaveMode>("new");
  const [overwriteTargetId, setOverwriteTargetId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMsg("");
    startTransition(async () => {
      try {
        const [list, folderList] = await Promise.all([
          listCustomerLabelDesigns(),
          listCustomerLabelDesignFolders(),
        ]);
        setSavedDesigns(list);
        setFolders(folderList);

        const initialOverwrite = savedDesignId && list.some((d) => d.id === savedDesignId) ? savedDesignId : null;
        if (initialOverwrite) {
          setSaveMode("overwrite");
          setOverwriteTargetId(initialOverwrite);
          const match = list.find((d) => d.id === initialOverwrite);
          if (match) {
            setDesignName(match.name);
            setFolderId(match.folderId ?? "");
          }
        } else {
          setSaveMode(list.length > 0 ? "new" : "new");
          setOverwriteTargetId(null);
        }
      } catch {
        setSavedDesigns([]);
        setFolders([]);
        setSaveMode("new");
        setOverwriteTargetId(null);
      }
    });
  }, [open, savedDesignId, setDesignName]);

  const sameTemplateDesigns = useMemo(
    () => savedDesigns.filter((d) => d.templateId === template.id),
    [savedDesigns, template.id],
  );
  const otherTemplateDesigns = useMemo(
    () => savedDesigns.filter((d) => d.templateId !== template.id),
    [savedDesigns, template.id],
  );

  const selectOverwriteTarget = (d: SavedLabelDesignSummary) => {
    setSaveMode("overwrite");
    setOverwriteTargetId(d.id);
    setDesignName(d.name);
    setFolderId(d.folderId ?? "");
    setMsg("");
  };

  const switchToNewSave = () => {
    setSaveMode("new");
    setOverwriteTargetId(null);
    setMsg("");
  };

  if (!open) return null;

  const onSave = () => {
    if (saveMode === "overwrite" && !overwriteTargetId) {
      setMsg("Choose a saved label to replace, or save as a new label.");
      return;
    }
    startTransition(async () => {
      const r = await saveCustomerLabelDesign({
        id: saveMode === "overwrite" ? overwriteTargetId! : undefined,
        templateId: template.id,
        name: designName.trim() || "My label",
        document: state.doc,
        folderId: folderId || null,
      });
      if (!r.ok) {
        setMsg(r.error);
        return;
      }
      setSavedDesignId(r.id);
      markDocumentSaved();
      onSaved();
    });
  };

  const onCreateFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    startTransition(async () => {
      const r = await createCustomerLabelDesignFolder(name);
      if (!r.ok) {
        setMsg(r.error);
        return;
      }
      setFolders((prev) => [...prev, r.folder]);
      setFolderId(r.folder.id);
      setNewFolderName("");
    });
  };

  const renderDesignRow = (d: SavedLabelDesignSummary) => {
    const selected = saveMode === "overwrite" && overwriteTargetId === d.id;
    const isCurrentTemplate = d.templateId === template.id;
    return (
      <li key={d.id}>
        <button
          type="button"
          className={`w-full rounded border-2 px-3 py-2 text-left text-xs transition-colors ${
            selected
              ? "border-palm bg-palm/10 ring-1 ring-palm/30 dark:bg-emerald-950/40"
              : "border-palm/20 hover:border-palm/40 hover:bg-palm/5 dark:border-zinc-600 dark:hover:bg-zinc-800"
          }`}
          onClick={() => selectOverwriteTarget(d)}
        >
          <p className="font-bold text-ink">{d.name}</p>
          <p className="mt-0.5 text-ink/55">
            {d.templateName}
            {!isCurrentTemplate ? (
              <span className="ml-1 font-bold text-amber-700 dark:text-amber-400"> · different size</span>
            ) : null}
            {d.folderName ? ` · ${d.folderName}` : ""}
            {d.updatedAt ? ` · ${formatSavedDate(d.updatedAt)}` : ""}
          </p>
        </button>
      </li>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border-2 border-palm bg-white shadow-xl dark:border-zinc-600 dark:bg-zinc-900"
      >
        <div className="border-b border-palm/15 px-4 py-3 dark:border-zinc-700">
          <h2 className="text-sm font-black text-palm">Save before adding to bag</h2>
          <p className="mt-1 text-xs text-ink/60">
            Save your label (including data) to your account. Choose a new save or replace one of your existing saved
            labels.
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <p className="rounded border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-ink/75 dark:border-amber-900/50 dark:bg-amber-950/40">
            Future edits only reach your bag after you save. We recommend saving whenever you change the design.
          </p>

          <fieldset className="space-y-2">
            <legend className="text-xs font-black uppercase text-palm/80">How to save</legend>
            <label className="flex cursor-pointer items-start gap-2 rounded border border-palm/20 p-2 dark:border-zinc-600">
              <input
                type="radio"
                name="save-mode"
                className="mt-0.5"
                checked={saveMode === "new"}
                onChange={switchToNewSave}
              />
              <span>
                <span className="block text-xs font-bold text-ink">Save as new label</span>
                <span className="text-[10px] text-ink/55">Keeps your other saved labels unchanged.</span>
              </span>
            </label>
            <label
              className={`flex cursor-pointer items-start gap-2 rounded border p-2 dark:border-zinc-600 ${
                savedDesigns.length === 0 ? "opacity-50" : "border-palm/20"
              }`}
            >
              <input
                type="radio"
                name="save-mode"
                className="mt-0.5"
                checked={saveMode === "overwrite"}
                disabled={savedDesigns.length === 0}
                onChange={() => {
                  setSaveMode("overwrite");
                  if (!overwriteTargetId && sameTemplateDesigns[0]) {
                    selectOverwriteTarget(sameTemplateDesigns[0]);
                  } else if (!overwriteTargetId && savedDesigns[0]) {
                    selectOverwriteTarget(savedDesigns[0]);
                  }
                }}
              />
              <span>
                <span className="block text-xs font-bold text-ink">Replace an existing saved label</span>
                <span className="text-[10px] text-ink/55">
                  Overwrites the design you pick below with what is on the canvas now.
                </span>
              </span>
            </label>
          </fieldset>

          {saveMode === "overwrite" ? (
            <div className="space-y-2">
              <p className="text-xs font-bold text-ink/55">Your saved labels — tap one to replace</p>
              {savedDesigns.length === 0 ? (
                <p className="text-xs text-ink/50">No saved labels yet. Use “Save as new label” instead.</p>
              ) : (
                <div className="max-h-44 space-y-3 overflow-y-auto rounded border border-palm/15 p-2 dark:border-zinc-600">
                  {sameTemplateDesigns.length > 0 ? (
                    <div>
                      <p className="mb-1 text-[10px] font-black uppercase text-palm/70">Same template ({template.name})</p>
                      <ul className="space-y-1.5">{sameTemplateDesigns.map(renderDesignRow)}</ul>
                    </div>
                  ) : null}
                  {otherTemplateDesigns.length > 0 ? (
                    <div>
                      {sameTemplateDesigns.length > 0 ? (
                        <p className="mb-1 text-[10px] font-black uppercase text-palm/70">Other sizes</p>
                      ) : null}
                      <ul className="space-y-1.5">{otherTemplateDesigns.map(renderDesignRow)}</ul>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}

          <label className="block text-xs font-bold text-ink/55">
            {saveMode === "overwrite" ? "Label name" : "Name for new save"}
            <input
              value={designName}
              onChange={(e) => setDesignName(e.target.value)}
              className="mt-1 w-full border-2 border-palm/30 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
          </label>

          <label className="block text-xs font-bold text-ink/55">
            Folder (optional)
            <select
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              className="mt-1 w-full border-2 border-palm/30 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            >
              <option value="">No folder</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>

          <div className="flex gap-2">
            <input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="New folder name"
              className="min-w-0 flex-1 border px-2 py-1.5 text-xs dark:bg-zinc-950"
            />
            <button
              type="button"
              className={btnSecondarySm}
              onClick={onCreateFolder}
              disabled={pending || !newFolderName.trim()}
            >
              Add folder
            </button>
          </div>

          {msg ? <p className="text-xs font-bold text-coral">{msg}</p> : null}
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
            disabled={pending}
            className={`flex-1 ${btnMainMd}`}
            onClick={onSave}
          >
            {pending ? "Saving…" : saveMode === "overwrite" ? "Replace & continue" : "Save & continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
