import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { CustomersAdminToolbar } from "@/components/settings/customers-admin-toolbar";
import { prisma } from "@/lib/prisma";
import { formatCustomerFullName } from "@/lib/customer-display-name";

function formatAddress(c: {
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateRegion: string | null;
  postalCode: string | null;
  country: string | null;
}): string {
  const parts: string[] = [];
  if (c.addressLine1) parts.push(c.addressLine1);
  if (c.addressLine2) parts.push(c.addressLine2);
  const cityLine = [c.city, c.stateRegion, c.postalCode].filter(Boolean).join(", ");
  if (cityLine) parts.push(cityLine);
  if (c.country) parts.push(c.country);
  return parts.length ? parts.join(" · ") : "—";
}

const SORT_VALUES = new Set([
  "joined_desc",
  "joined_asc",
  "email_asc",
  "email_desc",
  "name_asc",
  "name_desc",
  "points_desc",
  "points_asc",
  "orders_desc",
  "orders_asc",
  "wishlist_desc",
  "wishlist_asc",
]);

function parseSort(raw: string | undefined): string {
  const s = (raw ?? "").trim();
  return SORT_VALUES.has(s) ? s : "joined_desc";
}

function buildCustomerOrderBy(
  sort: string,
): Prisma.CustomerOrderByWithRelationInput | Prisma.CustomerOrderByWithRelationInput[] {
  switch (sort) {
    case "joined_asc":
      return { createdAt: "asc" };
    case "email_asc":
      return { email: "asc" };
    case "email_desc":
      return { email: "desc" };
    case "name_asc":
      return [{ displayName: "asc" }, { firstName: "asc" }, { lastName: "asc" }, { email: "asc" }];
    case "name_desc":
      return [{ displayName: "desc" }, { firstName: "desc" }, { lastName: "desc" }, { email: "desc" }];
    case "points_asc":
      return { pointsBalance: "asc" };
    case "points_desc":
      return { pointsBalance: "desc" };
    case "orders_asc":
      return { orders: { _count: "asc" } };
    case "orders_desc":
      return { orders: { _count: "desc" } };
    case "wishlist_asc":
      return { wishlistItems: { _count: "asc" } };
    case "wishlist_desc":
      return { wishlistItems: { _count: "desc" } };
    case "joined_desc":
    default:
      return { createdAt: "desc" };
  }
}

function buildCustomerSearchWhere(q: string): Prisma.CustomerWhereInput {
  const t = q.trim();
  if (!t) return {};
  return {
    OR: [
      { email: { contains: t, mode: "insensitive" } },
      { displayName: { contains: t, mode: "insensitive" } },
      { firstName: { contains: t, mode: "insensitive" } },
      { lastName: { contains: t, mode: "insensitive" } },
      { addressLine1: { contains: t, mode: "insensitive" } },
      { addressLine2: { contains: t, mode: "insensitive" } },
      { city: { contains: t, mode: "insensitive" } },
      { stateRegion: { contains: t, mode: "insensitive" } },
      { postalCode: { contains: t, mode: "insensitive" } },
      { country: { contains: t, mode: "insensitive" } },
      { id: { contains: t, mode: "insensitive" } },
    ],
  };
}

type Props = { searchParams: Promise<{ q?: string; sort?: string }> };

