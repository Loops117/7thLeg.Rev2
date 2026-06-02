import Link from "next/link";
import { SpeciesCatalogAdmin } from "@/components/settings/species-catalog-admin";
import { SpeciesCatalogToolbar } from "@/components/settings/species-catalog-toolbar";
import {
  distinctSpeciesTypes,
  parseSpeciesCatalogSort,
  parseSpeciesCatalogStatus,
  speciesCatalogOrderBy,
  speciesCatalogSearchWhere,
  type SpeciesCatalogRow,
} from "@/lib/species-catalog";
import { prisma } from "@/lib/prisma";

type Props = {
  searchParams: Promise<{ q?: string; status?: string; sort?: string; type?: string }>;
};

export default async function SettingsSpeciesCatalogPage({ searchParams }: Props) {
  const sp = await searchParams;
  const qRaw = typeof sp.q === "string" ? sp.q : "";
  const q = qRaw.trim();
  const typeRaw = typeof sp.type === "string" ? sp.type : "";
  const status = parseSpeciesCatalogStatus(sp.status);
  const sort = parseSpeciesCatalogSort(sp.sort);
  const where = speciesCatalogSearchWhere(q, status, typeRaw);

  const [dbRows, totalInDb, matchCount, typeRows] = await Promise.all([
    prisma.speciesCatalogEntry.findMany({
      where,
      orderBy: speciesCatalogOrderBy(sort),
      take: 1000,
      select: {
        id: true,
        type: true,
        genus: true,
        species: true,
        commonName: true,
        morph: true,
        approved: true,
        createdAt: true,
      },
    }),
    prisma.speciesCatalogEntry.count(),
    prisma.speciesCatalogEntry.count({ where }),
    prisma.speciesCatalogEntry.findMany({
      where: { NOT: { type: "" } },
      select: { type: true },
      distinct: ["type"],
      orderBy: { type: "asc" },
      take: 200,
    }),
  ]);

  const rows: SpeciesCatalogRow[] = dbRows.map((r) => ({
    id: r.id,
    type: r.type,
    genus: r.genus,
    species: r.species,
    commonName: r.commonName,
    morph: r.morph,
    approved: r.approved,
    createdAt: r.createdAt.toISOString(),
  }));

  const typeOptions = distinctSpeciesTypes(
    typeRows.map((r) => ({ type: r.type })),
  );

  return (
    <div className="max-w-6xl">
      <p className="text-sm font-bold text-ink/70 dark:text-zinc-400">
        <Link href="/settings/labels" className="text-lagoon-dark underline dark:text-emerald-300">
          ← Labels
        </Link>
      </p>
      <h1 className="mt-2 border-b-4 border-palm pb-3 text-2xl font-black text-palm">Species catalog</h1>
      <p className="mt-4 max-w-3xl text-ink/80">
        Manage type, genus, species, common names, and morphs for the label builder. <strong>Approved</strong> entries
        will be visible to customers; <strong>denied</strong> (not approved) entries stay in the database but are
        hidden — like show/hide elsewhere. Customer search and submissions will connect here next.
      </p>

      <SpeciesCatalogToolbar q={qRaw} status={status} sort={sort} typeFilter={typeRaw} typeOptions={typeOptions} />

      <div className="mt-8">
        <SpeciesCatalogAdmin initialRows={rows} />
      </div>

      <p className="mt-4 text-xs text-ink/55 dark:text-zinc-500">
        {q || status !== "all" || typeRaw.trim()
          ? `Showing ${rows.length} of ${matchCount} match${matchCount === 1 ? "" : "es"}${matchCount > rows.length ? " (first 1000 by current sort)" : ""}.`
          : matchCount > rows.length
            ? `Showing first ${rows.length} of ${matchCount} entries.`
            : totalInDb === 0
              ? "No entries yet."
              : `Showing ${rows.length} entr${rows.length === 1 ? "y" : "ies"}.`}
      </p>
    </div>
  );
}
