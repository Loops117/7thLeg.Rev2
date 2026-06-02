import Link from "next/link";
import { auth as readAuthSession } from "@/auth";
import { WishlistRemoveButton } from "@/components/wishlist-remove-button";
import { prisma } from "@/lib/prisma";
import { formatPriceUsd } from "@/lib/product-slug";
import { computeWishlistCurrentUnitPrice } from "@/lib/wishlist-pricing";

type WishlistRow = {
  id: string;
  createdAt: Date;
  name: string;
  slug: string;
  href: string | null;
  variantLabel: string | null;
  addedCents: number;
  currentCents: number;
  showPair: boolean;
  inactive: boolean;
};

export default async function AccountWishlistPage() {
  const session = await readAuthSession().catch(() => null);

  if (!session?.user) {
    return (
      <div className="p-6 sm:p-10">
        <h1 className="border-b-4 border-palm pb-4 text-2xl font-black text-palm">Wishlist</h1>
        <p className="mt-6 max-w-xl text-ink/85">
          <Link href="/login?callbackUrl=/account/wishlist" className="font-bold text-lagoon-dark underline">
            Log in
          </Link>{" "}
          or{" "}
          <Link href="/register" className="font-bold text-lagoon-dark underline">
            create an account
          </Link>{" "}
          to save products you are interested in.
        </p>
      </div>
    );
  }

  if (session.user.role !== "customer" || !session.user.id) {
    return (
      <div className="p-6 sm:p-10">
        <h1 className="border-b-4 border-palm pb-4 text-2xl font-black text-palm">Wishlist</h1>
        <p className="mt-6 text-ink/80">Wishlist is available on a customer account.</p>
      </div>
    );
  }

  const items = await prisma.customerWishlistItem.findMany({
    where: { customerId: session.user.id },
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
      variant: { select: { id: true, label: true, priceDeltaCents: true } },
    },
  });

  const rows: WishlistRow[] = await Promise.all(
    items.map(async (row): Promise<WishlistRow> => {
      const delta = row.variant?.priceDeltaCents ?? 0;
      const addedCents = row.unitPriceCentsAtAdd;
      if (!row.product.active) {
        return {
          id: row.id,
          createdAt: row.createdAt,
          name: row.product.name,
          slug: row.product.slug,
          href: null,
          variantLabel: row.variant?.label ?? null,
          addedCents,
          currentCents: addedCents,
          showPair: false,
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
        slug: row.product.slug,
        href: `/product/${row.product.slug}`,
        variantLabel: row.variant?.label ?? null,
        addedCents,
        currentCents: currentUnitCents,
        showPair,
        inactive: false,
      };
    }),
  );

  return (
    <div className="p-6 sm:p-10">
      <h1 className="border-b-4 border-palm pb-4 text-2xl font-black text-palm">Wishlist</h1>
      <p className="mt-4 max-w-2xl text-sm text-ink/70">
        Prices update when you open this page. If an item costs less than when you saved it, or is on sale for less
        than your saved price, you will see the saved price struck through and the current price beside it.
      </p>

      {rows.length === 0 ? (
        <p className="mt-8 text-ink/75">
          Your wishlist is empty. Browse the store and use &quot;Add to wishlist&quot; on a product page.
        </p>
      ) : (
        <div className="admin-table-shell mt-8 max-w-4xl overflow-x-auto rounded border border-palm/25 bg-white shadow-sm">
          <table className="admin-striped w-full min-w-[560px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-palm/30 bg-palm/10">
                <th className="px-3 py-3 font-bold text-palm">Date added</th>
                <th className="px-3 py-3 font-bold text-palm">Product</th>
                <th className="px-3 py-3 font-bold text-palm">Current price</th>
                <th className="px-3 py-3 font-bold text-palm"> </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-palm/15">
                  <td className="whitespace-nowrap px-3 py-2.5 text-ink/80">{r.createdAt.toLocaleString()}</td>
                  <td className="px-3 py-2.5">
                    {r.href ? (
                      <Link href={r.href} className="font-bold text-lagoon-dark underline">
                        {r.name}
                      </Link>
                    ) : (
                      <span className="font-semibold text-ink/70">{r.name}</span>
                    )}
                    {r.variantLabel ? (
                      <span className="mt-0.5 block text-xs text-ink/65">Option: {r.variantLabel}</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 font-bold tabular-nums text-ink">
                    {r.inactive ? (
                      <span className="text-ink/55">Unavailable</span>
                    ) : r.showPair ? (
                      <span>
                        <span className="text-ink/55 line-through">{formatPriceUsd(r.addedCents)}</span>
                        <span className="mx-1.5 text-palm-mid">/</span>
                        <span className="text-coral">{formatPriceUsd(r.currentCents)}</span>
                      </span>
                    ) : (
                      formatPriceUsd(r.currentCents)
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <WishlistRemoveButton wishlistItemId={r.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