export default async function SettingsCustomersPage({ searchParams }: Props) {
  const sp = await searchParams;
  const qRaw = typeof sp.q === "string" ? sp.q : "";
  const q = qRaw.trim();
  const sort = parseSort(sp.sort);
  const where = buildCustomerSearchWhere(q);
  const orderBy = buildCustomerOrderBy(sort);

  const [rows, totalInDb, matchCount] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy,
      take: 500,
      select: {
        id: true,
        email: true,
        displayName: true,
        firstName: true,
        lastName: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        stateRegion: true,
        postalCode: true,
        country: true,
        pointsBalance: true,
        createdAt: true,
        _count: { select: { orders: true, wishlistItems: true } },
      },
    }),
    prisma.customer.count(),
    prisma.customer.count({ where }),
  ]);

  const emptyIsGlobal = totalInDb === 0;
  const emptyIsFilter = !emptyIsGlobal && rows.length === 0 && q.length > 0;

  return (
    <>
      <h1 className="border-b-4 border-palm pb-3 text-2xl font-black text-palm">Customers</h1>
      <p className="mt-4 max-w-2xl text-ink/80">
        Storefront accounts (email + password). Admins are listed separately under{" "}
        <code className="rounded bg-black/5 px-1 text-sm">admin_users</code> and sign in via{" "}
        <code className="rounded bg-black/5 px-1 text-sm">/settings/login</code>.
      </p>

      <CustomersAdminToolbar q={qRaw} sort={sort} />

      <div className="admin-table-shell mt-6 overflow-x-auto rounded border border-palm/25 bg-white shadow-sm">
        <table className="admin-striped w-full min-w-[820px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b-2 border-palm/30 bg-palm/10">
              <th className="px-3 py-3 font-bold text-palm">Email</th>
              <th className="px-3 py-3 font-bold text-palm">Name</th>
              <th className="px-3 py-3 font-bold text-palm">Address</th>
              <th className="px-3 py-3 font-bold text-palm">Points</th>
              <th className="px-3 py-3 font-bold text-palm">Orders</th>
              <th className="px-3 py-3 font-bold text-palm">Wishlist</th>
              <th className="px-3 py-3 font-bold text-palm">Joined</th>
              <th className="px-3 py-3 font-bold text-palm">Purchases</th>
            </tr>
          </thead>
          <tbody>
            {emptyIsGlobal ? (
              <tr className="admin-empty-row">
                <td colSpan={8} className="px-3 py-8 text-center text-ink/60">
                  No customer accounts yet.
                </td>
              </tr>
            ) : emptyIsFilter ? (
              <tr className="admin-empty-row">
                <td colSpan={8} className="px-3 py-8 text-center text-ink/60">
                  No customers match{" "}
                  <strong className="text-ink">{q.length > 80 ? `${q.slice(0, 80)}…` : q}</strong>.{" "}
                  <Link href={sort !== "joined_desc" ? `/settings/customers?sort=${encodeURIComponent(sort)}` : "/settings/customers"} className="font-bold text-lagoon-dark underline">
                    Clear search
                  </Link>
                  .
                </td>
              </tr>
            ) : (
              rows.map((c) => (
                <tr key={c.id} className="border-b border-palm/15">
                  <td className="max-w-[200px] px-3 py-2.5 font-mono text-[13px] text-ink break-all">{c.email}</td>
                  <td className="px-3 py-2.5 text-ink">{formatCustomerFullName(c) || "—"}</td>
                  <td className="max-w-[280px] px-3 py-2.5 text-ink/85" title={formatAddress(c)}>
                    {formatAddress(c)}
                  </td>
                  <td className="px-3 py-2.5 font-bold text-palm">{c.pointsBalance}</td>
                  <td className="px-3 py-2.5 text-ink">{c._count.orders}</td>
                  <td className="px-3 py-2.5">
                    {c._count.wishlistItems === 0 ? (
                      <span className="text-ink/55">Empty</span>
                    ) : (
                      <Link
                        href={`/settings/customers/${encodeURIComponent(c.id)}/wishlist`}
                        className="font-bold text-lagoon-dark underline hover:no-underline dark:text-emerald-300"
                      >
                        {c._count.wishlistItems} item{c._count.wishlistItems === 1 ? "" : "s"}
                      </Link>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-ink/75 dark:text-zinc-300">
                    {c.createdAt.toLocaleDateString()}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <Link
                      href={`/settings/sales?customer=${encodeURIComponent(c.id)}`}
                      className="font-bold text-lagoon-dark underline hover:no-underline dark:text-emerald-300"
                    >
                      {c._count.orders} order{c._count.orders === 1 ? "" : "s"} →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-ink/55">
        {q
          ? `Showing ${rows.length} of ${matchCount} match${matchCount === 1 ? "" : "es"}${matchCount > rows.length ? " (first 500 by current sort)" : ""}.`
          : matchCount > rows.length
            ? `Showing first ${rows.length} of ${matchCount} customers (sorted as selected).`
            : `Showing ${rows.length} customer${rows.length === 1 ? "" : "s"}.`}
      </p>
    </>
  );
}
