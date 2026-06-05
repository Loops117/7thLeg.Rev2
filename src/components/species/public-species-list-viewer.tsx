"use client";

import { useMemo, useState } from "react";
import { btnSecondaryMd } from "@/lib/btn-theme-classes";
import {
  compareSpeciesEntryRows,
  DEFAULT_SPECIES_ENTRY_SORT,
  formatSpeciesDateForDisplay,
  type PublicCustomerSpeciesEntry,
  type SpeciesEntrySortColumn,
  type SpeciesEntrySortState,
} from "@/lib/customer-species";

function SortableTh({
  label,
  column,
  sort,
  onSort,
}: {
  label: string;
  column: SpeciesEntrySortColumn;
  sort: SpeciesEntrySortState;
  onSort: (column: SpeciesEntrySortColumn) => void;
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

export function PublicSpeciesListViewer({
  entries,
}: {
  entries: PublicCustomerSpeciesEntry[];
}) {
  const [sort, setSort] = useState<SpeciesEntrySortState>(DEFAULT_SPECIES_ENTRY_SORT);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterAvailable, setFilterAvailable] = useState<"all" | "yes" | "no">("all");

  const typeOptions = useMemo(() => {
    const types = new Set<string>();
    for (const entry of entries) {
      const t = entry.insectType.trim();
      if (t) types.add(t);
    }
    return [...types].sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const displayedEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = entries;

    if (q) {
      list = list.filter((entry) => {
        const haystack = [
          entry.insectType,
          entry.species,
          entry.morphName,
          entry.commonName,
          entry.availabilityNotes,
          formatSpeciesDateForDisplay(entry.dateObtained),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    if (filterType) {
      list = list.filter((e) => e.insectType === filterType);
    }

    if (filterAvailable === "yes") {
      list = list.filter((e) => e.available);
    } else if (filterAvailable === "no") {
      list = list.filter((e) => !e.available);
    }

    return [...list].sort((a, b) => compareSpeciesEntryRows(a, b, sort));
  }, [entries, search, filterType, filterAvailable, sort]);

  const hasActiveFilters = search.trim() !== "" || filterType !== "" || filterAvailable !== "all";

  function handleSort(column: SpeciesEntrySortColumn) {
    setSort((current) =>
      current.column === column
        ? { column, direction: current.direction === "asc" ? "desc" : "asc" }
        : { column, direction: "asc" },
    );
  }

  if (entries.length === 0) {
    return <p className="account-panel__text mt-8">This list is empty right now.</p>;
  }

  return (
    <>
      <div className="mt-6 flex flex-wrap items-end gap-3">
        <label className="account-panel__label min-w-[12rem] flex-1">
          Search
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Species, morph, type…"
            className="account-field"
            autoComplete="off"
          />
        </label>
        <label className="account-panel__label min-w-[10rem]">
          Type
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="account-field"
          >
            <option value="">All types</option>
            {typeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
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
              setSearch("");
              setFilterType("");
              setFilterAvailable("all");
            }}
          >
            Clear filters
          </button>
        ) : null}
      </div>

      <p className="account-panel__text mt-3 text-sm">
        {hasActiveFilters
          ? `${displayedEntries.length} of ${entries.length} entries`
          : `${entries.length} ${entries.length === 1 ? "entry" : "entries"}`}
      </p>

      {displayedEntries.length === 0 ? (
        <p className="account-panel__text mt-3">No entries match these filters.</p>
      ) : (
        <div className="account-table-shell mt-3 min-w-0">
          <table className="min-w-[40rem]">
            <thead>
              <tr>
                <SortableTh label="Type" column="insectType" sort={sort} onSort={handleSort} />
                <SortableTh label="Species" column="species" sort={sort} onSort={handleSort} />
                <SortableTh label="Morph name" column="morphName" sort={sort} onSort={handleSort} />
                <SortableTh label="Common name" column="commonName" sort={sort} onSort={handleSort} />
                <SortableTh label="Date obtained" column="dateObtained" sort={sort} onSort={handleSort} />
                <SortableTh label="Available" column="available" sort={sort} onSort={handleSort} />
                <th>Availability notes</th>
              </tr>
            </thead>
            <tbody>
              {displayedEntries.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.insectType || "—"}</td>
                  <td className="font-bold">{entry.species}</td>
                  <td>{entry.morphName || "—"}</td>
                  <td>{entry.commonName || "—"}</td>
                  <td>{formatSpeciesDateForDisplay(entry.dateObtained)}</td>
                  <td>
                    {entry.available ? (
                      <span className="font-bold" style={{ color: "var(--product-card-title)" }}>
                        Yes
                      </span>
                    ) : (
                      <span className="account-panel__muted">No</span>
                    )}
                  </td>
                  <td>{entry.availabilityNotes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
