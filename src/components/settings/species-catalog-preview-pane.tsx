"use client";

import { btnSecondaryMd } from "@/lib/btn-theme-classes";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { SpeciesCatalogFilters } from "@/components/settings/species-catalog-filters";
import { SpeciesCatalogTable } from "@/components/settings/species-catalog-table";
import {
  distinctSpeciesTypes,
  filterSpeciesCatalogRows,
  sortSpeciesCatalogRows,
  type SpeciesCatalogRow,
  type SpeciesCatalogSort,
  type SpeciesCatalogStatusFilter,
} from "@/lib/species-catalog";

export function SpeciesCatalogPreviewPane({ initialRows }: { initialRows: SpeciesCatalogRow[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<SpeciesCatalogStatusFilter>("all");
  const [sort, setSort] = useState<SpeciesCatalogSort>("date_desc");
  const [typeFilter, setTypeFilter] = useState("");

  const typeOptions = useMemo(() => distinctSpeciesTypes(initialRows), [initialRows]);

  const visibleRows = useMemo(() => {
    const filtered = filterSpeciesCatalogRows(initialRows, q, status, typeFilter);
    return sortSpeciesCatalogRows(filtered, sort);
  }, [initialRows, q, status, typeFilter, sort]);

  function clearFilters() {
    setQ("");
    setStatus("all");
    setSort("date_desc");
    setTypeFilter("");
  }

  return (
    <div className="space-y-3">
      <SpeciesCatalogFilters
        compact
        q={q}
        status={status}
        sort={sort}
        typeFilter={typeFilter}
        typeOptions={typeOptions}
        onQChange={setQ}
        onStatusChange={setStatus}
        onSortChange={setSort}
        onTypeChange={setTypeFilter}
        onClear={clearFilters}
      />
      <SpeciesCatalogTable
        rows={visibleRows}
        readOnly
        scrollMaxRows={8}
        emptyMessage="No species entries match. Open the full catalog to add or import."
      />
      <p className="text-[11px] text-ink/55 dark:text-zinc-500">
        Showing {visibleRows.length} of {initialRows.length} loaded entr{initialRows.length === 1 ? "y" : "ies"} (preview
        capped at 8 visible rows).
      </p>
      <div className="border-t border-palm/15 pt-4 dark:border-zinc-700">
        <button
          type="button"
          onClick={() => router.push("/settings/labels/species")}
          className={btnSecondaryMd}
        >
          Open species catalog
        </button>
        <p className="mt-3 text-sm text-ink/85">
          Search, import CSV, add or edit entries, and approve or deny (hide) rows in bulk on the full catalog page.
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-ink/85">
          <li>Customer-facing search and manual submissions — planned next</li>
          <li>Approved entries will appear in the label builder; denied rows stay hidden (not deleted)</li>
        </ul>
      </div>
    </div>
  );
}
