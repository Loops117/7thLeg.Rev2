"use client";

import { btnSecondaryMd } from "@/lib/btn-theme-classes";

import Link from "next/link";

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "joined_desc", label: "Joined (newest)" },
  { value: "joined_asc", label: "Joined (oldest)" },
  { value: "email_asc", label: "Email A–Z" },
  { value: "email_desc", label: "Email Z–A" },
  { value: "name_asc", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
  { value: "points_desc", label: "Points (high → low)" },
  { value: "points_asc", label: "Points (low → high)" },
  { value: "orders_desc", label: "Orders (most)" },
  { value: "orders_asc", label: "Orders (fewest)" },
  { value: "wishlist_desc", label: "Wishlist (most)" },
  { value: "wishlist_asc", label: "Wishlist (fewest)" },
];

export function CustomersAdminToolbar({ q, sort }: { q: string; sort: string }) {
  return (
    <form
      action="/settings/customers"
      method="get"
      className="mt-6 flex flex-col gap-3 rounded border border-palm/25 bg-white/90 p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end dark:border-zinc-600 dark:bg-zinc-900/60"
    >
      <label className="block min-w-[12rem] flex-1 text-sm font-bold text-ink dark:text-zinc-200">
        Search
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Email, name, address, id…"
          className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          autoComplete="off"
        />
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
        {q.trim() ? (
          <Link
            href={sort !== "joined_desc" ? `/settings/customers?sort=${encodeURIComponent(sort)}` : "/settings/customers"}
            className={`inline-flex items-center ${btnSecondaryMd}`}
          >
            Clear search
          </Link>
        ) : null}
      </div>
    </form>
  );
}
