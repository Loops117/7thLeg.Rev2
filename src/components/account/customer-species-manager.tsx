"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  bulkDeleteCustomerSpeciesEntries,
  bulkSetCustomerSpeciesAvailability,
  deleteCustomerSpeciesEntry,
  exportCustomerSpeciesCsvAction,
  getCustomerSpeciesShareInfo,
  importCustomerSpeciesCsvAction,
  saveCustomerSpeciesEntry,
  setCustomerSpeciesListDisplayName,
  setCustomerSpeciesListPublicEnabled,
  type CustomerSpeciesShareInfo,
} from "@/app/actions/customer-species";
import { btnImportantMd, btnMainMd, btnSecondaryMd } from "@/lib/btn-theme-classes";
import { csvWithUtf8Bom } from "@/lib/csv-text-encoding";
import {
  compareSpeciesEntryRows,
  DEFAULT_SPECIES_ENTRY_SORT,
  type CustomerSpeciesEntryInput,
  type CustomerSpeciesEntryRow,
  customerSpeciesCsvTemplate,
  exportCustomerSpeciesCsv,
  formatSpeciesDateForDisplay,
  type SpeciesEntrySortColumn,
  type SpeciesEntrySortState,
  speciesDateToInputValue,
} from "@/lib/customer-species";
import type { CustomerSpeciesInsectTypeOption } from "@/lib/customer-species-insect-types";
import { formatPriceUsd } from "@/lib/product-slug";

type SpeciesSortColumn = SpeciesEntrySortColumn | "source" | "priceCents";
type SpeciesSortState = SpeciesEntrySortState | { column: "source" | "priceCents"; direction: "asc" | "desc" };

const DEFAULT_SORT: SpeciesSortState = DEFAULT_SPECIES_ENTRY_SORT;

function compareSpeciesEntries(
  a: CustomerSpeciesEntryRow,
  b: CustomerSpeciesEntryRow,
  sort: SpeciesSortState,
): number {
  if (sort.column === "priceCents") {
    const dir = sort.direction === "asc" ? 1 : -1;
    const av = a.priceCents;
    const bv = b.priceCents;
    if (av == null && bv == null) return compareSpeciesEntryRows(a, b, DEFAULT_SPECIES_ENTRY_SORT);
    if (av == null) return 1;
    if (bv == null) return -1;
    const primary = (av - bv) * dir;
    if (primary !== 0) return primary;
    return compareSpeciesEntryRows(a, b, DEFAULT_SPECIES_ENTRY_SORT);
  }

  if (sort.column === "source") {
    const dir = sort.direction === "asc" ? 1 : -1;
    const primary =
      (a.source ?? "").localeCompare(b.source ?? "", undefined, { sensitivity: "base" }) * dir;
    if (primary !== 0) return primary;
    return compareSpeciesEntryRows(a, b, DEFAULT_SPECIES_ENTRY_SORT);
  }

  return compareSpeciesEntryRows(a, b, sort as SpeciesEntrySortState);
}

function SortableSpeciesTh({
  label,
  column,
  sort,
  onSort,
}: {
  label: string;
  column: SpeciesSortColumn;
  sort: SpeciesSortState;
  onSort: (column: SpeciesSortColumn) => void;
}) {
  const active = sort.column === column;
  const indicator = active ? (sort.direction === "asc" ? " ↑" : " ↓") : "";

  return (
    <th>
      <button
        type="button"
        onClick={() => onSort(column)}
        className="font-inherit w-full text-left text-inherit hover:underline"
      >
        {label}
        {indicator}
      </button>
    </th>
  );
}

const EMPTY_FORM: CustomerSpeciesEntryInput = {
  species: "",
  insectType: "",
  morphName: "",
  commonName: "",
  dateObtained: null,
  source: "",
  priceCents: null,
  acquisitionNotes: "",
  available: false,
  availabilityNotes: "",
};

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csvWithUtf8Bom(csv)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function priceInputValue(cents: number | null): string {
  if (cents == null || !Number.isFinite(cents)) return "";
  return (cents / 100).toFixed(2);
}

