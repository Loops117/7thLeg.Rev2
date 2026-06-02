"use client";

import { useMemo, useState, useTransition } from "react";
import { deleteCustomerArtSubmission, setCustomerArtApproved } from "@/app/actions/customer-art";
import { btnImportantMd, btnMainMd, btnSecondaryMd } from "@/lib/btn-theme-classes";
import {
  filterCustomerArtRows,
  sortCustomerArtRows,
  type CustomerArtSortKey,
  type CustomerArtStatusFilter,
  type CustomerArtSubmissionRow,
} from "@/lib/customer-art";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function ApprovedIcon({ approved, customerRemoved }: { approved: boolean; customerRemoved: boolean }) {
  if (customerRemoved) {
    return (
      <span
        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-ink/10 text-ink/55 dark:bg-zinc-800 dark:text-zinc-400"
        title="Removed by customer — locked from gallery approval"
        aria-label="Removed by customer"
      >
        🔒
      </span>
    );
  }
  if (approved) {
    return (
      <span
        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-palm/15 text-palm dark:bg-emerald-950/50 dark:text-emerald-300"
        title="Approved"
        aria-label="Approved"
      >
        ✓
      </span>
    );
  }
  return (
    <span
      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-coral/15 text-coral"
      title="Not approved"
      aria-label="Not approved"
    >
      —
    </span>
  );
}

