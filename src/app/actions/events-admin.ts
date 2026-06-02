"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { auth } from "@/auth";
import { EventKind, type EventSaleDiscountMode, type Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") throw new Error("Unauthorized");
}

export type EventListRow = {
  id: string;
  name: string;
  kind: EventKind;
  startAt: string;
  endAt: string;
  details: string;
  signupButtonLabel: string;
  couponCode: string;
  pointsPerDollarOverride: number | null;
  saleDiscountMode: EventSaleDiscountMode;
  saleDiscountPercent: number | null;
  saleDiscountCents: number | null;
  typeCount: number;
  productCount: number;
  entryCount: number;
  giveawayWinnersCount: number;
};

export type EventEditPayload = {
  id: string;
  kind: EventKind;
  name: string;
  details: string;
  startAt: string;
  endAt: string;
  signupButtonLabel: string;
  couponCode: string;
  couponPickerMeansIncluded: boolean;
  pointsPerDollarOverride: number | null;
  saleDiscountMode: EventSaleDiscountMode;
  saleDiscountPercent: number | null;
  saleDiscountCents: number | null;
  typeIds: string[];
  productIds: string[];
  couponPickProductIds: string[];
  includesLabelMaker: boolean;
  includesFreeShipping: boolean;
  giveawayPrimaryCount: number;
  giveawayBackupCount: number;
  giveawaySendEmailOnDraw: boolean;
  giveawayEmailSubject: string;
  giveawayEmailBody: string;
};

export type EventEntryRow = {
  email: string;
  createdAt: string;
  customerId: string | null;
};

function revalidateEventPaths() {
  revalidatePath("/settings/events");
  revalidatePath("/settings/products/events");
  revalidatePath("/");
  revalidatePath("/featured");
  revalidatePath("/about");
  revalidatePath("/store");
}

export async function listEventsForAdmin(): Promise<EventListRow[]> {
  await requireAdmin();
  const rows = await prisma.event.findMany({
    orderBy: { startAt: "desc" },
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
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    kind: r.kind,
    details: r.details,
    startAt: r.startAt.toISOString(),
    endAt: r.endAt.toISOString(),
    signupButtonLabel: r.signupButtonLabel,
    couponCode: r.couponCode,
    pointsPerDollarOverride: r.pointsPerDollarOverride,
    saleDiscountMode: r.saleDiscountMode,
    saleDiscountPercent: r.saleDiscountPercent,
    saleDiscountCents: r.saleDiscountCents,
    typeCount: r._count.typeLinks,
    productCount: r._count.productLinks,
    entryCount: r._count.entries,
    giveawayWinnersCount: r._count.giveawayWinners,
  }));
}

export type SaveEventInput = {
  id?: string;
  kind: EventKind;
  name: string;
  details: string;
  startAt: string;
  endAt: string;
  typeIds: string[];
  productIds: string[];
  couponCode?: string;
  couponPickerMeansIncluded?: boolean;
  couponPickProductIds?: string[];
  includesLabelMaker?: boolean;
  includesFreeShipping?: boolean;
  signupButtonLabel: string;
  pointsPerDollarOverride: number | null;
  saleDiscountMode: EventSaleDiscountMode;
  saleDiscountPercent: number | null;
  saleDiscountCents: number | null;
  giveawayPrimaryCount: number;
  giveawayBackupCount: number;
  giveawaySendEmailOnDraw: boolean;
  giveawayEmailSubject: string;
  giveawayEmailBody: string;
};

export type SaveEventResult = { ok: true; id: string } | { ok: false; error: string };

function normalizeCheckoutCouponCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

function normalizeDiscount(
  mode: EventSaleDiscountMode,
  percent: number | null,
  cents: number | null,
): { mode: EventSaleDiscountMode; percent: number | null; cents: number | null } {
  if (mode === "PERCENT") {
    const p = percent == null ? null : Math.min(100, Math.max(0, Math.floor(percent)));
    return { mode: "PERCENT", percent: p, cents: null };
  }
  if (mode === "FIXED_CENTS") {
    const c = cents == null ? null : Math.max(0, Math.floor(cents));
    return { mode: "FIXED_CENTS", percent: null, cents: c };
  }
  return { mode: "NONE", percent: null, cents: null };
}

function isDbConnectionLost(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    ((e as { code: string }).code === "P1017" || (e as { code: string }).code === "P1001")
  );
}

const SAVE_EVENT_TX = { maxWait: 10_000, timeout: 25_000 } as const;

