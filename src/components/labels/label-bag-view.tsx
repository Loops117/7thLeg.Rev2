"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { LabelDesignPreview } from "@/components/labels/label-design-preview";
import { LabelAddToCartDialog } from "@/components/labels/label-add-to-cart-dialog";
import { LabelBagStrip } from "@/components/labels/label-bag-strip";
import { useLabelEditor } from "@/components/labels/label-editor-context";
import {
  bagItemDisplayName,
  bagItemSubtotalCents,
  bagLabelCounts,
  bagSubtotalCents,
  groupBagItems,
} from "@/lib/label-bag-stats";
import { formatPriceUsd } from "@/lib/product-slug";
import { LABEL_REMOVAL_MESSAGES, confirmLabelRemoval } from "@/lib/label-editor/confirm-removal";
import { sortBagItemsByAddedAt, type LabelBagItem } from "@/lib/label-editor/label-bag";
import {
  btnImportantMd,
  btnImportantLink,
  btnMainMd,
  btnSecondarySm,
} from "@/lib/btn-theme-classes";
import {
  newBagFolderId,
  readBagFolders,
  writeBagFolders,
  type LabelBagFolder,
} from "@/lib/label-editor/label-bag-folders";

const ALL_FOLDER_ID = "__all__";
const ALL_TEMPLATES_ID = "__all_templates__";

