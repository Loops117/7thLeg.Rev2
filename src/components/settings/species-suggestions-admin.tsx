"use client";

import { useMemo, useState, useTransition } from "react";
import {
  approveSpeciesSuggestion,
  deleteSpeciesSuggestionPermanently,
  removeSpeciesSuggestion,
  unapproveSpeciesSuggestion,
  updateSpeciesSuggestionLabel,
} from "@/app/actions/species-suggestions";
import { btnImportantMd, btnMainMd, btnSecondaryMd } from "@/lib/btn-theme-classes";
import {
  filterSpeciesSuggestionRows,
  sortSpeciesSuggestionRows,
  type SpeciesSuggestionAdminRow,
  type SpeciesSuggestionApprovedRow,
  type SpeciesSuggestionSortKey,
  type SpeciesSuggestionStatusFilter,
} from "@/lib/species-suggestions";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function StatusBadge({ status }: { status: SpeciesSuggestionAdminRow["status"] }) {
  if (status === "APPROVED") {
    return <span className="text-xs font-bold text-palm dark:text-emerald-300">Approved</span>;
  }
  if (status === "REMOVED") {
    return <span className="text-xs font-bold text-ink/50">Removed</span>;
  }
  return <span className="text-xs font-bold text-coral">Pending</span>;
}