export async function saveEvent(input: SaveEventInput): Promise<SaveEventResult> {
  noStore();
  try {
    await requireAdmin();
  } catch {
    return {
      ok: false,
      error: "Unauthorized. Sign out and sign back in via Settings login, or reload the page and try again.",
    };
  }

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name is required." };

  const start = input.startAt?.trim() ? new Date(input.startAt) : null;
  const end = input.endAt?.trim() ? new Date(input.endAt) : null;
  if (!start || Number.isNaN(start.getTime())) return { ok: false, error: "Valid start date required." };
  if (!end || Number.isNaN(end.getTime())) return { ok: false, error: "Valid end date required." };
  if (end.getTime() < start.getTime()) return { ok: false, error: "End must be after start." };

  const typeIds = [...new Set(input.typeIds.filter(Boolean))];
  const productIds = [...new Set(input.productIds.filter(Boolean))];
  const couponPickIds = [...new Set((input.couponPickProductIds ?? []).filter(Boolean))];

  const details = input.details?.trim() ?? "";
  const signupButtonLabel = input.signupButtonLabel?.trim().slice(0, 80) || "Sign up";

  let normalizedCouponCode = "";
  if (input.kind === EventKind.COUPON) {
    normalizedCouponCode = normalizeCheckoutCouponCode(input.couponCode ?? "");
    if (normalizedCouponCode.length < 2) {
      return { ok: false, error: "Enter a promo code at least two characters after trimming/spaces removed." };
    }
    const dup = await prisma.event.findFirst({
      where: {
        kind: EventKind.COUPON,
        couponCode: normalizedCouponCode,
        ...(input.id ? { id: { not: input.id } } : {}),
      },
      select: { id: true },
    });
    if (dup) return { ok: false, error: "Another event already uses this promo code." };
  }

  let pointsPerDollarOverride: number | null = null;
  if (input.kind === "TIMED" && input.pointsPerDollarOverride != null) {
    const n = Math.floor(Number(input.pointsPerDollarOverride));
    if (!Number.isNaN(n) && n >= 0 && n <= 1000) pointsPerDollarOverride = n;
  }

  const disc = normalizeDiscount(input.saleDiscountMode, input.saleDiscountPercent, input.saleDiscountCents);

  if (input.kind === EventKind.TIMED || input.kind === EventKind.COUPON) {
    if (disc.mode === "PERCENT" && (disc.percent == null || disc.percent < 1)) {
      return { ok: false, error: "Enter a percent off between 1 and 100." };
    }
    if (disc.mode === "FIXED_CENTS" && (disc.cents == null || disc.cents < 1)) {
      return { ok: false, error: "Enter a discount amount greater than zero." };
    }
  }

  const gPrimary = Math.min(500, Math.max(1, Math.floor(Number(input.giveawayPrimaryCount) || 1)));
  const gBackup = Math.min(500, Math.max(0, Math.floor(Number(input.giveawayBackupCount) || 0)));
  const gSubj = (input.giveawayEmailSubject ?? "").trim().slice(0, 300) || "Congratulations — you won!";
  const gBody = (input.giveawayEmailBody ?? "").trim().slice(0, 8000);

  const timedOrCouponPricing = input.kind === EventKind.TIMED || input.kind === EventKind.COUPON;

  const data = {
    kind: input.kind,
    name,
    details,
    startAt: start,
    endAt: end,
    signupButtonLabel,
    couponCode: input.kind === EventKind.COUPON ? normalizedCouponCode : "",
    couponPickerMeansIncluded: input.kind === EventKind.COUPON ? !!input.couponPickerMeansIncluded : false,
    includesLabelMaker:
      input.kind === EventKind.TIMED || input.kind === EventKind.COUPON ? !!input.includesLabelMaker : false,
    includesFreeShipping:
      input.kind === EventKind.TIMED || input.kind === EventKind.COUPON ? !!input.includesFreeShipping : false,
    pointsPerDollarOverride: input.kind === EventKind.TIMED ? pointsPerDollarOverride : null,
    saleDiscountMode: timedOrCouponPricing ? disc.mode : "NONE",
    saleDiscountPercent: timedOrCouponPricing ? disc.percent : null,
    saleDiscountCents: timedOrCouponPricing ? disc.cents : null,
    ...(input.kind === "SIGNUP"
      ? {
          giveawayPrimaryCount: gPrimary,
          giveawayBackupCount: gBackup,
          giveawaySendEmailOnDraw: !!input.giveawaySendEmailOnDraw,
          giveawayEmailSubject: gSubj,
          giveawayEmailBody: gBody,
        }
      : {
          giveawayPrimaryCount: 1,
          giveawayBackupCount: 0,
          giveawaySendEmailOnDraw: false,
          giveawayEmailSubject: "Congratulations — you won!",
          giveawayEmailBody: "",
        }),
  };

  type TxResult = { ok: true; id: string } | { ok: false; error: string };

  async function validateScopes(tx: Prisma.TransactionClient): Promise<TxResult | null> {
    if (typeIds.length > 0) {
      const found = await tx.productType.findMany({ where: { id: { in: typeIds } }, select: { id: true } });
      if (found.length !== typeIds.length) return { ok: false, error: "Invalid product type." };
    }
    if (productIds.length > 0) {
      const found = await tx.product.findMany({ where: { id: { in: productIds } }, select: { id: true } });
      if (found.length !== productIds.length) return { ok: false, error: "Invalid product." };
    }
    if (input.kind === EventKind.COUPON && couponPickIds.length > 0) {
      const pickFound = await tx.product.findMany({ where: { id: { in: couponPickIds } }, select: { id: true } });
      if (pickFound.length !== couponPickIds.length) return { ok: false, error: "Invalid coupon picker product." };
    }
    return null;
  }

  async function syncCouponPickerProducts(tx: Prisma.TransactionClient, eventId: string) {
    await tx.eventCouponProductPick.deleteMany({ where: { eventId } });
    if (input.kind !== EventKind.COUPON || couponPickIds.length === 0) return;
    for (const productId of couponPickIds) {
      await tx.eventCouponProductPick.create({ data: { eventId, productId } });
    }
  }

  try {
    if (input.id) {
      const out = await prisma.$transaction(async (tx): Promise<TxResult> => {
        const invalid = await validateScopes(tx);
        if (invalid) return invalid;
        const existing = await tx.event.findUnique({ where: { id: input.id }, select: { id: true } });
        if (!existing) return { ok: false, error: "Event not found." };
        await tx.event.update({
          where: { id: input.id },
          data,
        });
        await tx.eventOnProductType.deleteMany({ where: { eventId: input.id } });
        await tx.eventOnProduct.deleteMany({ where: { eventId: input.id } });
        for (const typeId of typeIds) {
          await tx.eventOnProductType.create({ data: { eventId: input.id!, typeId } });
        }
        for (const productId of productIds) {
          await tx.eventOnProduct.create({ data: { eventId: input.id!, productId } });
        }
        await syncCouponPickerProducts(tx, input.id!);
        return { ok: true, id: input.id! };
      }, SAVE_EVENT_TX);

      if (!out.ok) return out;
      revalidateEventPaths();
      revalidatePath(`/event/${out.id}`, "page");
      return { ok: true, id: out.id };
    }

    const out = await prisma.$transaction(async (tx): Promise<TxResult> => {
      const invalid = await validateScopes(tx);
      if (invalid) return invalid;
      const ev = await tx.event.create({ data });
      for (const typeId of typeIds) {
        await tx.eventOnProductType.create({ data: { eventId: ev.id, typeId } });
      }
      for (const productId of productIds) {
        await tx.eventOnProduct.create({ data: { eventId: ev.id, productId } });
      }
      await syncCouponPickerProducts(tx, ev.id);
      return { ok: true, id: ev.id };
    }, SAVE_EVENT_TX);

    if (!out.ok) return out;
    revalidateEventPaths();
    revalidatePath(`/event/${out.id}`, "page");
    return { ok: true, id: out.id };
  } catch (e) {
    if (isDbConnectionLost(e)) {
      return {
        ok: false,
        error:
          "Database connection was closed (often after idle time). Try again in a few seconds, or restart `npm run dev` and check DATABASE_URL / Supabase status.",
      };
    }
    throw e;
  }
}

