"use client";

import Link from "next/link";
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

export function SpeciesCatalogToolbar({
  q,
  status,
  sort,
  typeFilter,
  typeOptions,
}: {
  q: string;
  status: SpeciesCatalogStatusFilter;
  sort: SpeciesCatalogSort;
  typeFilter: string;
  typeOptions: string[];
}) {
  const hasFilters = q.trim() || status !== "all" || sort !== "date_desc" || typeFilter.trim();

  return (
    <form
      action="/settings/labels/species"
      method="get"
      className="mt-6 flex flex-col gap-3 rounded border border-palm/25 bg-white/90 p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end dark:border-zinc-600 dark:bg-zinc-900/60"
    >
      <label className="block min-w-[12rem] flex-1 text-sm font-bold text-ink dark:text-zinc-200">
        Search
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Type, genus, species, morph…"
          className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          autoComplete="off"
        />
      </label>
      <label className="block min-w-[10rem] text-sm font-bold text-ink dark:text-zinc-200">
        Type
        <input
          type="text"
          name="type"
          list="species-type-suggestions"
          defaultValue={typeFilter}
          placeholder="All types"
          className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
        />
        <datalist id="species-type-suggestions">
          {typeOptions.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </label>
      <label className="block min-w-[10rem] text-sm font-bold text-ink dark:text-zinc-200">
        Status
        <select
          name="status"
          defaultValue={status}
          className="mt-1 block w-full border-2 border-palm-mid bg-white px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block min-w-[12rem] text-sm font-bold text-ink dark:text-zinc-200">
        Sort by
        <select
          name="sort"
          defaultValue={sort}
          className="mt-1 block w-full border-2 border-palm-mid bg-white px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          className={btnSecondaryMd}
        >
          Apply
        </button>
        {hasFilters ? (
          <Link
            href="/settings/labels/species"
            className={`inline-flex items-center ${btnSecondaryMd}`}
          >
            Clear filters
          </Link>
        ) : null}
      </div>
    </form>
  );
}
