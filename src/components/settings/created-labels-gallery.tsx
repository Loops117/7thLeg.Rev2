"use client";

import { btnMainMd } from "@/lib/btn-theme-classes";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LabelDesignPreview } from "@/components/labels/label-design-preview";
import type { LabelBuilderPublicConfig } from "@/lib/label-builder-public";
import {
  groupCreatedLabelsByCustomer,
  type CreatedLabelCustomerGroup,
  type CreatedLabelGalleryItem,
} from "@/lib/created-labels-gallery";

const SOURCE_STYLES: Record<
  CreatedLabelGalleryItem["source"],
  { label: string; className: string }
> = {
  saved: {
    label: "Saved",
    className: "bg-palm/15 text-palm dark:bg-emerald-950/50 dark:text-emerald-300",
  },
  cart: {
    label: "Cart",
    className: "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200",
  },
  bag: {
    label: "Selection",
    className: "bg-sky-100 text-sky-900 dark:bg-sky-950/60 dark:text-sky-200",
  },
};

function LabelThumbButton({
  item,
  publicConfig,
  isActive,
  onSelect,
  compact,
}: {
  item: CreatedLabelGalleryItem;
  publicConfig: LabelBuilderPublicConfig;
  isActive: boolean;
  onSelect: () => void;
  compact?: boolean;
}) {
  const src = SOURCE_STYLES[item.source];
  return (
    <button
      type="button"
      onClick={onSelect}
      title={item.name}
      className={`flex w-full flex-col rounded-lg border-2 bg-white p-1.5 text-left shadow-sm transition dark:bg-zinc-900 ${
        isActive
          ? "border-palm ring-2 ring-palm/30 dark:border-emerald-500"
          : "border-palm/15 hover:border-palm/40 dark:border-zinc-600 dark:hover:border-zinc-500"
      }`}
    >
      <span
        className={`mb-1 inline-block max-w-full truncate rounded px-1 py-0.5 font-black uppercase ${src.className} ${
          compact ? "text-[7px]" : "text-[8px]"
        }`}
      >
        {src.label}
      </span>
      <span
        className={`line-clamp-2 font-bold leading-tight text-ink dark:text-zinc-100 ${
          compact ? "text-[9px]" : "text-[10px]"
        }`}
      >
        {item.name}
      </span>
      <div
        className={`mt-1 flex items-center justify-center rounded bg-surf/30 p-1 dark:bg-zinc-800/50 ${
          compact ? "min-h-[3.5rem]" : "min-h-[4.5rem]"
        }`}
      >
        <LabelDesignPreview
          template={item.template}
          doc={item.doc}
          publicConfig={publicConfig}
          maxWidthPx={compact ? 72 : 96}
          showWatermark={false}
        />
      </div>
      {!compact ? (
        <span className="mt-0.5 line-clamp-1 text-[9px] text-ink/50 dark:text-zinc-500">{item.templateName}</span>
      ) : null}
    </button>
  );
}

