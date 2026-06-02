import Link from "next/link";
import { EventsAdminPanel } from "@/components/settings/events-admin-panel";
import type { EventListRow } from "@/app/actions/events-admin";
import type { ProductFooterOption } from "@/lib/products-admin-types";
import { fetchEventEditPayload } from "@/lib/events-admin-read";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ edit?: string }> };

export default async function SettingsEventsPage({ searchParams }: Props) {
  const { edit: editId } = await searchParams;
  const trimmedEdit = editId?.trim() || null;

  const [events, types, products, footers, editPayload] = await Promise.all([
    prisma.event.findMany({
      orderBy: [{ startAt: "desc" }],
      select: {
        id: true,
        name: true,
        kind: true,
        details: true,
        startAt: true,
        endAt: true,
        signupButtonLabel: true,
        couponCode: true,
        pointsPerDollarOverride: true,
        saleDiscountMode: true,
        saleDiscountPercent: true,
        saleDiscountCents: true,
        _count: { select: { typeLinks: true, productLinks: true, entries: true, giveawayWinners: true } },
      },
    }),
    prisma.productType.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.product.findMany({
      orderBy: { name: "asc" },
      take: 800,
      select: { id: true, name: true, slug: true },
    }),
    prisma.automaticFooter.findMany({
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    trimmedEdit ? fetchEventEditPayload(trimmedEdit) : Promise.resolve(null),
  ]);

  const rows: EventListRow[] = events.map((e) => ({
    id: e.id,
    name: e.name,
    kind: e.kind,
    details: e.details,
    startAt: e.startAt.toISOString(),
    endAt: e.endAt.toISOString(),
    signupButtonLabel: e.signupButtonLabel,
    couponCode: e.couponCode,
    pointsPerDollarOverride: e.pointsPerDollarOverride,
    saleDiscountMode: e.saleDiscountMode,
    saleDiscountPercent: e.saleDiscountPercent,
    saleDiscountCents: e.saleDiscountCents,
    typeCount: e._count.typeLinks,
    productCount: e._count.productLinks,
    entryCount: e._count.entries,
    giveawayWinnersCount: e._count.giveawayWinners,
  }));

  const editNotFound = Boolean(trimmedEdit && !editPayload);

  return (
    <div>
      <h1 className="border-b-4 border-palm pb-3 text-2xl font-black text-palm">Events</h1>
      <p className="mt-4 text-ink/80">
        Timed sale events can apply storefront pricing and loyalty points for linked products. Sign-up events collect
        giveaway entries. Add an <strong>Event block</strong> pane on Home / Featured / About to showcase one.{" "}
        <Link href="/settings/home" className="font-medium text-lagoon-dark underline">
          Home panes
        </Link>
        .
      </p>

      <div className="mt-8">
        <EventsAdminPanel
          key={trimmedEdit ?? "new"}
          initialEvents={rows}
          types={types}
          products={products}
          footers={footers as ProductFooterOption[]}
          editPayload={editPayload}
          editIdFromUrl={trimmedEdit}
          editNotFound={editNotFound}
        />
      </div>
    </div>
  );
}
