"use client";

import Link from "next/link";
import { btnSecondaryMd } from "@/lib/btn-theme-classes";

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "added_desc", label: "Date added (newest)" },
  { value: "added_asc", label: "Date added (oldest)" },
  { value: "product_asc", label: "Product A–Z" },
  { value: "product_desc", label: "Product Z–A" },
  { value: "customer_asc", label: "Customer A–Z" },
  { value: "customer_desc", label: "Customer Z–A" },
];

export function WishlistAdminToolbar({ q, sort }: { q: string; sort: string }) {
  return (
    <form
      action="/settings/wishlist"
      method="get"
      className="mt-6 flex flex-col gap-3 rounded border border-palm/25 bg-white/90 p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end dark:border-zinc-600 dark:bg-zinc-900/60"
    >
      <label className="block min-w-[12rem] flex-1 text-sm font-bold text-ink dark:text-zinc-200">
        Search
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Product name, customer email or name…"
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
        <button type="submit" className={btnSecondaryMd}>
          Apply
        </button>
        {q.trim() ? (
          <Link
            href={sort !== "added_desc" ? `/settings/wishlist?sort=${encodeURIComponent(sort)}` : "/settings/wishlist"}
            className={`inline-flex items-center ${btnSecondaryMd}`}
          >
            Clear search
          </Link>
        ) : null}
      </div>
    </form>
  );
}
