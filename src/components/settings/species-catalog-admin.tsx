"use client";

import { btnSecondaryMd } from "@/lib/btn-theme-classes";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  adminBulkSpeciesCatalogAction,
  adminCreateSpeciesCatalogEntry,
  adminDeleteSpeciesCatalogEntry,
  adminImportSpeciesCatalogCsv,
  adminUpdateSpeciesCatalogEntry,
} from "@/app/actions/species-catalog-admin";
import { SpeciesCatalogTable } from "@/components/settings/species-catalog-table";
import type { SpeciesCatalogRow } from "@/lib/species-catalog";

const fieldClass =
  "w-full border-2 border-palm/30 bg-white px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100";

type FormState = {
  type: string;
  genus: string;
  species: string;
  commonName: string;
  morph: string;
  approved: boolean;
};

const emptyForm = (): FormState => ({
  type: "",
  genus: "",
  species: "",
  commonName: "",
  morph: "",
  approved: false,
});

export function SpeciesCatalogAdmin({
  initialRows,
}: {
  initialRows: SpeciesCatalogRow[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [bulkAction, setBulkAction] = useState<"" | "approve" | "deny" | "delete">("");
  const [pending, startTransition] = useTransition();
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRows(initialRows);
    setSelected(new Set());
  }, [initialRows]);

  const selectedCount = selected.size;
  const allVisibleSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someSelected = selectedCount > 0 && !allVisibleSelected;

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    if (allVisibleSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const r of rows) next.delete(r.id);
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const r of rows) next.add(r.id);
        return next;
      });
    }
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm());
    setFormOpen(true);
    setMsg("");
  }

  function openEdit(row: SpeciesCatalogRow) {
    setEditingId(row.id);
    setForm({
      type: row.type,
      genus: row.genus,
      species: row.species,
      commonName: row.commonName,
      morph: row.morph,
      approved: row.approved,
    });
    setFormOpen(true);
    setMsg("");
  }

  function cancelForm() {
    setEditingId(null);
    setForm(emptyForm());
    setFormOpen(false);
    setMsg("");
  }

  function saveForm() {
    setMsg("");
    startTransition(async () => {
      const payload = {
        type: form.type,
        genus: form.genus,
        species: form.species,
        commonName: form.commonName,
        morph: form.morph,
        approved: form.approved,
      };
      const r = editingId
        ? await adminUpdateSpeciesCatalogEntry(editingId, payload)
        : await adminCreateSpeciesCatalogEntry(payload);
      if (!r.ok) {
        setMsg(r.error);
        return;
      }
      cancelForm();
      router.refresh();
    });
  }

  function deleteOne(row: SpeciesCatalogRow) {
    const label = `${row.genus} ${row.species}${row.morph ? ` (${row.morph})` : ""}`;
    if (!confirm(`Delete “${label}”? This cannot be undone.`)) return;
    setMsg("");
    startTransition(async () => {
      const r = await adminDeleteSpeciesCatalogEntry(row.id);
      setMsg(r.ok ? "" : r.error);
      if (r.ok) router.refresh();
    });
  }

  function runBulk() {
    if (!bulkAction) {
      setMsg("Choose an action from the dropdown.");
      return;
    }
    const ids = [...selected];
    if (bulkAction === "delete") {
      if (!confirm(`Delete ${ids.length} selected entr${ids.length === 1 ? "y" : "ies"}? This cannot be undone.`)) {
        return;
      }
    }
    setMsg("");
    startTransition(async () => {
      const r = await adminBulkSpeciesCatalogAction(ids, bulkAction);
      if (!r.ok) {
        setMsg(r.error);
        return;
      }
      const verb =
        bulkAction === "approve" ? "Approved" : bulkAction === "deny" ? "Denied (hidden from customers)" : "Deleted";
      setMsg(`${verb} ${r.affected ?? ids.length} entr${(r.affected ?? ids.length) === 1 ? "y" : "ies"}.`);
      setBulkAction("");
      clearSelection();
      router.refresh();
    });
  }

  function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setMsg("");
    const fd = new FormData();
    fd.set("file", f);
    startTransition(async () => {
      const r = await adminImportSpeciesCatalogCsv(fd);
      if (!r.ok) {
        setMsg(r.error);
        return;
      }
      const parts = [`Imported ${r.created} new entr${r.created === 1 ? "y" : "ies"}.`];
      if (r.skippedDuplicates > 0) {
        parts.push(`Skipped ${r.skippedDuplicates} duplicate${r.skippedDuplicates === 1 ? "" : "s"}.`);
      }
      if (r.rowErrors.length > 0) {
        parts.push(r.rowErrors.join(" "));
      }
      setMsg(parts.join(" "));
      router.refresh();
    });
  }

  const csvTemplate = useMemo(
    () =>
      "type,genus,species,common name,morph,approved\nCoral,Acropora,millepora,Millipora coral,Strawberry shortcake,yes\n",
    [],
  );

  function downloadTemplate() {
    const blob = new Blob([csvTemplate], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "species-catalog-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={openAdd}
          className={btnSecondaryMd}
        >
          Add entry
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => importRef.current?.click()}
          className={btnSecondaryMd}
        >
          Import CSV…
        </button>
        <input ref={importRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onImportFile} />
        <button
          type="button"
          onClick={downloadTemplate}
          className="text-sm font-bold text-lagoon-dark underline dark:text-emerald-300"
        >
          Download CSV template
        </button>
      </div>

      <p className="text-xs text-ink/65 dark:text-zinc-400">
        CSV columns: type, <strong>genus</strong>, <strong>species</strong>, common name, morph, approved (yes/no). Header
        row recommended. Duplicates (same type + genus + species + morph) are skipped on import.
      </p>

      {formOpen ? (
        <section className="rounded border-2 border-palm bg-white p-4 shadow-sm dark:border-zinc-600 dark:bg-zinc-900/55">
          <h2 className="text-sm font-black uppercase tracking-wide text-palm dark:text-emerald-300">
            {editingId ? "Edit entry" : "New entry"}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="flex flex-col gap-1 text-xs font-bold uppercase text-ink/55">
              Type
              <input
                className={fieldClass}
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                disabled={pending}
                placeholder="e.g. Coral"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold uppercase text-ink/55">
              Genus *
              <input
                className={fieldClass}
                value={form.genus}
                onChange={(e) => setForm((f) => ({ ...f, genus: e.target.value }))}
                disabled={pending}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold uppercase text-ink/55">
              Species *
              <input
                className={fieldClass}
                value={form.species}
                onChange={(e) => setForm((f) => ({ ...f, species: e.target.value }))}
                disabled={pending}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold uppercase text-ink/55">
              Common name
              <input
                className={fieldClass}
                value={form.commonName}
                onChange={(e) => setForm((f) => ({ ...f, commonName: e.target.value }))}
                disabled={pending}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold uppercase text-ink/55">
              Morph
              <input
                className={fieldClass}
                value={form.morph}
                onChange={(e) => setForm((f) => ({ ...f, morph: e.target.value }))}
                disabled={pending}
              />
            </label>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm font-bold text-ink dark:text-zinc-200">
            <input
              type="checkbox"
              checked={form.approved}
              onChange={(e) => setForm((f) => ({ ...f, approved: e.target.checked }))}
              disabled={pending}
              className="h-4 w-4 accent-palm"
            />
            Approved (visible to customers when the label builder ships)
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={saveForm}
              className={btnSecondaryMd}
            >
              {editingId ? "Save changes" : "Create entry"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={cancelForm}
              className={btnSecondaryMd}
            >
              Cancel
            </button>
          </div>
        </section>
      ) : null}

      <div className="flex flex-col gap-3 rounded border border-palm/25 bg-surf/30 p-3 sm:flex-row sm:flex-wrap sm:items-center dark:border-zinc-600 dark:bg-zinc-900/40">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={rows.length === 0}
            onClick={toggleAllVisible}
            className="rounded border-2 border-palm-mid bg-white px-3 py-1.5 text-xs font-bold text-ink hover:bg-surf disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-200"
          >
            {allVisibleSelected ? "Unselect all" : "Select all"}
          </button>
          {selectedCount > 0 ? (
            <button
              type="button"
              onClick={clearSelection}
              className="text-xs font-bold text-lagoon-dark underline dark:text-emerald-300"
            >
              Clear selection ({selectedCount})
            </button>
          ) : (
            <span className="text-xs text-ink/55 dark:text-zinc-500">No rows selected</span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:justify-end">
          <label className="sr-only" htmlFor="species-bulk-action">
            Bulk action
          </label>
          <select
            id="species-bulk-action"
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value as typeof bulkAction)}
            disabled={pending || selectedCount === 0}
            className="min-w-[10rem] border-2 border-palm-mid bg-white px-2 py-2 text-sm font-bold dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value="">Actions…</option>
            <option value="approve">Approve</option>
            <option value="deny">Deny (hide)</option>
            <option value="delete">Delete</option>
          </select>
          <button
            type="button"
            disabled={pending || selectedCount === 0 || !bulkAction}
            onClick={runBulk}
            className={btnSecondaryMd}
          >
            Apply
          </button>
        </div>
      </div>

      {msg ? (
        <p className="text-sm text-ink/85 dark:text-zinc-300" role="status">
          {msg}
        </p>
      ) : null}

      <SpeciesCatalogTable
        rows={rows}
        selectedIds={selected}
        onToggleOne={toggleOne}
        onToggleAll={toggleAllVisible}
        allVisibleSelected={allVisibleSelected}
        someSelected={someSelected}
        onEdit={openEdit}
        onDelete={deleteOne}
        pending={pending}
        emptyMessage="No species entries match your filters. Add one or import a CSV."
      />
    </div>
  );
}