export function LabelBagView() {
  const {
    bagItems,
    templates,
    publicConfig,
    updateBagItem,
    updateBagItems,
    removeBagItems,
    removeFromBagOnly,
    emptyBag,
    dispatch,
    loadBagItemForEdit,
  } = useLabelEditor();

  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
  const [cartOpen, setCartOpen] = useState(false);
  const [bagFolders, setBagFolders] = useState<LabelBagFolder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string>(ALL_FOLDER_ID);
  const [templateFilterId, setTemplateFilterId] = useState(ALL_TEMPLATES_ID);
  const [newFolderName, setNewFolderName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionsOpen, setActionsOpen] = useState(false);
  const [folderPickOpen, setFolderPickOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setBagFolders(readBagFolders());
  }, []);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setActionsOpen(false);
        setFolderPickOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const inBagItems = useMemo(() => bagItems.filter((i) => i.inBag !== false), [bagItems]);

  const folderItems = useMemo(() => {
    if (activeFolderId === ALL_FOLDER_ID) return bagItems;
    return bagItems.filter((i) => i.bagFolderId === activeFolderId);
  }, [bagItems, activeFolderId]);

  const sortedFolderItems = useMemo(() => {
    if (activeFolderId === ALL_FOLDER_ID) return sortBagItemsByAddedAt(folderItems);
    return folderItems;
  }, [folderItems, activeFolderId]);

  const filteredItems = useMemo(() => {
    let items = sortedFolderItems;
    if (templateFilterId !== ALL_TEMPLATES_ID) {
      items = items.filter((i) => i.templateId === templateFilterId);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      items = items.filter((item) => {
        const saved = (item.savedDesignName ?? "").toLowerCase();
        const display = bagItemDisplayName(item).toLowerCase();
        return saved.includes(q) || display.includes(q);
      });
    }
    return items;
  }, [sortedFolderItems, templateFilterId, searchQuery]);

  const groups = useMemo(() => groupBagItems(filteredItems), [filteredItems]);
  const bagCounts = useMemo(() => bagLabelCounts(inBagItems), [inBagItems]);
  const totalCents = useMemo(() => bagSubtotalCents(inBagItems, templates), [inBagItems, templates]);
  const showBothCounts = bagCounts.individualLines !== bagCounts.totalWithQuantity;

  const toggleChecked = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      for (const item of filteredItems) next.add(item.id);
      return next;
    });
  };

  const clearChecked = () => setCheckedIds(new Set());

  const onCreateBagFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    const next = [...bagFolders, { id: newBagFolderId(), name }];
    writeBagFolders(next);
    setBagFolders(next);
    setNewFolderName("");
    setActiveFolderId(next[next.length - 1]!.id);
  };

  const sendCheckedToBag = () => {
    updateBagItems(checkedIds, { inBag: true });
    setActionsOpen(false);
    clearChecked();
  };

  const deleteChecked = () => {
    const ids = [...checkedIds];
    const n = ids.length;
    if (n === 0) return;
    if (!confirmLabelRemoval(LABEL_REMOVAL_MESSAGES.deleteFromLibrary(n))) return;
    startTransition(() => {
      removeBagItems(ids);
      clearChecked();
    });
    setActionsOpen(false);
  };

  const onEmptyBag = () => {
    if (inBagItems.length === 0) return;
    if (!confirmLabelRemoval(LABEL_REMOVAL_MESSAGES.emptyBag)) return;
    emptyBag();
  };

  const assignCheckedToFolder = useCallback(
    (folderId: string | null) => {
      updateBagItems(checkedIds, { bagFolderId: folderId });
      setFolderPickOpen(false);
      setActionsOpen(false);
      clearChecked();
      if (folderId) setActiveFolderId(folderId);
    },
    [checkedIds, updateBagItems],
  );

  if (bagItems.length === 0) {
    return (
      <div className="flex h-full w-full min-h-0 flex-col items-center justify-center gap-3 bg-zinc-200/80 p-6 text-center dark:bg-zinc-950">
        <p className="text-sm font-bold text-ink/70">No saved labels yet.</p>
        <p className="max-w-xs text-xs text-ink/55">
          Design a label on the canvas, save it, then use <span className="font-bold text-palm">Add</span> in the
          bottom-right corner.
        </p>
        <button
          type="button"
          className={`mt-2 ${btnMainMd}`}
          onClick={() => dispatch({ type: "SET_TOOL", tool: "draw" })}
        >
          Back to editor
        </button>
        <Link href="/store" className="text-xs font-bold text-lagoon-dark underline dark:text-emerald-300">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full min-h-0 flex-col overflow-hidden bg-zinc-200/80 dark:bg-zinc-950">
      <div className="shrink-0 overflow-visible border-b border-palm/15 bg-white/95 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900/95">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-palm dark:text-emerald-300">Label bag</h2>
            <p className="text-xs text-ink/60">
              {inBagItems.length === 0 ? (
                "Send labels to your bag from the selection below"
              ) : showBothCounts ? (
                <>
                  {bagCounts.individualLines} in bag · {bagCounts.totalWithQuantity} labels (with qty)
                </>
              ) : (
                <>
                  {bagCounts.totalWithQuantity} label{bagCounts.totalWithQuantity === 1 ? "" : "s"} in bag
                </>
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase text-ink/50">Bag total</p>
            <p className="text-lg font-black text-palm">{formatPriceUsd(totalCents)}</p>
          </div>
        </div>

        <div className="mt-3">
          <LabelBagStrip
            items={inBagItems}
            templates={templates}
            publicConfig={publicConfig}
            onRemoveFromBag={removeFromBagOnly}
            onEmptyBag={onEmptyBag}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={inBagItems.length === 0}
            className={`${btnImportantMd} disabled:opacity-50`}
            onClick={onEmptyBag}
          >
            Clear bag
          </button>
          <button
            type="button"
            disabled={inBagItems.length === 0}
            className={`ml-auto ${btnMainMd} disabled:opacity-50`}
            onClick={() => setCartOpen(true)}
          >
            Add labels to cart
            {inBagItems.length > 0 ? ` (${inBagItems.length})` : ""}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="flex w-44 shrink-0 flex-col border-r border-palm/15 bg-white/90 dark:border-zinc-700 dark:bg-zinc-900/90">
          <div className="border-b border-palm/10 p-2 dark:border-zinc-700">
            <p className="text-[10px] font-black uppercase text-palm/80">Folders</p>
            <div className="mt-2 flex gap-1">
              <input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="New folder"
                className="min-w-0 flex-1 border px-1.5 py-1 text-[10px] dark:bg-zinc-950"
              />
              <button
                type="button"
                className={btnSecondarySm}
                onClick={onCreateBagFolder}
                disabled={!newFolderName.trim()}
              >
                Add
              </button>
            </div>
          </div>
          <nav className="min-h-0 flex-1 overflow-y-auto p-1.5 text-xs" aria-label="Label folders">
            <button
              type="button"
              className={`mb-0.5 w-full rounded px-2 py-1.5 text-left font-bold ${
                activeFolderId === ALL_FOLDER_ID
                  ? "bg-palm text-white"
                  : "text-ink/80 hover:bg-palm/10 dark:hover:bg-zinc-800"
              }`}
              onClick={() => setActiveFolderId(ALL_FOLDER_ID)}
            >
              All ({bagItems.length})
            </button>
            {bagFolders.map((f) => {
              const n = bagItems.filter((i) => i.bagFolderId === f.id).length;
              return (
                <button
                  key={f.id}
                  type="button"
                  className={`mb-0.5 w-full rounded px-2 py-1.5 text-left font-bold ${
                    activeFolderId === f.id
                      ? "bg-palm text-white"
                      : "text-ink/80 hover:bg-palm/10 dark:hover:bg-zinc-800"
                  }`}
                  onClick={() => setActiveFolderId(f.id)}
                >
                  {f.name} ({n})
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-palm/10 bg-white/80 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-900/80">
            <p className="text-[10px] font-black uppercase text-palm/80">Label selection</p>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <label className="min-w-[10rem] flex-1 text-xs font-bold text-ink/55">
                Search
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Saved label name…"
                  className="mt-1 w-full border border-palm/30 px-2 py-1.5 text-sm font-normal dark:border-zinc-600 dark:bg-zinc-950"
                />
              </label>
              <label className="text-xs font-bold text-ink/55">
                Template
                <select
                  value={templateFilterId}
                  onChange={(e) => setTemplateFilterId(e.target.value)}
                  className="mt-1 block min-w-[8rem] border border-palm/30 px-2 py-1.5 text-sm font-normal dark:border-zinc-600 dark:bg-zinc-950"
                >
                  <option value={ALL_TEMPLATES_ID}>All templates</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className={btnSecondarySm}
                onClick={selectAllFiltered}
              >
                Select all
              </button>
              <button
                type="button"
                className={btnSecondarySm}
                onClick={clearChecked}
                disabled={checkedIds.size === 0}
              >
                Clear
              </button>
              <div className="relative" ref={actionsRef}>
                <button
                  type="button"
                  disabled={checkedIds.size === 0}
                  className={`${btnSecondarySm} disabled:opacity-50`}
                  onClick={() => {
                    setActionsOpen((o) => !o);
                    setFolderPickOpen(false);
                  }}
                >
                  Actions ({checkedIds.size})
                </button>
                {actionsOpen && checkedIds.size > 0 ? (
                  <div className="absolute right-0 top-full z-20 mt-1 min-w-[11rem] rounded border border-palm/25 bg-white py-1 shadow-lg dark:border-zinc-600 dark:bg-zinc-900">
                    <button
                      type="button"
                      className="block w-full px-3 py-1.5 text-left text-xs font-bold text-ink hover:bg-palm/10 dark:hover:bg-zinc-800"
                      onClick={sendCheckedToBag}
                    >
                      Send to bag
                    </button>
                    <button
                      type="button"
                      className="block w-full px-3 py-1.5 text-left text-xs font-bold text-ink hover:bg-palm/10 dark:hover:bg-zinc-800"
                      onClick={() => setFolderPickOpen((v) => !v)}
                    >
                      Add to folder →
                    </button>
                    {folderPickOpen ? (
                      <div className="border-t border-palm/10 py-1 dark:border-zinc-700">
                        <button
                          type="button"
                          className="block w-full px-3 py-1 text-left text-[11px] text-ink/70 hover:bg-palm/10 dark:hover:bg-zinc-800"
                          onClick={() => assignCheckedToFolder(null)}
                        >
                          No folder
                        </button>
                        {bagFolders.map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            className="block w-full px-3 py-1 text-left text-[11px] font-bold text-palm hover:bg-palm/10 dark:hover:bg-zinc-800"
                            onClick={() => assignCheckedToFolder(f.id)}
                          >
                            {f.name}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      className={`block w-full border-t border-palm/10 px-3 py-1.5 text-left ${btnImportantLink}`}
                      onClick={deleteChecked}
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            {folderItems.length === 0 ? (
              <p className="text-sm text-ink/60">No labels in this folder.</p>
            ) : filteredItems.length === 0 ? (
              <p className="text-sm text-ink/60">No labels match your filters.</p>
            ) : (
              <div className="space-y-6">
                {groups.map((group) => (
                  <section key={group.key}>
                    <h3 className="mb-2 text-xs font-black uppercase tracking-wide text-palm/80">
                      {group.templateName}
                      {group.savedDesignName ? (
                        <span className="ml-1 font-bold normal-case text-ink/70">· {group.savedDesignName}</span>
                      ) : null}
                    </h3>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                      {group.items.map((item) => {
                        const template = templates.find((t) => t.id === item.templateId) ?? templates[0]!;
                        const lineCents = bagItemSubtotalCents(
                          item,
                          templates,
                          item.inBag !== false ? inBagItems : [item],
                        );
                        const isChecked = checkedIds.has(item.id);
                        const inBag = item.inBag !== false;

                        return (
                          <article
                            key={item.id}
                            className={`flex flex-col rounded-lg border-2 bg-white p-2 shadow-sm dark:bg-zinc-900 ${
                              isChecked
                                ? "border-amber-500 ring-2 ring-amber-400/40"
                                : "border-palm/15 dark:border-zinc-600"
                            }`}
                          >
                            <label className="mb-1 flex items-center gap-1.5 text-xs font-bold text-ink/70">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleChecked(item.id)}
                              />
                              <span className="truncate">{bagItemDisplayName(item)}</span>
                            </label>
                            {inBag ? (
                              <span className="mb-1 inline-block w-fit rounded bg-palm/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-palm">
                                In bag
                              </span>
                            ) : null}
                            <div className="flex justify-center py-1">
                              <LabelDesignPreview
                                template={template}
                                doc={item.document}
                                publicConfig={publicConfig}
                                maxWidthPx={120}
                                showWatermark={false}
                              />
                            </div>
                            <p className="text-center text-[10px] text-ink/50">
                              {item.widthMm}×{item.heightMm} mm · qty {item.quantity}
                            </p>
                            <p className="text-center text-xs font-black text-palm">{formatPriceUsd(lineCents)}</p>

                            <div className="mt-2 flex flex-wrap justify-center gap-2">
                              <button
                                type="button"
                                className="text-[10px] font-bold text-palm underline"
                                onClick={() => loadBagItemForEdit(item)}
                              >
                                Edit
                              </button>
                              {!inBag ? (
                                <button
                                  type="button"
                                  className="text-[10px] font-bold text-palm underline"
                                  onClick={() => updateBagItem(item.id, { inBag: true })}
                                >
                                  Send to bag
                                </button>
                              ) : null}
                            </div>
                            <label className="mt-1 block text-center text-[10px] font-bold text-ink/50">
                              Qty
                              <input
                                type="number"
                                min={1}
                                max={999}
                                value={item.quantity}
                                onChange={(e) => {
                                  const q = Math.max(1, Math.min(999, Math.floor(Number(e.target.value)) || 1));
                                  updateBagItem(item.id, { quantity: q });
                                }}
                                className="ml-1 w-12 border px-1 py-0.5 text-center dark:bg-zinc-950"
                              />
                            </label>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-palm/15 bg-white/95 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-900/95">
        <button
          type="button"
          className="text-xs font-bold text-palm underline"
          onClick={() => dispatch({ type: "SET_TOOL", tool: "draw" })}
        >
          ← Back to editor
        </button>
      </div>

      <LabelAddToCartDialog
        open={cartOpen}
        items={inBagItems}
        templates={templates}
        onClose={() => setCartOpen(false)}
        onClearBag={emptyBag}
      />
    </div>
  );
}