function CustomerLabelsDialog({
  group,
  publicConfig,
  onClose,
}: {
  group: CreatedLabelCustomerGroup;
  publicConfig: LabelBuilderPublicConfig;
  onClose: () => void;
}) {
  const [selectedKey, setSelectedKey] = useState(group.items[0]?.key ?? "");

  const selected = useMemo(
    () => group.items.find((i) => i.key === selectedKey) ?? group.items[0] ?? null,
    [group.items, selectedKey],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-ink/55 p-2 sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="created-labels-customer-title"
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border-2 border-palm bg-white shadow-2xl dark:border-zinc-600 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-palm/15 px-4 py-3 dark:border-zinc-700">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 id="created-labels-customer-title" className="text-sm font-black text-palm dark:text-emerald-300">
                {group.customer}
              </h2>
              {group.customerEmail !== "—" ? (
                <p className="mt-0.5 text-xs text-ink/55 dark:text-zinc-500">{group.customerEmail}</p>
              ) : null}
              <p className="mt-1 text-xs text-ink/60 dark:text-zinc-400">
                {group.items.length} label{group.items.length === 1 ? "" : "s"} — scroll the list, select one to
                preview
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded border border-palm/30 px-2 py-1 text-xs font-bold text-palm dark:border-zinc-600 dark:text-emerald-300"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          <div className="flex max-h-[38vh] min-h-0 shrink-0 flex-col border-b border-palm/15 sm:max-h-none sm:w-52 sm:border-b-0 sm:border-r dark:border-zinc-700">
            <p className="shrink-0 px-3 py-2 text-[10px] font-black uppercase text-palm/70 dark:text-emerald-300/80">
              Labels
            </p>
            <ul className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 pb-2">
              {group.items.map((item) => (
                <li key={item.key} className="mb-2 last:mb-0">
                  <LabelThumbButton
                    item={item}
                    publicConfig={publicConfig}
                    isActive={selected?.key === item.key}
                    onSelect={() => setSelectedKey(item.key)}
                    compact
                  />
                </li>
              ))}
            </ul>
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {selected ? (
              <>
                <div className="shrink-0 border-b border-palm/10 px-4 py-2 dark:border-zinc-700">
                  <p className="text-sm font-bold text-ink dark:text-zinc-100">{selected.name}</p>
                  <p className="text-[11px] text-ink/50 dark:text-zinc-500">
                    {SOURCE_STYLES[selected.source].label} · {selected.templateName} · {selected.subtitle}
                  </p>
                </div>
                <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto overflow-x-hidden bg-surf/20 p-4 dark:bg-zinc-950/40">
                  <LabelDesignPreview
                    template={selected.template}
                    doc={selected.doc}
                    publicConfig={publicConfig}
                    maxWidthPx={420}
                    showWatermark={false}
                  />
                </div>
              </>
            ) : (
              <p className="p-6 text-sm text-ink/50">No labels in this group.</p>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-palm/15 p-3 dark:border-zinc-700">
          <button
            type="button"
            className={`w-full ${btnMainMd}`}
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export function CreatedLabelsGallery({
  items,
  publicConfig,
  skipped,
}: {
  items: CreatedLabelGalleryItem[];
  publicConfig: LabelBuilderPublicConfig;
  skipped: number;
  truncatedNote?: string;
}) {
  const [openGroup, setOpenGroup] = useState<CreatedLabelCustomerGroup | null>(null);
  const groups = useMemo(() => groupCreatedLabelsByCustomer(items), [items]);
  const closeGroup = useCallback(() => setOpenGroup(null), []);

  if (items.length === 0) {
    return (
      <p className="rounded border border-dashed border-palm/25 px-4 py-8 text-center text-sm text-ink/50 dark:border-zinc-600">
        No saved or cart labels to preview{skipped > 0 ? ` (${skipped} could not be rendered)` : ""}.
      </p>
    );
  }

  return (
    <>
      <p className="text-xs text-ink/60 dark:text-zinc-500">
        {items.length} label preview{items.length === 1 ? "" : "s"} across {groups.length} customer
        {groups.length === 1 ? "" : "s"}. Includes each row in label selection (bag), saved designs, and cart lines
        (bundles expanded).
        {skipped > 0 ? ` ${skipped} design(s) skipped (invalid or missing template).` : ""}
      </p>
      <p className="mt-1 text-[11px] text-ink/45 dark:text-zinc-500">
        Label selection syncs when signed in and the bag changes. Open the label editor once to upload an existing
        browser-only bag.
      </p>

      <div className="mt-3 max-h-[min(70vh,720px)] overflow-y-auto overflow-x-hidden rounded border-2 border-palm/20 dark:border-zinc-600">
        <ul className="divide-y divide-palm/10 dark:divide-zinc-700">
          {groups.map((group) => (
            <li key={group.groupKey}>
              <button
                type="button"
                onClick={() => setOpenGroup(group)}
                className="flex w-full items-center justify-between gap-3 bg-white px-4 py-3 text-left transition hover:bg-surf/60 dark:bg-zinc-900/40 dark:hover:bg-zinc-800/60"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink dark:text-zinc-100">{group.customer}</p>
                  {group.customerEmail !== "—" ? (
                    <p className="truncate text-xs text-ink/55 dark:text-zinc-500">{group.customerEmail}</p>
                  ) : null}
                </div>
                <span className="shrink-0 rounded-full bg-palm/10 px-2.5 py-1 text-xs font-black text-palm dark:bg-emerald-950/50 dark:text-emerald-300">
                  {group.items.length} label{group.items.length === 1 ? "" : "s"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {openGroup ? (
        <CustomerLabelsDialog group={openGroup} publicConfig={publicConfig} onClose={closeGroup} />
      ) : null}
    </>
  );
}
