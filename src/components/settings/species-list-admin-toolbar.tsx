"use client";

import Link from "next/link";
import { btnSecondaryMd } from "@/lib/btn-theme-classes";

export function SpeciesListAdminToolbar({
  q,
  type,
  available,
  sort,
  typeOptions,
}: {
  q: string;
  type: string;
  available: string;
  sort: string;
  typeOptions: string[];
}) {
  const hasFilters = q.trim() || type.trim() || available.trim();

  return (
    <form
      action="/settings/species-list"
      method="get"
      className="mt-6 flex flex-col gap-3 rounded border border-palm/25 bg-white/90 p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end dark:border-zinc-600 dark:bg-zinc-900/60"
    >
      <input type="hidden" name="sort" value={sort} />
      <label className="block min-w-[12rem] flex-1 text-sm font-bold text-ink dark:text-zinc-200">
        Search
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Species, customer email, morph…"
          className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          autoComplete="off"
        />
      </label>
      <label className="block min-w-[10rem] text-sm font-bold text-ink dark:text-zinc-200">
        Insect type
        <select
          name="type"
          defaultValue={type}
          className="mt-1 block w-full border-2 border-palm-mid bg-white px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
        >
          <option value="">All types</option>
          {typeOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>
      <label className="block min-w-[8rem] text-sm font-bold text-ink dark:text-zinc-200">
        Available
        <select
          name="available"
          defaultValue={available}
          className="mt-1 block w-full border-2 border-palm-mid bg-white px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
        >
          <option value="">All</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={btnSecondaryMd}>
          Apply
        </button>
        {hasFilters ? (
          <Link
            href={sort !== "species_asc" ? `/settings/species-list?sort=${encodeURIComponent(sort)}` : "/settings/species-list"}
            className={`inline-flex items-center ${btnSecondaryMd}`}
          >
            Clear filters
          </Link>
        ) : null}
      </div>
    </form>
  );
}
