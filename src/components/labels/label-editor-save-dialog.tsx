"use client";

import { useEffect, useState, useTransition } from "react";
import {
  createCustomerLabelDesignFolder,
  listCustomerLabelDesignFolders,
  type LabelDesignFolderSummary,
} from "@/app/actions/label-design-folders";
import { useLabelEditor } from "@/components/labels/label-editor-context";
import { btnSecondaryMd, btnSecondarySm } from "@/lib/btn-theme-classes";

export type LabelEditorSaveDialogMode = "first-save" | "save-as";

function suggestSaveAsName(name: string): string {
  const base = name.trim() || "My label";
  if (base.toLowerCase().endsWith(" copy")) return base;
  return `${base} copy`;
}

export function LabelEditorSaveDialog({
  open,
  mode,
  onClose,
  onSaved,
  onError,
}: {
  open: boolean;
  mode: LabelEditorSaveDialogMode;
  onClose: () => void;
  onSaved?: () => void;
  onError?: (message: string) => void;
}) {
  const { designName, designFolderId, saveDesignWithOptions } = useLabelEditor();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [folderId, setFolderId] = useState("");
  const [folders, setFolders] = useState<LabelDesignFolderSummary[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!open) return;
    setMsg("");
    setName(mode === "save-as" ? suggestSaveAsName(designName) : designName.trim() || "My label");
    setFolderId(designFolderId ?? "");
    setNewFolderName("");
    startTransition(async () => {
      try {
        setFolders(await listCustomerLabelDesignFolders());
      } catch {
        setFolders([]);
      }
    });
  }, [open, mode, designName, designFolderId]);

  if (!open) return null;

  const title = mode === "save-as" ? "Save as…" : "Save label";
  const description =
    mode === "save-as"
      ? "Save a copy of this design under a new name."
      : "Choose a name and folder for your label.";

  const onSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setMsg("Enter a name for your label.");
      return;
    }
    startTransition(async () => {
      const r = await saveDesignWithOptions({
        name: trimmed,
        folderId: folderId || null,
        asNew: mode === "save-as",
      });
      if (!r.ok) {
        setMsg(r.error);
        onError?.(r.error);
        return;
      }
      onSaved?.();
      onClose();
    });
  };

  const onCreateFolder = () => {
    const folderName = newFolderName.trim();
    if (!folderName) return;
    startTransition(async () => {
      const r = await createCustomerLabelDesignFolder(folderName);
      if (!r.ok) {
        setMsg(r.error);
        return;
      }
      setFolders((prev) => [...prev, r.folder]);
      setFolderId(r.folder.id);
      setNewFolderName("");
    });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/40 p-4 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="label-save-dialog-title"
        className="w-full max-w-sm rounded-xl border-2 border-palm bg-white shadow-2xl dark:border-zinc-600 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-palm/15 px-4 py-3 dark:border-zinc-700">
          <h2 id="label-save-dialog-title" className="text-sm font-black text-palm dark:text-emerald-300">
            {title}
          </h2>
          <p className="mt-1 text-xs text-ink/60 dark:text-zinc-400">{description}</p>
        </div>

        <div className="space-y-3 p-4">
          <label className="block text-xs font-bold text-ink/55 dark:text-zinc-400">
            Label name
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSubmit();
                }
              }}
              className="mt-1 w-full border-2 border-palm/30 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
          </label>

          <label className="block text-xs font-bold text-ink/55 dark:text-zinc-400">
            Folder
            <select
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              className="mt-1 w-full border-2 border-palm/30 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            >
              <option value="">Unfiled</option>
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
              placeholder="New folder"
              className="min-w-0 flex-1 border px-2 py-1.5 text-xs dark:border-zinc-600 dark:bg-zinc-950"
            />
            <button
              type="button"
              className={btnSecondarySm}
              onClick={onCreateFolder}
              disabled={pending || !newFolderName.trim()}
            >
              Add
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
            className={`flex-1 ${btnSecondaryMd}`}
            onClick={onSubmit}
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
