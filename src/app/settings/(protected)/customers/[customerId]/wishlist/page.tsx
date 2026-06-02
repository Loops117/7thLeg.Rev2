import Link from "next/link";
import { notFound } from "next/navigation";
import { auth as readAuthSession } from "@/auth";
import { formatCustomerFullName } from "@/lib/customer-display-name";
import { prisma } from "@/lib/prisma";
import { formatPriceUsd } from "@/lib/product-slug";
import { computeWishlistCurrentUnitPrice } from "@/lib/wishlist-pricing";

type Props = { params: Promise<{ customerId: string }> };

export default async function AdminCustomerWishlistPage({ params }: Props) {
  const session = await readAuthSession().catch(() => null);
  if (session?.user?.role !== "admin") {
    notFound();
  }

  const { customerId } = await params;
  const id = customerId?.trim();
  if (!id) notFound();

  const customer = await prisma.customer.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      displayName: true,
      firstName: true,
      lastName: true,
    },
  });
  if (!customer) notFound();

  const items = await prisma.customerWishlistItem.findMany({
    where: { customerId: id },
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          active: true,
          basePriceCents: true,
          onSale: true,
        },
      },
      variant: { select: { label: true, priceDeltaCents: true } },
    },
  });

  const rows = await Promise.all(
    items.map(async (row) => {
      const delta = row.variant?.priceDeltaCents ?? 0;
      const addedCents = row.unitPriceCentsAtAdd;
      if (!row.product.active) {
        return {
          id: row.id,
          createdAt: row.createdAt,
          name: row.product.name,
          href: null as string | null,
          variantLabel: row.variant?.label ?? null,
          showPair: false,
          addedCents,
          currentCents: addedCents,
          inactive: true,
        };
      }
      const { currentUnitCents } = await computeWishlistCurrentUnitPrice(
        row.product,
        delta,
        row.timedSaleEventIdAtAdd,
      );
      const showPair = currentUnitCents < addedCents;
      return {
        id: row.id,
        createdAt: row.createdAt,
        name: row.product.name,
        href: `/product/${row.product.slug}`,
        variantLabel: row.variant?.label ?? null,
        showPair,
        addedCents,
        currentCents: currentUnitCents,
        inactive: false,
      };
    }),
  );

  const label = formatCustomerFullName(customer) || customer.email;

  return (
    <>
      <p className="text-sm font-medium text-lagoon-dark">
        <Link href="/settings/customers" className="underline">
          ← Customers
        </Link>
      </p>
      <h1 className="mt-4 border-b-4 border-palm pb-3 text-2xl font-black text-palm">Wishlist</h1>
      <p className="mt-2 text-sm text-ink/75">
        <span className="font-bold text-ink">{label}</span>
        <span className="mx-1 text-ink/50">·</span>
        <span className="font-mono text-xs">{customer.email}</span>
      </p>

      {rows.length === 0 ? (
        <p className="mt-8 text-ink/70">This customer has no wishlist items.</p>
      ) : (
        <div className="admin-table-shell mt-8 max-w-4xl overflow-x-auto rounded border border-palm/25 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <table className="admin-striped w-full min-w-[560px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-palm/30 bg-palm/10 dark:border-zinc-600 dark:bg-zinc-800">
                <th className="px-3 py-3 font-bold text-palm dark:text-zinc-200">Date added</th>
                <th className="px-3 py-3 font-bold text-palm dark:text-zinc-200">Product</th>
                <th className="px-3 py-3 font-bold text-palm dark:text-zinc-200">Price</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-palm/15 dark:border-zinc-700">
                  <td className="whitespace-nowrap px-3 py-2.5 text-ink/80 dark:text-zinc-300">
                    {r.createdAt.toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5">
                    {r.href ? (
                      <Link href={r.href} className="font-bold text-lagoon-dark underline dark:text-emerald-300">
                        {r.name}
                      </Link>
                    ) : (
                      <span className="font-semibold text-ink/70 dark:text-zinc-400">{r.name}</span>
                    )}
                    {r.variantLabel ? (
                      <span className="mt-0.5 block text-xs text-ink/65 dark:text-zinc-500">Option: {r.variantLabel}</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 font-bold tabular-nums text-ink dark:text-zinc-100">
                    {r.inactive ? (
                      <span className="text-ink/55 dark:text-zinc-500">Unavailable</span>
                    ) : r.showPair ? (
                      <span>
                        <span className="text-ink/55 line-through dark:text-zinc-500">
                          {formatPriceUsd(r.addedCents)}
                        </span>
                        <span className="mx-1.5 text-palm-mid">/</span>
                        <span className="text-coral">{formatPriceUsd(r.currentCents)}</span>
                      </span>
                    ) : (
                      formatPriceUsd(r.currentCents)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