export function SpeciesSuggestionsAdmin({
  initialRows,
  initialApproved,
}: {
  initialRows: SpeciesSuggestionAdminRow[];
  initialApproved: SpeciesSuggestionApprovedRow[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [approved, setApproved] = useState(initialApproved);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<SpeciesSuggestionStatusFilter>("all");
  const [sort, setSort] = useState<SpeciesSuggestionSortKey>("date_desc");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");
  const [editingApprovedId, setEditingApprovedId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  const visible = useMemo(
    () => sortSpeciesSuggestionRows(filterSpeciesSuggestionRows(rows, { q, status }), sort),
    [rows, q, status, sort],
  );

  function syncApprovedFromRows(nextRows: SpeciesSuggestionAdminRow[]) {
    setApproved(
      nextRows
        .filter((r) => r.status === "APPROVED")
        .sort((a, b) => (b.approvedAt ?? "").localeCompare(a.approvedAt ?? ""))
        .map((r) => ({
          id: r.id,
          label: r.label,
          approvedAt: r.approvedAt ?? "",
          suggestionCount: r.suggestionCount,
        })),
    );
  }

  function runAction(fn: () => Promise<{ ok: boolean; error?: string }>, onOk?: () => void) {
    setMsg("");
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) {
        setMsg(r.error ?? "Action failed.");
        return;
      }
      onOk?.();
    });
  }

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <h2 className="text-lg font-black text-palm dark:text-zinc-200">All suggestions</h2>
        <div className="flex flex-wrap items-end gap-3 rounded border-2 border-palm/25 bg-white/90 p-4 shadow-sm dark:border-zinc-600 dark:bg-zinc-900/60">
          <label className="block min-w-[10rem] flex-1 text-xs font-bold text-ink dark:text-zinc-200">
            Search
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Species or design name…"
              className="mt-1 w-full border-2 border-palm-mid px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>
          <label className="block text-xs font-bold text-ink dark:text-zinc-200">
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as SpeciesSuggestionStatusFilter)}
              className="mt-1 block min-w-[8rem] border-2 border-palm-mid px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="removed">Removed</option>
            </select>
          </label>
          <label className="block text-xs font-bold text-ink dark:text-zinc-200">
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SpeciesSuggestionSortKey)}
              className="mt-1 block min-w-[11rem] border-2 border-palm-mid px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            >
              <option value="date_desc">First added (newest)</option>
              <option value="date_asc">First added (oldest)</option>
              <option value="count_desc">Most votes</option>
              <option value="count_asc">Fewest votes</option>
              <option value="label_asc">Name A–Z</option>
              <option value="label_desc">Name Z–A</option>
            </select>
          </label>
        </div>

        {msg ? <p className="text-sm font-medium text-palm dark:text-emerald-300">{msg}</p> : null}

        <div className="admin-table-shell overflow-x-auto rounded border-2 border-palm bg-white shadow-sm dark:border-zinc-600 dark:bg-zinc-900">
          <table className="admin-striped w-full min-w-[36rem] text-left text-sm">
            <thead>
              <tr className="border-b-2 border-palm bg-surf/50 font-bold text-palm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100">
                <th className="px-3 py-2">Suggestion</th>
                <th className="px-3 py-2">First added</th>
                <th className="px-3 py-2 text-center">Votes</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr className="admin-empty-row">
                  <td colSpan={5} className="px-3 py-8 text-center text-ink/60 dark:text-zinc-400">
                    No suggestions match your filters.
                  </td>
                </tr>
              ) : (
                visible.map((row) => (
                  <tr key={row.id} className="border-t border-palm/15 dark:border-zinc-700">
                    <td className="px-3 py-2 font-medium text-ink dark:text-zinc-100">{row.label}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-ink/80 dark:text-zinc-300">
                      {formatDate(row.firstSuggestedAt)}
                    </td>
                    <td className="px-3 py-2 text-center font-bold">{row.suggestionCount}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap justify-end gap-1">
                        {row.status === "PENDING" ? (
                          <>
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() =>
                                runAction(() => approveSpeciesSuggestion(row.id), () => {
                                  const next = rows.map((r) =>
                                    r.id === row.id
                                      ? {
                                          ...r,
                                          status: "APPROVED" as const,
                                          approvedAt: new Date().toISOString(),
                                        }
                                      : r,
                                  );
                                  setRows(next);
                                  syncApprovedFromRows(next);
                                  setMsg("Approved.");
                                })
                              }
                              className={btnMainMd}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() =>
                                runAction(() => removeSpeciesSuggestion(row.id), () => {
                                  const next = rows.map((r) =>
                                    r.id === row.id ? { ...r, status: "REMOVED" as const } : r,
                                  );
                                  setRows(next);
                                  syncApprovedFromRows(next);
                                  setMsg("Removed.");
                                })
                              }
                              className={btnSecondaryMd}
                            >
                              Remove
                            </button>
                          </>
                        ) : row.status === "APPROVED" ? (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() =>
                              runAction(() => unapproveSpeciesSuggestion(row.id), () => {
                                const next = rows.map((r) =>
                                  r.id === row.id
                                    ? { ...r, status: "PENDING" as const, approvedAt: null }
                                    : r,
                                );
                                setRows(next);
                                syncApprovedFromRows(next);
                                setMsg("Moved back to pending.");
                              })
                            }
                            className={btnSecondaryMd}
                          >
                            Unapprove
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => {
                              if (
                                !window.confirm(
                                  "Permanently delete this suggestion and all vote records? This cannot be undone.",
                                )
                              ) {
                                return;
                              }
                              runAction(() => deleteSpeciesSuggestionPermanently(row.id), () => {
                                const next = rows.filter((r) => r.id !== row.id);
                                setRows(next);
                                syncApprovedFromRows(next);
                                setMsg("Deleted permanently.");
                              });
                            }}
                            className={btnImportantMd}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-black text-palm dark:text-zinc-200">Previously approved list</h2>
        <p className="max-w-2xl text-sm text-ink/75 dark:text-zinc-400">
          These appear on <strong>Suggestion box</strong> panes (count is set per pane under Settings → Home or About).
          Edit a label to fix spelling; remove from this list to unapprove.
        </p>

        {approved.length === 0 ? (
          <p className="text-sm text-ink/60">No approved suggestions yet.</p>
        ) : (
          <ul className="space-y-3">
            {approved.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center gap-3 rounded border-2 border-palm/20 bg-white/90 p-3 dark:border-zinc-600 dark:bg-zinc-900/60"
              >
                {editingApprovedId === row.id ? (
                  <input
                    type="text"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="min-w-[12rem] flex-1 border-2 border-palm-mid px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                  />
                ) : (
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-ink dark:text-zinc-100">{row.label}</p>
                    <p className="text-xs text-ink/55">
                      Approved {formatDate(row.approvedAt)} · {row.suggestionCount}{" "}
                      {row.suggestionCount === 1 ? "vote" : "votes"}
                    </p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {editingApprovedId === row.id ? (
                    <>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          runAction(() => updateSpeciesSuggestionLabel(row.id, editLabel), () => {
                            const nextRows = rows.map((r) =>
                              r.id === row.id ? { ...r, label: editLabel.trim() } : r,
                            );
                            const nextApproved = approved.map((r) =>
                              r.id === row.id ? { ...r, label: editLabel.trim() } : r,
                            );
                            setRows(nextRows);
                            setApproved(nextApproved);
                            setEditingApprovedId(null);
                            setMsg("Label updated.");
                          })
                        }
                        className={btnMainMd}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => setEditingApprovedId(null)}
                        className={btnSecondaryMd}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          setEditingApprovedId(row.id);
                          setEditLabel(row.label);
                        }}
                        className={btnSecondaryMd}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          runAction(() => unapproveSpeciesSuggestion(row.id), () => {
                            const next = rows.map((r) =>
                              r.id === row.id ? { ...r, status: "PENDING" as const, approvedAt: null } : r,
                            );
                            setRows(next);
                            syncApprovedFromRows(next);
                            setMsg("Removed from approved list.");
                          })
                        }
                        className={btnImportantMd}
                      >
                        Remove from list
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