export async function deleteEvent(id: string) {
  await requireAdmin();
  await prisma.event.delete({ where: { id } });
  revalidateEventPaths();
  revalidatePath(`/event/${id}`, "page");
}

export async function listEventsOptionsForPanes(): Promise<{ id: string; name: string }[]> {
  await requireAdmin();
  return prisma.event.findMany({
    orderBy: [{ startAt: "desc" }],
    select: { id: true, name: true },
  });
}

export async function listEventEntriesForAdmin(eventId: string): Promise<EventEntryRow[]> {
  await requireAdmin();
  const rows = await prisma.eventEntry.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
    select: { email: true, createdAt: true, customerId: true },
  });
  return rows.map((r) => ({
    email: r.email,
    createdAt: r.createdAt.toISOString(),
    customerId: r.customerId,
  }));
}

export async function exportEventEntriesCsv(eventId: string): Promise<{ ok: true; csv: string } | { ok: false }> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false };
  }
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, name: true, kind: true },
  });
  if (!event || event.kind !== "SIGNUP") return { ok: false };
  const entries = await prisma.eventEntry.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
    select: { email: true, createdAt: true },
  });
  const lines = ["email,signed_up_at_utc"];
  for (const e of entries) {
    const email = `"${e.email.replace(/"/g, '""')}"`;
    lines.push(`${email},${e.createdAt.toISOString()}`);
  }
  return { ok: true, csv: lines.join("\n") };
}
