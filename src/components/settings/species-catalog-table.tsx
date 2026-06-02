"use client";

import { btnImportantLink } from "@/lib/btn-theme-classes";

import type { SpeciesCatalogRow } from "@/lib/species-catalog";

/** ~8 table body rows before vertical scroll (header stays visible). */
const SCROLL_BODY_MAX_PX = 288;

export function SpeciesCatalogTable({
  rows,
  readOnly = false,
  scrollMaxRows,
  emptyMessage = "No entries match your filters.",
  selectedIds,
  onToggleOne,
  onToggleAll,
  allVisibleSelected = false,
  someSelected = false,
  onEdit,
  onDelete,
  pending = false,
}: {
  rows: SpeciesCatalogRow[];
  readOnly?: boolean;
  scrollMaxRows?: number;
  emptyMessage?: string;
  selectedIds?: Set<string>;
  onToggleOne?: (id: string) => void;
  onToggleAll?: () => void;
  allVisibleSelected?: boolean;
  someSelected?: boolean;
  onEdit?: (row: SpeciesCatalogRow) => void;
  onDelete?: (row: SpeciesCatalogRow) => void;
  pending?: boolean;
}) {
  const showSelection = !readOnly && selectedIds != null && onToggleOne != null && onToggleAll != null;
  const showActions = !readOnly && (onEdit != null || onDelete != null);
  const scrollBody = scrollMaxRows != null && scrollMaxRows > 0;
  const colSpan = 7 + (showSelection ? 1 : 0) + (showActions ? 1 : 0);

  const table = (
    <table className="admin-striped w-full min-w-[720px] border-collapse text-left text-sm">
      <thead className={scrollBody ? "sticky top-0 z-10 bg-palm/10 dark:bg-zinc-800/95" : undefined}>
        <tr className="border-b-2 border-palm/30 bg-palm/10">
          {showSelection ? (
            <th className="w-10 px-2 py-2">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected;
                }}
                onChange={onToggleAll}
                aria-label={allVisibleSelected ? "Unselect all rows" : "Select all rows"}
                className="h-4 w-4 accent-palm"
              />
            </th>
          ) : null}
          <th className="px-2 py-2 text-xs font-bold text-palm">Type</th>
          <th className="px-2 py-2 text-xs font-bold text-palm">Genus</th>
          <th className="px-2 py-2 text-xs font-bold text-palm">Species</th>
          <th className="px-2 py-2 text-xs font-bold text-palm">Common name</th>
          <th className="px-2 py-2 text-xs font-bold text-palm">Morph</th>
          <th className="px-2 py-2 text-xs font-bold text-palm">Date added</th>
          <th className="px-2 py-2 text-xs font-bold text-palm">Approved</th>
          {showActions ? <th className="px-2 py-2 text-xs font-bold text-palm">Actions</th> : null}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr className="admin-empty-row">
            <td colSpan={colSpan} className="px-3 py-6 text-center text-xs text-ink/60">
              {emptyMessage}
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr key={row.id} className="border-b border-palm/15">
              {showSelection ? (
                <td className="px-2 py-2">
                  <input
                    type="checkbox"
                    checked={selectedIds!.has(row.id)}
                    onChange={() => onToggleOne!(row.id)}
                    aria-label={`Select ${row.genus} ${row.species}`}
                    className="h-4 w-4 accent-palm"
                  />
                </td>
              ) : null}
              <td className="px-2 py-2 text-ink/85">{row.type || "—"}</td>
              <td className="px-2 py-2 font-medium italic text-ink">{row.genus}</td>
              <td className="px-2 py-2 text-ink">{row.species}</td>
              <td className="max-w-[10rem] truncate px-2 py-2 text-ink/85" title={row.commonName}>
                {row.commonName || "—"}
              </td>
              <td className="max-w-[8rem] truncate px-2 py-2 text-ink/85" title={row.morph}>
                {row.morph || "—"}
              </td>
              <td className="whitespace-nowrap px-2 py-2 text-ink/75">
                {new Date(row.createdAt).toLocaleDateString()}
              </td>
              <td className="px-2 py-2">
                {row.approved ? (
                  <span className="inline-block rounded bg-palm/15 px-1.5 py-0.5 text-[10px] font-bold text-palm dark:bg-emerald-900/40 dark:text-emerald-200">
                    Yes
                  </span>
                ) : (
                  <span className="inline-block rounded bg-zinc-200/80 px-1.5 py-0.5 text-[10px] font-bold text-ink/60 dark:bg-zinc-800 dark:text-zinc-400">
                    No
                  </span>
                )}
              </td>
              {showActions ? (
                <td className="whitespace-nowrap px-2 py-2">
                  {onEdit ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => onEdit(row)}
                      className="mr-2 text-xs font-bold text-lagoon-dark underline dark:text-emerald-300"
                    >
                      Edit
                    </button>
                  ) : null}
                  {onDelete ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => onDelete(row)}
                      className={btnImportantLink}
                    >
                      Delete
                    </button>
                  ) : null}
                </td>
              ) : null}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );

  return (
    <div className="admin-table-shell overflow-x-auto rounded border border-palm/25 bg-white shadow-sm dark:border-zinc-600 dark:bg-zinc-900/40">
      {scrollBody ? (
        <div style={{ maxHeight: SCROLL_BODY_MAX_PX }} className="overflow-y-auto overflow-x-auto">
          {table}
        </div>
      ) : (
        table
      )}
    </div>
  );
}
