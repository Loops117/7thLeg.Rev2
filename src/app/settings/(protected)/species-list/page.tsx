import { Suspense } from "react";
import { listCustomerSpeciesInsectTypesAdmin } from "@/app/actions/customer-species-insect-types-admin";
import { SpeciesListAdminTable } from "@/components/settings/species-list-admin-table";
import { SpeciesListAdminToolbar } from "@/components/settings/species-list-admin-toolbar";
import { SpeciesListInsectTypesEditor } from "@/components/settings/species-list-insect-types-editor";
import { customerSpeciesDisplayName, speciesDateFromDb } from "@/lib/customer-species";
import {
  parseSpeciesListSort,
  speciesListAdminOrderBy,
  speciesListAdminWhere,
  type SpeciesListAdminRow,
} from "@/lib/customer-species-admin";
import { prisma } from "@/lib/prisma";

type Props = {
  searchParams: Promise<{ q?: string; type?: string; available?: string; sort?: string }>;
};

export default async function SettingsSpeciesListPage({ searchParams }: Props) {
  const sp = await searchParams;
  const qRaw = typeof sp.q === "string" ? sp.q : "";
  const q = qRaw.trim();
  const typeRaw = typeof sp.type === "string" ? sp.type : "";
  const type = typeRaw.trim();
  const availableRaw = typeof sp.available === "string" ? sp.available : "";
  const available = availableRaw.trim();
  const sort = parseSpeciesListSort(sp.sort);
  const where = speciesListAdminWhere(q, type, available);

  const [insectTypes, dbRows, totalInDb, matchCount, customerCount] = await Promise.all([
    listCustomerSpeciesInsectTypesAdmin(),
    prisma.customerSpeciesEntry.findMany({
      where,
      orderBy: speciesListAdminOrderBy(sort),
      take: 2000,
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            displayName: true,
            firstName: true,
            lastName: true,
            speciesListShareToken: true,
            speciesListPublicEnabled: true,
          },
        },
      },
    }),
    prisma.customerSpeciesEntry.count(),
    prisma.customerSpeciesEntry.count({ where }),
    prisma.customer.count({
      where: { speciesEntries: { some: {} } },
    }),
  ]);

  const rows: SpeciesListAdminRow[] = dbRows.map((r) => ({
    id: r.id,
    insectType: r.insectType,
    species: r.species,
    morphName: r.morphName,
    commonName: r.commonName,
    dateObtained: speciesDateFromDb(r.dateObtained),
    source: r.source,
    priceCents: r.priceCents,
    available: r.available,
    availabilityNotes: r.availabilityNotes,
    updatedAt: r.updatedAt.toISOString(),
    customerId: r.customer.id,
    customerEmail: r.customer.email,
    customerName: customerSpeciesDisplayName(r.customer),
    speciesListPublicEnabled: r.customer.speciesListPublicEnabled,
    shareToken: r.customer.speciesListShareToken,
  }));

  const typeOptions = insectTypes.filter((t) => t.active).map((t) => t.name);

  return (
    <div className="max-w-[90rem]">
      <h1 className="border-b-4 border-palm pb-3 text-2xl font-black text-palm">Species List</h1>
      <p className="mt-4 max-w-3xl text-ink/80 dark:text-zinc-300">
        Manage insect type options for customer species lists and review every entry across accounts.
      </p>

      <section className="mt-10">
        <h2 className="text-lg font-black text-palm dark:text-emerald-300">Insect type dropdown</h2>
        <SpeciesListInsectTypesEditor initial={insectTypes} />
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-black text-palm dark:text-emerald-300">All customer entries</h2>
        <p className="mt-2 text-sm text-ink/70 dark:text-zinc-400">
          {matchCount.toLocaleString()} shown
          {matchCount !== totalInDb ? ` · ${totalInDb.toLocaleString()} total entries` : ""} ·{" "}
          {customerCount.toLocaleString()} customers with lists · Click column headers to sort
        </p>
        <SpeciesListAdminToolbar
          q={qRaw}
          type={type}
          available={available}
          sort={sort}
          typeOptions={typeOptions}
        />
        <Suspense fallback={<p className="mt-6 text-sm text-ink/60">Loading table…</p>}>
          <SpeciesListAdminTable rows={rows} sort={sort} />
        </Suspense>
        {matchCount >= 2000 ? (
          <p className="mt-3 text-xs font-bold text-coral">
            Showing the first 2,000 matches — narrow your filters to see more.
          </p>
        ) : null}
      </section>
    </div>
  );
}
