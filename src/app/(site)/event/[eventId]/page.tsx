import Link from "next/link";
import { notFound } from "next/navigation";
import { EventKind } from "@/generated/prisma/client";
import { auth as readAuthSession } from "@/auth";
import { EventGiveawayEntryForm } from "@/components/event-giveaway-entry-form";
import { storefrontDisplayImageUrl } from "@/lib/product-images-public";
import { productCardAppearsInStock } from "@/lib/product-stock";
import { formatPriceUsd } from "@/lib/product-slug";
import { getStorefrontEventListing } from "@/lib/products-storefront";
import { isEventActive } from "@/lib/event-pricing";
import type { StorefrontProductCard } from "@/lib/products-storefront";

type Props = { params: Promise<{ eventId: string }> };

function cardPrice(p: StorefrontProductCard) {
  const price = p.displayPriceCents ?? p.basePriceCents;
  const sale = p.displaySale ?? p.onSale;
  return { price, sale };
}

export default async function PublicEventPage({ params }: Props) {
  const { eventId } = await params;
  const listing = await getStorefrontEventListing(eventId, 500);
  if (!listing) {
    notFound();
  }
  const { event, products } = listing;
  const active = isEventActive(event.startAt, event.endAt);
  const session = await readAuthSession().catch((err: unknown) => {
    console.error("[PublicEventPage] auth()", err);
    return null;
  });
  const customerEmail =
    session?.user?.role === "customer" && session.user.email ? session.user.email : null;

  const o = { dateStyle: "medium" as const, timeStyle: "short" as const };
  const range = `${event.startAt.toLocaleString(undefined, o)} – ${event.endAt.toLocaleString(undefined, o)}`;

  return (
    <div className="p-6 sm:p-10">
      <p className="text-sm font-medium text-lagoon-dark">
        <Link href="/store" className="underline">
          ← Store
        </Link>
      </p>
      <header className="mt-6 border-b-4 border-palm pb-4">
        <h1 className="text-3xl font-black tracking-tight text-palm sm:text-4xl">{event.name}</h1>
        <p className="mt-2 text-sm text-ink/75">{range}</p>
        {!active ? (
          <p className="mt-2 text-sm font-bold text-coral">This event is not currently active.</p>
        ) : null}
      </header>

      {event.details?.trim() ? (
        <div
          className="store-rich mt-8 max-w-3xl text-ink [&_a]:text-lagoon-dark [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: event.details }}
        />
      ) : null}

      {event.kind === EventKind.SIGNUP && active ? (
        <div className="mx-auto mt-10 max-w-lg rounded border-2 border-coral/40 bg-coral/10 p-6">
          <h2 className="text-center text-lg font-black text-palm">Enter this giveaway</h2>
          <EventGiveawayEntryForm
            eventId={event.id}
            buttonLabel={event.signupButtonLabel}
            loggedInEmail={customerEmail}
          />
        </div>
      ) : null}

      {event.kind === EventKind.COUPON && active ? (
        <div className="mx-auto mt-10 max-w-lg rounded border-2 border-lagoon/35 bg-lagoon/10 p-6 text-center">
          <p className="text-sm font-bold text-palm">Checkout promo</p>
          <p className="mt-3 text-lg font-black tracking-tight text-ink">
            Code <span className="text-palm">{event.couponCode.trim() || "—"}</span>
          </p>
          <p className="mt-2 text-sm text-ink/75">Apply it to your cart on the checkout page.</p>
        </div>
      ) : null}

      <section className="mt-12">
        <h2 className="text-lg font-black text-palm">Items in this event</h2>
        {products.length === 0 ? (
          <p className="mt-4 text-ink/75">No products are linked yet.</p>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => {
              const { price, sale } = cardPrice(p);
              const img = storefrontDisplayImageUrl(p.images);
              const qs =
                event.kind === EventKind.TIMED ? `?${new URLSearchParams({ event: event.id }).toString()}` : "";
              return (
                <li key={p.id}>
                  <Link
                    href={`/product/${p.slug}${qs}`}
                    className="store-product-card block overflow-hidden rounded"
                  >
                    <div className="store-product-card__image-area aspect-[4/3]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt={p.name} className="h-full w-full object-contain" />
                    </div>
                    <div className="p-3">
                      <p className="store-product-card__title line-clamp-2 text-sm font-bold">{p.name}</p>
                      <p className="store-product-card__price mt-2 text-sm font-bold">
                        {formatPriceUsd(price)}
                        {sale ? <span className="store-product-card__sale ml-1">Sale</span> : null}
                      </p>
                      {!productCardAppearsInStock(p) ? (
                        <p className="mt-1 text-xs text-coral">Out of stock</p>
                      ) : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
