"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  createCustomerLabelDesignFolder,
  listCustomerLabelDesignFolders,
  type LabelDesignFolderSummary,
} from "@/app/actions/label-design-folders";
import {
  deleteCustomerLabelDesign,
  listCustomerLabelDesigns,
  loadCustomerLabelDesign,
  moveCustomerLabelDesignToFolder,
  type SavedLabelDesignSummary,
} from "@/app/actions/label-designs";
import {
  LabelEditorSaveDialog,
  type LabelEditorSaveDialogMode,
} from "@/components/labels/label-editor-save-dialog";
import { useLabelEditor } from "@/components/labels/label-editor-context";
import { btnImportantLink, btnSecondaryMd, btnSecondarySm } from "@/lib/btn-theme-classes";
import { LABEL_REMOVAL_MESSAGES, confirmLabelRemoval } from "@/lib/label-editor/confirm-removal";
import { parseLabelEditorDocument } from "@/lib/label-editor/document";

const UNFILED_KEY = "__unfiled__";

export function LabelEditorSavedDesignsPanel({
  onMessage,
  className = "",
}: {
  onMessage: (msg: string) => void;
  className?: string;
}) {
  const router = useRouter();
  const {
    dispatch,
    template,
    savedDesignId,
    setSavedDesignId,
    designName,
    setDesignName,
    designFolderId,
    setDesignFolderId,
    markDocumentSaved,
    isDocumentDirty,
    saveCurrentDesign,
    isLoggedInCustomer,
  } = useLabelEditor();

  const [pending, startTransition] = useTransition();
  const [saveDialogMode, setSaveDialogMode] = useState<LabelEditorSaveDialogMode | null>(null);
  const [savedList, setSavedList] = useState<SavedLabelDesignSummary[]>([]);
  const [designFolders, setDesignFolders] = useState<LabelDesignFolderSummary[]>([]);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(() => new Set());
  const [newDesignFolderName, setNewDesignFolderName] = useState("");
  const [dragDesignId, setDragDesignId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const loadSavedList = useCallback(() => {
    startTransition(async () => {
      try {
        const [list, folders] = await Promise.all([
          listCustomerLabelDesigns(),
          listCustomerLabelDesignFolders(),
        ]);
        setSavedList(list);
        setDesignFolders(folders);
      } catch {
        setSavedList([]);
        setDesignFolders([]);
      }
    });
  }, []);

  useEffect(() => {
    loadSavedList();
  }, [loadSavedList]);

  const designsByFolder = useMemo(() => {
    const map = new Map<string, SavedLabelDesignSummary[]>();
    map.set(UNFILED_KEY, []);
    for (const f of designFolders) map.set(f.id, []);
    for (const d of savedList) {
      const key = d.folderId ?? UNFILED_KEY;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    return map;
  }, [savedList, designFolders]);

  const toggleFolder = (folderKey: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderKey)) next.delete(folderKey);
      else next.add(folderKey);
      return next;
    });
  };

  const openDesign = (d: SavedLabelDesignSummary) => {
    startTransition(async () => {
      const r = await loadCustomerLabelDesign(d.id);
      if (!r.ok) {
        onMessage(r.error);
        return;
      }
      const doc = parseLabelEditorDocument(r.document, r.templateId);
      if (doc.templateId !== template.id) {
        router.push(`/labels?template=${doc.templateId}&load=${d.id}`);
        return;
      }
      dispatch({ type: "SET_DOC", doc });
      setSavedDesignId(d.id);
      setDesignName(r.name);
      setDesignFolderId(d.folderId);
      markDocumentSaved();
      onMessage("Design loaded.");
    });
  };

  const onDropToFolder = (folderKey: string) => {
    if (!dragDesignId) return;
    const folderId = folderKey === UNFILED_KEY ? null : folderKey;
    const design = savedList.find((d) => d.id === dragDesignId);
    if (!design || design.folderId === folderId) {
      setDragDesignId(null);
      setDropTarget(null);
      return;
    }
    startTransition(async () => {
      const r = await moveCustomerLabelDesignToFolder(dragDesignId, folderId);
      if (!r.ok) {
        onMessage(r.error);
        return;
      }
      if (savedDesignId === dragDesignId) setDesignFolderId(folderId);
      loadSavedList();
      onMessage("Moved to folder.");
    });
    setDragDesignId(null);
    setDropTarget(null);
  };

  const handleSave = () => {
    if (!savedDesignId) {
      setSaveDialogMode("first-save");
      return;
    }
    startTransition(async () => {
      const r = await saveCurrentDesign();
      if (!r.ok) {
        onMessage(r.error ?? "Save failed.");
        return;
      }
      onMessage("Saved.");
      loadSavedList();
    });
  };

  return (
    <div className={`flex min-h-0 flex-1 flex-col gap-3 ${className}`}>
      <div className="shrink-0 space-y-2">
        <h2 className="text-sm font-black text-palm dark:text-emerald-300">Saved designs</h2>

        {savedDesignId ? (
          <div className="rounded-lg border border-palm/20 bg-surf/50 px-2 py-1.5 dark:border-zinc-600 dark:bg-zinc-800/50">
            <p className="text-[10px] font-bold uppercase tracking-wide text-ink/50 dark:text-zinc-500">
              Open design
            </p>
            <label className="mt-0.5 block text-xs font-bold text-ink/55 dark:text-zinc-400">
              Name
              <input
                value={designName}
                onChange={(e) => setDesignName(e.target.value)}
                className="mt-0.5 w-full border-2 border-palm/30 px-2 py-1.5 text-sm font-bold text-ink dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </label>
            {isDocumentDirty ? (
              <p className="mt-1 text-[10px] font-bold text-mango">Unsaved changes</p>
            ) : (
              <p className="mt-1 text-[10px] text-ink/45 dark:text-zinc-500">All changes saved</p>
            )}
          </div>
        ) : (
          <label className="block text-xs font-bold text-ink/55 dark:text-zinc-400">
            Name
            <input
              value={designName}
              onChange={(e) => setDesignName(e.target.value)}
              className="mt-1 w-full border-2 border-palm/30 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
          </label>
        )}

        {isLoggedInCustomer ? (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={handleSave}
              className={`min-w-0 flex-1 ${btnSecondaryMd} disabled:opacity-50`}
            >
              Save
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setSaveDialogMode("save-as")}
              className={`min-w-0 flex-1 ${btnSecondaryMd} disabled:opacity-50`}
            >
              Save as…
            </button>
          </div>
        ) : (
          <p className="text-xs text-ink/55">
            <Link href="/login" className="font-bold underline">
              Sign in
            </Link>{" "}
            to save designs to your account.
          </p>
        )}

        {isLoggedInCustomer ? (
          <label className="block text-xs font-bold text-ink/55 dark:text-zinc-400">
            Save to folder
            <select
              value={designFolderId ?? ""}
              onChange={(e) => setDesignFolderId(e.target.value || null)}
              className="mt-1 w-full border-2 border-palm/30 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            >
              <option value="">Unfiled</option>
              {designFolders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {isLoggedInCustomer ? (
          <div className="flex gap-2">
            <input
              value={newDesignFolderName}
              onChange={(e) => setNewDesignFolderName(e.target.value)}
              placeholder="New folder"
              className="min-w-0 flex-1 border px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-950"
            />
            <button
              type="button"
              className={btnSecondarySm}
              disabled={pending || !newDesignFolderName.trim()}
              onClick={() => {
                startTransition(async () => {
                  const r = await createCustomerLabelDesignFolder(newDesignFolderName);
                  if (!r.ok) {
                    onMessage(r.error);
                    return;
                  }
                  setDesignFolders((prev) => [...prev, r.folder]);
                  setNewDesignFolderName("");
                  onMessage("Folder created.");
                });
              }}
            >
              Add folder
            </button>
          </div>
        ) : null}
      </div>

      {isLoggedInCustomer ? (
        <div
          className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-palm/15 dark:border-zinc-700"
          role="tree"
          aria-label="Saved designs"
        >
          <FolderSection
            folderKey={UNFILED_KEY}
            title="Unfiled"
            designs={designsByFolder.get(UNFILED_KEY) ?? []}
            collapsed={collapsedFolders.has(UNFILED_KEY)}
            onToggle={() => toggleFolder(UNFILED_KEY)}
            currentDesignId={savedDesignId}
            dragDesignId={dragDesignId}
            dropTarget={dropTarget}
            onDragStart={setDragDesignId}
            onDragEnd={() => {
              setDragDesignId(null);
              setDropTarget(null);
            }}
            onDragOver={(key) => setDropTarget(key)}
            onDrop={onDropToFolder}
            onOpen={openDesign}
            onDelete={(d) => {
              if (!confirmLabelRemoval(LABEL_REMOVAL_MESSAGES.deleteSavedDesign(d.name))) return;
              startTransition(async () => {
                const r = await deleteCustomerLabelDesign(d.id);
                if (!r.ok) {
                  onMessage(r.error);
                  return;
                }
                if (savedDesignId === d.id) setSavedDesignId(null);
                loadSavedList();
                onMessage("Design deleted.");
              });
            }}
          />
          {designFolders.map((folder) => (
            <FolderSection
              key={folder.id}
              folderKey={folder.id}
              title={folder.name}
              designs={designsByFolder.get(folder.id) ?? []}
              collapsed={collapsedFolders.has(folder.id)}
              onToggle={() => toggleFolder(folder.id)}
              currentDesignId={savedDesignId}
              dragDesignId={dragDesignId}
              dropTarget={dropTarget}
              onDragStart={setDragDesignId}
              onDragEnd={() => {
                setDragDesignId(null);
                setDropTarget(null);
              }}
              onDragOver={(key) => setDropTarget(key)}
              onDrop={onDropToFolder}
              onOpen={openDesign}
              onDelete={(d) => {
                if (!confirmLabelRemoval(LABEL_REMOVAL_MESSAGES.deleteSavedDesign(d.name))) return;
                startTransition(async () => {
                  const r = await deleteCustomerLabelDesign(d.id);
                  if (!r.ok) {
                    onMessage(r.error);
                    return;
                  }
                  if (savedDesignId === d.id) setSavedDesignId(null);
                  loadSavedList();
                  onMessage("Design deleted.");
                });
              }}
            />
          ))}
          {savedList.length === 0 && designFolders.length === 0 ? (
            <p className="p-3 text-xs text-ink/50">No saved designs yet. Use Save to add one.</p>
          ) : null}
        </div>
      ) : null}

      <LabelEditorSaveDialog
        open={saveDialogMode !== null}
        mode={saveDialogMode ?? "first-save"}
        onClose={() => setSaveDialogMode(null)}
        onSaved={() => {
          onMessage(saveDialogMode === "save-as" ? "Saved as new design." : "Saved to your account.");
          loadSavedList();
        }}
        onError={onMessage}
      />
    </div>
  );
}

function FolderSection({
  folderKey,
  title,
  designs,
  collapsed,
  onToggle,
  currentDesignId,
  dragDesignId,
  dropTarget,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onOpen,
  onDelete,
}: {
  folderKey: string;
  title: string;
  designs: SavedLabelDesignSummary[];
  collapsed: boolean;
  onToggle: () => void;
  currentDesignId: string | null;
  dragDesignId: string | null;
  dropTarget: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOver: (key: string) => void;
  onDrop: (key: string) => void;
  onOpen: (d: SavedLabelDesignSummary) => void;
  onDelete: (d: SavedLabelDesignSummary) => void;
}) {
  const isDropTarget = dropTarget === folderKey;

  return (
    <div
      className={`border-b border-palm/10 last:border-b-0 dark:border-zinc-700 ${
        isDropTarget ? "bg-mango/10 ring-2 ring-inset ring-mango/40" : ""
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(folderKey);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(folderKey);
      }}
    >
      <button
        type="button"
        className="flex w-full items-center gap-1.5 px-2 py-2 text-left text-xs font-black text-palm hover:bg-surf/80 dark:text-emerald-300 dark:hover:bg-zinc-800/80"
        onClick={onToggle}
        aria-expanded={!collapsed}
      >
        <span className="w-3 shrink-0 text-center text-[10px] text-ink/50" aria-hidden>
          {collapsed ? "▸" : "▾"}
        </span>
        <span className="min-w-0 flex-1 truncate">{title}</span>
        <span className="shrink-0 text-[10px] font-bold text-ink/45 dark:text-zinc-500">{designs.length}</span>
      </button>
      {!collapsed ? (
        <ul className="space-y-1 px-2 pb-2">
          {designs.length === 0 ? (
            <li className="rounded border border-dashed border-palm/20 px-2 py-2 text-[10px] text-ink/45 dark:border-zinc-600 dark:text-zinc-500">
              Drop designs here
            </li>
          ) : null}
          {designs.map((d) => (
            <DesignRow
              key={d.id}
              design={d}
              isCurrent={currentDesignId === d.id}
              isDragging={dragDesignId === d.id}
              onDragStart={() => onDragStart(d.id)}
              onDragEnd={onDragEnd}
              onOpen={() => onOpen(d)}
              onDelete={() => onDelete(d)}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function DesignRow({
  design,
  isCurrent,
  isDragging,
  onDragStart,
  onDragEnd,
  onOpen,
  onDelete,
}: {
  design: SavedLabelDesignSummary;
  isCurrent: boolean;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <li
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`rounded border px-2 py-1.5 text-xs ${
        isCurrent
          ? "border-palm bg-palm/10 dark:border-emerald-600 dark:bg-emerald-950/30"
          : "border-palm/15 bg-white dark:border-zinc-600 dark:bg-zinc-900"
      } ${isDragging ? "opacity-50" : ""}`}
    >
      <p className="truncate font-bold text-ink dark:text-zinc-100">{design.name}</p>
      <p className="truncate text-[10px] text-ink/50 dark:text-zinc-500">{design.templateName}</p>
      <div className="mt-1.5 flex gap-2">
        <button type="button" className="font-bold text-palm underline dark:text-emerald-300" onClick={onOpen}>
          Open
        </button>
        <button type="button" className={btnImportantLink} onClick={onDelete}>
          Delete
        </button>
      </div>
    </li>
  );
}
