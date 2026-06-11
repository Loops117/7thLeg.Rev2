import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { WishlistAdminToolbar } from "@/components/settings/wishlist-admin-toolbar";
import { formatCustomerFullName } from "@/lib/customer-display-name";
import { prisma } from "@/lib/prisma";

const SORT_VALUES = new Set([
  "added_desc",
  "added_asc",
  "product_asc",
  "product_desc",
  "customer_asc",
  "customer_desc",
]);

function parseSort(raw: string | undefined): string {
  const s = (raw ?? "").trim();
  return SORT_VALUES.has(s) ? s : "added_desc";
}

function buildWishlistOrderBy(
  sort: string,
): Prisma.CustomerWishlistItemOrderByWithRelationInput | Prisma.CustomerWishlistItemOrderByWithRelationInput[] {
  switch (sort) {
    case "added_asc":
      return { createdAt: "asc" };
    case "product_asc":
      return { product: { name: "asc" } };
    case "product_desc":
      return { product: { name: "desc" } };
    case "customer_asc":
      return [
        { customer: { displayName: "asc" } },
        { customer: { firstName: "asc" } },
        { customer: { lastName: "asc" } },
        { customer: { email: "asc" } },
      ];
    case "customer_desc":
      return [
        { customer: { displayName: "desc" } },
        { customer: { firstName: "desc" } },
        { customer: { lastName: "desc" } },
        { customer: { email: "desc" } },
      ];
    case "added_desc":
    default:
      return { createdAt: "desc" };
  }
}

function buildWishlistSearchWhere(q: string): Prisma.CustomerWishlistItemWhereInput {
  const t = q.trim();
  if (!t) return {};
  return {
    OR: [
      { product: { name: { contains: t, mode: "insensitive" } } },
      { product: { slug: { contains: t, mode: "insensitive" } } },
      { variant: { label: { contains: t, mode: "insensitive" } } },
      { customer: { email: { contains: t, mode: "insensitive" } } },
      { customer: { displayName: { contains: t, mode: "insensitive" } } },
      { customer: { firstName: { contains: t, mode: "insensitive" } } },
      { customer: { lastName: { contains: t, mode: "insensitive" } } },
    ],
  };
}

type Props = { searchParams: Promise<{ q?: string; sort?: string }> };

export default async function SettingsWishlistPage({ searchParams }: Props) {
  const sp = await searchParams;
  const qRaw = typeof sp.q === "string" ? sp.q : "";
  const q = qRaw.trim();
  const sort = parseSort(sp.sort);
  const where = buildWishlistSearchWhere(q);
  const orderBy = buildWishlistOrderBy(sort);

  const [rows, totalInDb, matchCount] = await Promise.all([
    prisma.customerWishlistItem.findMany({
      where,
      orderBy,
      take: 500,
      select: {
        id: true,
        createdAt: true,
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            active: true,
            inBreeding: true,
          },
        },
        variant: { select: { label: true } },
        customer: {
          select: {
            id: true,
            email: true,
            displayName: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
    prisma.customerWishlistItem.count(),
    prisma.customerWishlistItem.count({ where }),
  ]);

  return (
    <div>
      <h1 className="border-b-4 border-palm pb-3 text-2xl font-black text-palm">Wishlist</h1>
      <p className="mt-4 max-w-3xl text-sm text-ink/80">
        Every product saved on customer wishlists. Search by product or customer, or sort the list to spot popular
        items and who is waiting on them.
      </p>

      <WishlistAdminToolbar q={qRaw} sort={sort} />

      <p className="mt-4 text-sm text-ink/70">
        {q
          ? `${matchCount} match${matchCount === 1 ? "" : "es"}`
          : `${totalInDb} item${totalInDb === 1 ? "" : "s"} total`}
        {rows.length < matchCount ? ` — showing first ${rows.length}` : ""}
        {q || sort !== "added_desc" ? (
          <>
            {" "}
            ·{" "}
            <Link href="/settings/wishlist" className="font-medium text-lagoon-dark underline">
              Reset filters
            </Link>
          </>
        ) : null}
      </p>

      {totalInDb === 0 ? (
        <p className="mt-8 text-ink/70">No wishlist items yet.</p>
      ) : matchCount === 0 ? (
        <p className="mt-8 text-ink/70">No items match your search.</p>
      ) : (
        <div className="admin-table-shell mt-6 overflow-x-auto rounded border border-palm/25 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <table className="admin-striped w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-palm/30 bg-palm/10 dark:border-zinc-600 dark:bg-zinc-800">
                <th className="px-3 py-3 font-bold text-palm dark:text-zinc-200">Date added</th>
                <th className="px-3 py-3 font-bold text-palm dark:text-zinc-200">Product</th>
                <th className="px-3 py-3 font-bold text-palm dark:text-zinc-200">Customer</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const customerLabel = formatCustomerFullName(row.customer) || row.customer.email;
                const productHref = row.product.active ? `/product/${row.product.slug}` : null;
                const customerHref = `/settings/customers/${encodeURIComponent(row.customer.id)}/wishlist`;

                return (
                  <tr key={row.id} className="border-b border-palm/15 dark:border-zinc-700">
                    <td className="whitespace-nowrap px-3 py-2.5 text-ink/80 dark:text-zinc-300">
                      {row.createdAt.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5">
                      {productHref ? (
                        <Link
                          href={productHref}
                          className="font-bold text-lagoon-dark underline dark:text-emerald-300"
                        >
                          {row.product.name}
                        </Link>
                      ) : (
                        <span className="font-semibold text-ink/70 dark:text-zinc-400">{row.product.name}</span>
                      )}
                      {row.variant?.label ? (
                        <span className="mt-0.5 block text-xs text-ink/65 dark:text-zinc-500">
                          Option: {row.variant.label}
                        </span>
                      ) : null}
                      {!row.product.active ? (
                        <span className="mt-1 inline-block text-[10px] font-bold uppercase tracking-wide text-coral">
                          Inactive
                        </span>
                      ) : row.product.inBreeding ? (
                        <span className="mt-1 inline-block text-[10px] font-bold uppercase tracking-wide text-palm-mid">
                          In breeding
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5">
                      <Link
                        href={customerHref}
                        className="font-bold text-lagoon-dark underline dark:text-emerald-300"
                      >
                        {customerLabel}
                      </Link>
                      <span className="mt-0.5 block font-mono text-xs text-ink/65 dark:text-zinc-500">
                        {row.customer.email}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