function parsePriceInput(raw: string): number | null {
  const t = raw.trim().replace(/[$,]/g, "");
  if (!t) return null;
  const n = Number.parseFloat(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function EntryFormFields({
  form,
  setForm,
  idPrefix,
  insectTypes,
}: {
  form: CustomerSpeciesEntryInput;
  setForm: React.Dispatch<React.SetStateAction<CustomerSpeciesEntryInput>>;
  idPrefix: string;
  insectTypes: CustomerSpeciesInsectTypeOption[];
}) {
  const legacyType =
    form.insectType && !insectTypes.some((t) => t.name === form.insectType) ? form.insectType : null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="account-panel__label">
        Insect type
        <select
          value={form.insectType}
          onChange={(e) => setForm((f) => ({ ...f, insectType: e.target.value }))}
          className="account-field"
        >
          <option value="">—</option>
          {insectTypes.map((t) => (
            <option key={t.id} value={t.name}>
              {t.name}
            </option>
          ))}
          {legacyType ? (
            <option value={legacyType}>{legacyType} (not in list)</option>
          ) : null}
        </select>
      </label>
      <label className="account-panel__label">
        Species *
        <input
          id={`${idPrefix}-species`}
          type="text"
          required
          value={form.species}
          onChange={(e) => setForm((f) => ({ ...f, species: e.target.value }))}
          className="account-field"
          maxLength={200}
        />
      </label>
      <label className="account-panel__label">
        Morph name
        <input
          type="text"
          value={form.morphName}
          onChange={(e) => setForm((f) => ({ ...f, morphName: e.target.value }))}
          className="account-field"
          maxLength={200}
        />
      </label>
      <label className="account-panel__label">
        Common name
        <input
          type="text"
          value={form.commonName}
          onChange={(e) => setForm((f) => ({ ...f, commonName: e.target.value }))}
          className="account-field"
          maxLength={200}
        />
      </label>
      <label className="account-panel__label">
        Date obtained
        <input
          type="date"
          value={speciesDateToInputValue(form.dateObtained)}
          onChange={(e) =>
            setForm((f) => ({ ...f, dateObtained: e.target.value.trim() || null }))
          }
          className="account-field"
        />
      </label>
      <label className="account-panel__label">
        Source <span className="account-panel__muted font-normal">(private)</span>
        <input
          type="text"
          value={form.source}
          onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
          className="account-field"
          maxLength={200}
        />
      </label>
      <label className="account-panel__label">
        Price <span className="account-panel__muted font-normal">(private)</span>
        <input
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={priceInputValue(form.priceCents)}
          onChange={(e) => setForm((f) => ({ ...f, priceCents: parsePriceInput(e.target.value) }))}
          className="account-field"
        />
      </label>
      <label className="account-panel__label sm:col-span-2">
        Acquisition notes <span className="account-panel__muted font-normal">(private)</span>
        <textarea
          rows={2}
          value={form.acquisitionNotes}
          onChange={(e) => setForm((f) => ({ ...f, acquisitionNotes: e.target.value }))}
          className="account-field"
          maxLength={4000}
        />
      </label>
      <label className="account-panel__label flex cursor-pointer items-center gap-2 sm:col-span-2">
        <input
          type="checkbox"
          checked={form.available}
          onChange={(e) => setForm((f) => ({ ...f, available: e.target.checked }))}
          className="h-4 w-4 accent-[var(--palm)]"
        />
        Available
      </label>
      <label className="account-panel__label sm:col-span-2">
        Availability notes
        <textarea
          rows={2}
          value={form.availabilityNotes}
          onChange={(e) => setForm((f) => ({ ...f, availabilityNotes: e.target.value }))}
          className="account-field"
          maxLength={1000}
        />
      </label>
    </div>
  );
}

export function CustomerSpeciesManager({
  initialEntries,
  initialShare,
  insectTypes,
}: {
  initialEntries: CustomerSpeciesEntryRow[];
  initialShare: CustomerSpeciesShareInfo;
  insectTypes: CustomerSpeciesInsectTypeOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState(initialEntries);
  const [share, setShare] = useState(initialShare);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addForm, setAddForm] = useState<CustomerSpeciesEntryInput>({ ...EMPTY_FORM });
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<CustomerSpeciesEntryInput>({ ...EMPTY_FORM });
  const importRef = useRef<HTMLInputElement>(null);
  const [copyOk, setCopyOk] = useState(false);
  const [listNameDraft, setListNameDraft] = useState(initialShare.listDisplayName);
  const [sort, setSort] = useState<SpeciesSortState>(DEFAULT_SORT);
  const [filterType, setFilterType] = useState("");
  const [filterAvailable, setFilterAvailable] = useState<"all" | "yes" | "no">("all");
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [bulkActionKey, setBulkActionKey] = useState(0);

  const displayedEntries = useMemo(() => {
    let list = entries;
    if (filterType) {
      list = list.filter((e) => e.insectType === filterType);
    }
    if (filterAvailable === "yes") {
      list = list.filter((e) => e.available);
    } else if (filterAvailable === "no") {
      list = list.filter((e) => !e.available);
    }
    return [...list].sort((a, b) => compareSpeciesEntries(a, b, sort));
  }, [entries, filterType, filterAvailable, sort]);

  const hasActiveFilters = filterType !== "" || filterAvailable !== "all";
  const selectedCount = selectedIds.size;
  const displayedIds = useMemo(() => displayedEntries.map((e) => e.id), [displayedEntries]);
  const allDisplayedSelected =
    displayedIds.length > 0 && displayedIds.every((id) => selectedIds.has(id));

  function handleSort(column: SpeciesSortColumn) {
    setSort((current) =>
      current.column === column
        ? { column, direction: current.direction === "asc" ? "desc" : "asc" }
        : { column, direction: "asc" },
    );
  }

  useEffect(() => {
    setEntries(initialEntries);
  }, [initialEntries]);

  useEffect(() => {
    setShare(initialShare);
    setListNameDraft(initialShare.listDisplayName);
  }, [initialShare]);

  useEffect(() => {
    if (!addModalOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setAddModalOpen(false);
        setAddForm({ ...EMPTY_FORM });
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [addModalOpen]);

  useEffect(() => {
    if (!deleteConfirmOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDeleteConfirmOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [deleteConfirmOpen]);

  useEffect(() => {
    if (multiSelectMode) return;
    setSelectedIds(new Set());
    setDeleteConfirmOpen(false);
  }, [multiSelectMode]);

  function closeAddModal() {
    setAddModalOpen(false);
    setAddForm({ ...EMPTY_FORM });
  }

  function refreshAfterSave() {
    router.refresh();
  }

  function startEdit(entry: CustomerSpeciesEntryRow) {
    setEditingId(entry.id);
    setEditForm({
      species: entry.species,
      insectType: entry.insectType,
      morphName: entry.morphName,
      commonName: entry.commonName,
      dateObtained: entry.dateObtained,
      source: entry.source,
      priceCents: entry.priceCents,
      acquisitionNotes: entry.acquisitionNotes,
      available: entry.available,
      availabilityNotes: entry.availabilityNotes,
    });
    setError(null);
  }

  function runExport() {
    setError(null);
    startTransition(async () => {
      const r = await exportCustomerSpeciesCsvAction();
      if (!r.ok) {
        setError(r.error);
        return;
      }
      downloadCsv(r.csv, "my-species.csv");
      setMessage("Exported my-species.csv");
    });
  }

  function toggleMultiSelectMode() {
    setMultiSelectMode((on) => !on);
    setEditingId(null);
    setError(null);
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllDisplayed() {
    setSelectedIds((prev) => {
      if (allDisplayedSelected) {
        const next = new Set(prev);
        for (const id of displayedIds) next.delete(id);
        return next;
      }
      const next = new Set(prev);
      for (const id of displayedIds) next.add(id);
      return next;
    });
  }

  function requireSelection(): string[] | null {
    const ids = [...selectedIds];
    if (ids.length === 0) {
      setError("Select at least one entry.");
      return null;
    }
    setError(null);
    return ids;
  }

  function runBulkExport() {
    const ids = requireSelection();
    if (!ids) return;
    const selected = entries.filter((e) => selectedIds.has(e.id));
    downloadCsv(exportCustomerSpeciesCsv(selected), "my-species-selected.csv");
    setMessage(`Exported ${selected.length} ${selected.length === 1 ? "entry" : "entries"}.`);
  }

  function runBulkSetAvailable(available: boolean) {
    const ids = requireSelection();
    if (!ids) return;
    setMessage(null);
    startTransition(async () => {
      const r = await bulkSetCustomerSpeciesAvailability(ids, available);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setEntries((list) =>
        list.map((e) => (selectedIds.has(e.id) ? { ...e, available } : e)),
      );
      setMessage(
        `Marked ${r.updated} ${r.updated === 1 ? "entry" : "entries"} as ${available ? "available" : "not available"}.`,
      );
      refreshAfterSave();
    });
  }

  function confirmBulkDelete() {
    if (!requireSelection()) return;
    setDeleteConfirmOpen(true);
  }

  function runBulkDelete() {
    const ids = requireSelection();
    if (!ids) return;
    setMessage(null);
    startTransition(async () => {
      const r = await bulkDeleteCustomerSpeciesEntries(ids);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setEntries((list) => list.filter((e) => !selectedIds.has(e.id)));
      setSelectedIds(new Set());
      setDeleteConfirmOpen(false);
      setEditingId(null);
      setMessage(`Removed ${r.deleted} ${r.deleted === 1 ? "entry" : "entries"}.`);
      refreshAfterSave();
    });
  }

  function handleBulkAction(action: string) {
    if (action === "export") runBulkExport();
    else if (action === "available") runBulkSetAvailable(true);
    else if (action === "unavailable") runBulkSetAvailable(false);
    else if (action === "delete") confirmBulkDelete();
    setBulkActionKey((k) => k + 1);
  }

  function runImport(file: File) {
    if (
      !window.confirm(
        "Import replaces your entire species list with the CSV contents. Continue?",
      )
    ) {
      return;
    }
    setError(null);
    setMessage(null);
    const fd = new FormData();
    fd.set("file", file);
    startTransition(async () => {
      const r = await importCustomerSpeciesCsvAction(fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setMessage(`Imported ${r.imported} ${r.imported === 1 ? "entry" : "entries"}.`);
      refreshAfterSave();
    });
  }

  async function copyShareLink() {
    setError(null);
    setCopyOk(false);
    try {
      let url = share.publicUrl;
      if (!url) {
        const info = await getCustomerSpeciesShareInfo();
        setShare(info);
        url = info.publicUrl;
      }
      await navigator.clipboard.writeText(url);
      setCopyOk(true);
      window.setTimeout(() => setCopyOk(false), 2500);
    } catch {
      setError("Could not copy link — try selecting the URL manually.");
    }
  }

  return (
    <div className="space-y-8">
      <section className="account-panel">
        <h2 className="account-panel__title">Share your list</h2>
        <p className="account-panel__text mt-2">
          Others can view a read-only version at your personal link. Source, price, and acquisition notes stay
          private.
        </p>
        <label className="account-panel__label mt-4 block">
          List name
          <input
            type="text"
            value={listNameDraft}
            disabled={pending}
            onChange={(e) => setListNameDraft(e.target.value)}
            placeholder={share.defaultListTitle}
            className="account-field"
            maxLength={120}
          />
        </label>
        <p className="account-panel__muted mt-1 text-xs">
          Shown on your public page. Leave blank to use{" "}
          <span className="font-bold">{share.defaultListTitle}</span>.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending || listNameDraft.trim() === share.listDisplayName}
            className={btnSecondaryMd}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const r = await setCustomerSpeciesListDisplayName(listNameDraft);
                if (!r.ok) {
                  setError(r.error);
                  return;
                }
                setShare(r.info);
                setListNameDraft(r.info.listDisplayName);
                setMessage("List name saved.");
              });
            }}
          >
            Save list name
          </button>
        </div>
        <p className="account-panel__text mt-3 text-sm">
          Public title preview:{" "}
          <span className="font-bold">{listNameDraft.trim() || share.defaultListTitle}</span>
        </p>
        <label className="account-panel__label mt-4 flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={share.publicEnabled}
            disabled={pending}
            onChange={(e) => {
              const enabled = e.target.checked;
              startTransition(async () => {
                const r = await setCustomerSpeciesListPublicEnabled(enabled);
                if (!r.ok) {
                  setError(r.error);
                  return;
                }
                setShare((s) => ({ ...s, publicEnabled: enabled }));
                setMessage(enabled ? "Public list enabled." : "Public list hidden.");
              });
            }}
            className="h-4 w-4 accent-[var(--palm)]"
          />
          Public list enabled
        </label>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" disabled={pending} onClick={() => void copyShareLink()} className={btnSecondaryMd}>
            {copyOk ? "Copied!" : "Copy public link"}
          </button>
          <code className="account-code">{share.publicUrl}</code>
        </div>
      </section>

      <section className="account-panel">
        <h2 className="account-panel__title">Import &amp; export</h2>
        <p className="account-panel__text mt-2">
          CSV columns: Insect Type, Species, Morph Name, Common Name, Date Obtained, Source, Price, Acquisition
          Notes, Available, Availability Notes. Import <strong>replaces</strong> your full list.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" disabled={pending} onClick={runExport} className={btnSecondaryMd}>
            Export CSV
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => downloadCsv(customerSpeciesCsvTemplate(), "my-species-template.csv")}
            className={btnSecondaryMd}
          >
            Download template
          </button>
          <label className={`${btnSecondaryMd} cursor-pointer ${pending ? "opacity-50" : ""}`}>
            Import CSV
            <input
              ref={importRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              disabled={pending}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) runImport(file);
              }}
            />
          </label>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="account-panel__title">
            Your species ({hasActiveFilters ? `${displayedEntries.length} of ${entries.length}` : entries.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              className={btnMainMd}
              onClick={() => {
                setError(null);
                setAddModalOpen(true);
              }}
            >
              Add entry
            </button>
            {entries.length > 0 ? (
              <button
                type="button"
                disabled={pending}
                className={multiSelectMode ? btnMainMd : btnSecondaryMd}
                onClick={toggleMultiSelectMode}
              >
                {multiSelectMode ? "Done selecting" : "Multi-select"}
              </button>
            ) : null}
          </div>
        </div>
        {multiSelectMode && displayedEntries.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="account-panel__label min-w-[12rem]">
              Bulk actions
              <select
                key={bulkActionKey}
                defaultValue=""
                disabled={pending}
                className="account-field"
                onChange={(e) => {
                  const action = e.target.value;
                  if (action) handleBulkAction(action);
                }}
              >
                <option value="">Choose action…</option>
                <option value="export">Export All</option>
                <option value="available">Set Available</option>
                <option value="unavailable">Set Not-Available</option>
                <option value="delete">Delete</option>
              </select>
            </label>
            <p className="account-panel__text text-sm">
              {selectedCount === 0
                ? "Select entries using the checkboxes below."
                : `${selectedCount} selected`}
            </p>
          </div>
        ) : null}
        {entries.length === 0 ? (
          <p className="account-panel__text mt-3">No entries yet — use Add entry or import a CSV.</p>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <label className="account-panel__label min-w-[10rem]">
                Insect type
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="account-field"
                >
                  <option value="">All types</option>
                  {insectTypes.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="account-panel__label min-w-[8rem]">
                Available
                <select
                  value={filterAvailable}
                  onChange={(e) => setFilterAvailable(e.target.value as "all" | "yes" | "no")}
                  className="account-field"
                >
                  <option value="all">All</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
              {hasActiveFilters ? (
                <button
                  type="button"
                  className={btnSecondaryMd}
                  onClick={() => {
                    setFilterType("");
                    setFilterAvailable("all");
                  }}
                >
                  Clear filters
                </button>
              ) : null}
            </div>
            {displayedEntries.length === 0 ? (
              <p className="account-panel__text mt-3">No entries match these filters.</p>
            ) : (
          <div className="account-table-shell mt-3 min-w-0">
            <table className="min-w-[62rem]">
              <thead>
                <tr>
                  {multiSelectMode ? (
                    <th className="w-10">
                      <input
                        type="checkbox"
                        checked={allDisplayedSelected}
                        onChange={toggleSelectAllDisplayed}
                        aria-label="Select all shown entries"
                        className="h-4 w-4 accent-[var(--palm)]"
                      />
                    </th>
                  ) : null}
                  <SortableSpeciesTh label="Type" column="insectType" sort={sort} onSort={handleSort} />
                  <SortableSpeciesTh label="Species" column="species" sort={sort} onSort={handleSort} />
                  <SortableSpeciesTh label="Morph" column="morphName" sort={sort} onSort={handleSort} />
                  <SortableSpeciesTh label="Common" column="commonName" sort={sort} onSort={handleSort} />
                  <SortableSpeciesTh label="Obtained" column="dateObtained" sort={sort} onSort={handleSort} />
                  <SortableSpeciesTh label="Source" column="source" sort={sort} onSort={handleSort} />
                  <SortableSpeciesTh label="Price" column="priceCents" sort={sort} onSort={handleSort} />
                  <SortableSpeciesTh label="Avail." column="available" sort={sort} onSort={handleSort} />
                  {multiSelectMode ? null : <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {displayedEntries.map((entry) => (
                  <tr key={entry.id}>
                    {editingId === entry.id && !multiSelectMode ? (
                      <td colSpan={multiSelectMode ? 10 : 9} className="account-table-shell__edit-row">
                        <EntryFormFields
                          form={editForm}
                          setForm={setEditForm}
                          idPrefix={`edit-${entry.id}`}
                          insectTypes={insectTypes}
                        />
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={pending}
                            className={btnSecondaryMd}
                            onClick={() => {
                              startTransition(async () => {
                                const r = await saveCustomerSpeciesEntry({ ...editForm, id: entry.id });
                                if (!r.ok) {
                                  setError(r.error);
                                  return;
                                }
                                setEditingId(null);
                                setMessage("Entry saved.");
                                refreshAfterSave();
                              });
                            }}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="text-sm font-bold underline"
                            style={{ color: "var(--product-card-description)" }}
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    ) : (
                      <>
                        {multiSelectMode ? (
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(entry.id)}
                              onChange={() => toggleSelected(entry.id)}
                              aria-label={`Select ${entry.species}`}
                              className="h-4 w-4 accent-[var(--palm)]"
                            />
                          </td>
                        ) : null}
                        <td>{entry.insectType || "—"}</td>
                        <td className="font-bold">{entry.species}</td>
                        <td>{entry.morphName || "—"}</td>
                        <td>{entry.commonName || "—"}</td>
                        <td>{formatSpeciesDateForDisplay(entry.dateObtained)}</td>
                        <td>{entry.source || "—"}</td>
                        <td className="tabular-nums">
                          {entry.priceCents != null ? formatPriceUsd(entry.priceCents) : "—"}
                        </td>
                        <td>
                          {entry.available ? (
                            <span className="font-bold" style={{ color: "var(--product-card-title)" }}>
                              Yes
                            </span>
                          ) : (
                            <span className="account-panel__muted">No</span>
                          )}
                        </td>
                        {multiSelectMode ? null : (
                          <td>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                className="text-xs font-bold underline"
                                style={{ color: "var(--lagoon-dark)" }}
                                onClick={() => startEdit(entry)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="text-xs font-bold text-coral underline"
                                disabled={pending}
                                onClick={() => {
                                  if (!window.confirm(`Remove ${entry.species} from your list?`)) return;
                                  startTransition(async () => {
                                    const r = await deleteCustomerSpeciesEntry(entry.id);
                                    if (!r.ok) {
                                      setError(r.error);
                                      return;
                                    }
                                    setEntries((list) => list.filter((e) => e.id !== entry.id));
                                    setMessage("Entry removed.");
                                    refreshAfterSave();
                                  });
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            )}
          </>
        )}
      </section>

      {message ? (
        <p className="text-sm font-bold" style={{ color: "var(--lagoon-dark)" }}>
          {message}
        </p>
      ) : null}
      {error ? <p className="text-sm font-bold text-coral">{error}</p> : null}

      {deleteConfirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
          onClick={() => setDeleteConfirmOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-delete-species-title"
            className="account-panel w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="bulk-delete-species-title" className="account-panel__title">
              Delete entries
            </h2>
            <p className="account-panel__text mt-3">
              Delete {selectedCount} {selectedCount === 1 ? "entry" : "entries"}? This cannot be undone.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending}
                className={btnImportantMd}
                onClick={runBulkDelete}
              >
                OK
              </button>
              <button
                type="button"
                disabled={pending}
                className={btnSecondaryMd}
                onClick={() => setDeleteConfirmOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {addModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
          onClick={closeAddModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-species-entry-title"
            className="account-panel max-h-[90vh] w-full max-w-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="add-species-entry-title" className="account-panel__title">
              Add entry
            </h2>
            <div className="mt-4">
              <EntryFormFields
                form={addForm}
                setForm={setAddForm}
                idPrefix="add"
                insectTypes={insectTypes}
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pending || !addForm.species.trim()}
                  className={btnMainMd}
                  onClick={() => {
                    setError(null);
                    startTransition(async () => {
                      const r = await saveCustomerSpeciesEntry(addForm);
                      if (!r.ok) {
                        setError(r.error);
                        return;
                      }
                      closeAddModal();
                      setMessage("Entry added.");
                      refreshAfterSave();
                    });
                  }}
                >
                  Add to list
                </button>
                <button
                  type="button"
                  className={btnSecondaryMd}
                  disabled={pending}
                  onClick={closeAddModal}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
