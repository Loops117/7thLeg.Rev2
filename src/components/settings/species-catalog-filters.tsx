"use client";

import { btnSecondaryMd } from "@/lib/btn-theme-classes";

import type { SpeciesCatalogSort, SpeciesCatalogStatusFilter } from "@/lib/species-catalog";

const SORT_OPTIONS: { value: SpeciesCatalogSort; label: string }[] = [
  { value: "date_desc", label: "Date added (newest)" },
  { value: "date_asc", label: "Date added (oldest)" },
  { value: "type_asc", label: "Type A–Z" },
  { value: "type_desc", label: "Type Z–A" },
  { value: "genus_asc", label: "Genus A–Z" },
  { value: "genus_desc", label: "Genus Z–A" },
  { value: "species_asc", label: "Species A–Z" },
  { value: "species_desc", label: "Species Z–A" },
  { value: "common_asc", label: "Common name A–Z" },
  { value: "common_desc", label: "Common name Z–A" },
];

const STATUS_OPTIONS: { value: SpeciesCatalogStatusFilter; label: string }[] = [
  { value: "all", label: "All entries" },
  { value: "approved", label: "Approved only" },
  { value: "pending", label: "Pending approval" },
];

const compactField =
  "mt-0.5 w-full border border-palm-mid px-2 py-1.5 text-xs dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100";

export function SpeciesCatalogFilters({
  q,
  status,
  sort,
  typeFilter,
  typeOptions,
  onQChange,
  onStatusChange,
  onSortChange,
  onTypeChange,
  onClear,
  compact = false,
}: {
  q: string;
  status: SpeciesCatalogStatusFilter;
  sort: SpeciesCatalogSort;
  typeFilter: string;
  typeOptions: string[];
  onQChange: (v: string) => void;
  onStatusChange: (v: SpeciesCatalogStatusFilter) => void;
  onSortChange: (v: SpeciesCatalogSort) => void;
  onTypeChange: (v: string) => void;
  onClear?: () => void;
  compact?: boolean;
}) {
  const hasFilters = q.trim() || status !== "all" || sort !== "date_desc" || typeFilter.trim();

  return (
    <div
      className={
        compact
          ? "grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
          : "flex flex-col gap-3 rounded border border-palm/25 bg-white/90 p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end dark:border-zinc-600 dark:bg-zinc-900/60"
      }
    >
      <label className={`block min-w-0 flex-1 text-xs font-bold text-ink dark:text-zinc-200 ${compact ? "" : "sm:min-w-[12rem]"}`}>
        Search
        <input
          type="search"
          value={q}
          onChange={(e) => onQChange(e.target.value)}
          placeholder="Type, genus, species, morph…"
          className={compactField}
          autoComplete="off"
        />
      </label>
      <label className={`block text-xs font-bold text-ink dark:text-zinc-200 ${compact ? "" : "min-w-[10rem]"}`}>
        Type
        <select value={typeFilter} onChange={(e) => onTypeChange(e.target.value)} className={compactField}>
          <option value="">All types</option>
          {typeOptions.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <label className={`block text-xs font-bold text-ink dark:text-zinc-200 ${compact ? "" : "min-w-[10rem]"}`}>
        Status
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value as SpeciesCatalogStatusFilter)}
          className={compactField}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className={`block text-xs font-bold text-ink dark:text-zinc-200 ${compact ? "" : "min-w-[12rem]"}`}>
        Sort by
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SpeciesCatalogSort)}
          className={compactField}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      {!compact && onClear && hasFilters ? (
        <button
          type="button"
          onClick={onClear}
          className={btnSecondaryMd}
        >
          Clear filters
        </button>
      ) : null}
      {compact && onClear && hasFilters ? (
        <div className="sm:col-span-2 lg:col-span-4">
          <button type="button" onClick={onClear} className="text-xs font-bold text-lagoon-dark underline dark:text-emerald-300">
            Clear filters
          </button>
        </div>
      ) : null}
    </div>
  );
}