export function CustomerArtAdmin({
  initialRows,
  artGroups,
}: {
  initialRows: CustomerArtSubmissionRow[];
  artGroups: string[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [q, setQ] = useState("");
  const [artGroup, setArtGroup] = useState("");
  const [status, setStatus] = useState<CustomerArtStatusFilter>("all");
  const [sort, setSort] = useState<CustomerArtSortKey>("date_desc");
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");

  const visible = useMemo(
    () => sortCustomerArtRows(filterCustomerArtRows(rows, { q, artGroup, status }), sort),
    [rows, q, artGroup, status, sort],
  );

  const viewer = useMemo(() => visible.find((r) => r.id === viewerId) ?? rows.find((r) => r.id === viewerId) ?? null, [
    visible,
    viewerId,
    rows,
  ]);

  const groupOptions = useMemo(() => {
    const fromRows = new Set(rows.map((r) => r.artGroup));
    for (const g of artGroups) fromRows.add(g);
    return [...fromRows].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [rows, artGroups]);

  function toggleApproved(id: string, next: boolean) {
    setMsg("");
    startTransition(async () => {
      const r = await setCustomerArtApproved(id, next);
      if (!r.ok) {
        setMsg(r.error);
        return;
      }
      setRows((list) => list.map((row) => (row.id === id ? { ...row, approved: next } : row)));
      setMsg(next ? "Approved." : "Marked as not approved.");
    });
  }

  function permanentlyDelete(id: string) {
    if (
      !window.confirm(
        "Permanently delete this submission from the database? This cannot be undone. Use this only when the record should be fully removed.",
      )
    ) {
      return;
    }
    setMsg("");
    startTransition(async () => {
      const r = await deleteCustomerArtSubmission(id);
      if (!r.ok) {
        setMsg(r.error);
        return;
      }
      setRows((list) => list.filter((row) => row.id !== id));
      setViewerId((cur) => (cur === id ? null : cur));
      setMsg("Submission deleted.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded border-2 border-palm/25 bg-white/90 p-4 shadow-sm dark:border-zinc-600 dark:bg-zinc-900/60">
        <label className="block min-w-[10rem] flex-1 text-xs font-bold text-ink dark:text-zinc-200">
          Search
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, email, art group…"
            className="mt-1 w-full border-2 border-palm-mid px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>
        <label className="block text-xs font-bold text-ink dark:text-zinc-200">
          Art group
          <select
            value={artGroup}
            onChange={(e) => setArtGroup(e.target.value)}
            className="mt-1 block min-w-[10rem] border-2 border-palm-mid px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value="">All groups</option>
            {groupOptions.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-bold text-ink dark:text-zinc-200">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as CustomerArtStatusFilter)}
            className="mt-1 block min-w-[8rem] border-2 border-palm-mid px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value="all">All</option>
            <option value="approved">Approved</option>
            <option value="pending">Not approved</option>
            <option value="customer_removed">Removed by customer</option>
          </select>
        </label>
        <label className="block text-xs font-bold text-ink dark:text-zinc-200">
          Sort
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as CustomerArtSortKey)}
            className="mt-1 block min-w-[11rem] border-2 border-palm-mid px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value="date_desc">Date (newest)</option>
            <option value="date_asc">Date (oldest)</option>
            <option value="name_asc">Name A–Z</option>
            <option value="name_desc">Name Z–A</option>
            <option value="group_asc">Art group A–Z</option>
            <option value="group_desc">Art group Z–A</option>
          </select>
        </label>
      </div>

      {msg ? <p className="text-sm font-medium text-palm dark:text-emerald-300">{msg}</p> : null}

      <div className="admin-table-shell overflow-x-auto rounded border-2 border-palm bg-white shadow-sm dark:border-zinc-600 dark:bg-zinc-900">
        <table className="admin-striped w-full min-w-[40rem] text-left text-sm">
          <thead>
            <tr className="border-b-2 border-palm bg-surf/50 font-bold text-palm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100">
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Art group</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr className="admin-empty-row">
                <td colSpan={4} className="px-3 py-8 text-center text-ink/60 dark:text-zinc-400">
                  No submissions match your filters.
                </td>
              </tr>
            ) : (
              visible.map((row) => (
                <tr
                  key={row.id}
                  className={`cursor-pointer border-t border-palm/15 hover:bg-surf/40 dark:border-zinc-700 dark:hover:bg-zinc-800/80 ${row.customerRemovedAt ? "opacity-80" : ""}`}
                  onClick={() => setViewerId(row.id)}
                >
                  <td className="px-3 py-2">
                    <span className="font-bold text-ink dark:text-zinc-100">{row.customerName}</span>
                    <span className="mt-0.5 block font-mono text-[10px] text-ink/50 dark:text-zinc-500">{row.customerEmail}</span>
                  </td>
                  <td className="px-3 py-2 font-medium">{row.artGroup}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-ink/80 dark:text-zinc-300">{formatDate(row.createdAt)}</td>
                  <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                    <ApprovedIcon approved={row.approved} customerRemoved={!!row.customerRemovedAt} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-ink/55 dark:text-zinc-500">
        {visible.length} of {rows.length} submission{rows.length === 1 ? "" : "s"} shown. Click a row to preview.
        Customer-removed uploads stay on file but are locked from gallery approval.
      </p>

      {viewer ? (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-ink/55 p-2 sm:items-center sm:p-6"
          role="presentation"
          onClick={() => setViewerId(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-art-viewer-title"
            className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border-2 border-palm bg-white shadow-2xl dark:border-zinc-600 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-palm/15 px-4 py-3 dark:border-zinc-700">
              <div>
                <h2 id="customer-art-viewer-title" className="text-sm font-black text-palm dark:text-emerald-300">
                  {viewer.customerName}
                </h2>
                <p className="text-xs text-ink/65 dark:text-zinc-400">
                  {viewer.artGroup} · {formatDate(viewer.createdAt)}
                </p>
                {viewer.customerRemovedAt ? (
                  <p className="mt-1 text-xs font-bold text-coral">
                    Removed by customer {formatDate(viewer.customerRemovedAt)} — locked from gallery approval
                  </p>
                ) : null}
              </div>
              <button type="button" onClick={() => setViewerId(null)} className={btnSecondaryMd}>
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-zinc-100 p-4 dark:bg-zinc-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={viewer.imageUrl}
                alt={`Artwork by ${viewer.customerName}`}
                className="mx-auto max-h-[60vh] w-auto max-w-full rounded border border-palm/20 object-contain dark:border-zinc-700"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-palm/15 px-4 py-3 dark:border-zinc-700">
              <div className="flex items-center gap-2">
                <ApprovedIcon approved={viewer.approved} customerRemoved={!!viewer.customerRemovedAt} />
                <span className="text-xs font-bold text-ink/70 dark:text-zinc-300">
                  {viewer.customerRemovedAt
                    ? "Removed by customer"
                    : viewer.approved
                      ? "Approved"
                      : "Not approved"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {viewer.customerRemovedAt ? (
                  viewer.approved ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => toggleApproved(viewer.id, false)}
                      className={btnSecondaryMd}
                    >
                      Revoke approval
                    </button>
                  ) : (
                    <span className="text-xs text-ink/55 dark:text-zinc-400">Cannot approve — customer removed</span>
                  )
                ) : viewer.approved ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => toggleApproved(viewer.id, false)}
                    className={btnSecondaryMd}
                  >
                    Revoke approval
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => toggleApproved(viewer.id, true)}
                    className={btnMainMd}
                  >
                    Approve artwork
                  </button>
                )}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => permanentlyDelete(viewer.id)}
                  className={btnImportantMd}
                >
                  Delete permanently
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
