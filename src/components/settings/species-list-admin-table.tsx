"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  SPECIES_LIST_SORT_COLUMNS,
  toggleSpeciesListSort,
  type SpeciesListAdminRow,
  type SpeciesListSort,
} from "@/lib/customer-species-admin";
import { formatSpeciesDateForDisplay } from "@/lib/customer-species";
import { formatPriceUsd } from "@/lib/product-slug";
import { speciesListPublicPath } from "@/lib/customer-species";

function buildSortHref(
  pathname: string,
  searchParams: { toString(): string },
  nextSort: SpeciesListSort,
): string {
  const params = new URLSearchParams(searchParams.toString());
  params.set("sort", nextSort);
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

function SortableTh({
  label,
  column,
  sort,
  pathname,
  searchParams,
}: {
  label: string;
  column: string;
  sort: SpeciesListSort;
  pathname: string;
  searchParams: { toString(): string };
}) {
  const [col, dir] = sort.split("_") as [string, "asc" | "desc"];
  const active = col === column;
  const indicator = active ? (dir === "asc" ? " ↑" : " ↓") : "";
  const nextSort = toggleSpeciesListSort(sort, column);
  const href = buildSortHref(pathname, searchParams, nextSort);

  return (
    <th className="px-3 py-2 font-black text-palm dark:text-emerald-300">
      <Link href={href} className="hover:underline">
        {label}
        {indicator}
      </Link>
    </th>
  );
}

export function SpeciesListAdminTable({
  rows,
  sort,
}: {
  rows: SpeciesListAdminRow[];
  sort: SpeciesListSort;
}) {
  const pathname = usePathname() ?? "/settings/species-list";
  const searchParams = useSearchParams() ?? new URLSearchParams();

  return (
    <div className="mt-6 overflow-x-auto rounded border border-palm/25 dark:border-zinc-600">
      <table className="min-w-[72rem] text-left text-sm">
        <thead>
          <tr className="border-b border-palm/20 bg-palm/5 dark:border-zinc-700 dark:bg-zinc-900/80">
            {SPECIES_LIST_SORT_COLUMNS.map((col) => (
              <SortableTh
                key={col.key}
                label={col.label}
                column={col.key}
                sort={sort}
                pathname={pathname}
                searchParams={searchParams}
              />
            ))}
            <th className="px-3 py-2 font-black text-palm dark:text-emerald-300">Share</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={SPECIES_LIST_SORT_COLUMNS.length + 1} className="px-3 py-6 text-ink/60 dark:text-zinc-400">
                No entries match these filters.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="border-b border-palm/10 dark:border-zinc-800">
                <td className="px-3 py-2">{row.insectType || "—"}</td>
                <td className="px-3 py-2 font-bold">{row.species}</td>
                <td className="px-3 py-2">{row.morphName || "—"}</td>
                <td className="px-3 py-2">{row.commonName || "—"}</td>
                <td className="px-3 py-2">{formatSpeciesDateForDisplay(row.dateObtained)}</td>
                <td className="px-3 py-2">{row.source || "—"}</td>
                <td className="px-3 py-2 tabular-nums">
                  {row.priceCents != null ? formatPriceUsd(row.priceCents) : "—"}
                </td>
                <td className="px-3 py-2">{row.available ? "Yes" : "No"}</td>
                <td className="px-3 py-2">
                  <div>
                    <Link
                      href={`/settings/customers?q=${encodeURIComponent(row.customerEmail)}`}
                      className="font-bold text-lagoon-dark underline dark:text-emerald-300"
                    >
                      {row.customerName}
                    </Link>
                    <div className="text-xs text-ink/55 dark:text-zinc-500">{row.customerEmail}</div>
                  </div>
                </td>
                <td className="px-3 py-2 text-xs text-ink/55 dark:text-zinc-500">
                  {new Date(row.updatedAt).toLocaleDateString()}
                </td>
                <td className="px-3 py-2">
                  {row.shareToken && row.speciesListPublicEnabled ? (
                    <Link
                      href={speciesListPublicPath(row.shareToken)}
                      className="text-xs font-bold text-lagoon-dark underline dark:text-emerald-300"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Public list
                    </Link>
                  ) : (
                    <span className="text-xs text-ink/45 dark:text-zinc-500">—</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
