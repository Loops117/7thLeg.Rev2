"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  formatSpeciesSuggestionLabel,
  normalizeSpeciesSuggestionKey,
  type SpeciesSuggestionAdminRow,
  type SpeciesSuggestionApprovedRow,
  type SpeciesSuggestionPublic,
} from "@/lib/species-suggestions";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "admin" || !session.user.id) {
    throw new Error("Unauthorized");
  }
}

async function requireCustomerId(): Promise<string> {
  const session = await auth();
  if (session?.user?.role !== "customer" || !session.user.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

function revalidateSuggestionPaths() {
  revalidatePath("/");
  revalidatePath("/about");
  revalidatePath("/featured");
  revalidatePath("/settings/suggestions");
}

export async function listApprovedSpeciesSuggestionsForPane(limit: number): Promise<SpeciesSuggestionApprovedRow[]> {
  const take = Math.min(Math.max(Math.floor(limit), 0), 50);
  if (take === 0) return [];

  const rows = await prisma.speciesSuggestion.findMany({
    where: { status: "APPROVED" },
    orderBy: { approvedAt: "desc" },
    take,
    select: {
      id: true,
      label: true,
      approvedAt: true,
      suggestionCount: true,
    },
  });

  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    approvedAt: r.approvedAt?.toISOString() ?? "",
    suggestionCount: r.suggestionCount,
  }));
}

export async function searchSpeciesSuggestionsForCustomer(
  query: string,
): Promise<SpeciesSuggestionPublic[]> {
  const session = await auth();
  const customerId = session?.user?.role === "customer" ? session.user.id : null;
  const q = query.trim().toLowerCase();
  if (q.length < 1) return [];

  const rows = await prisma.speciesSuggestion.findMany({
    where: {
      status: "PENDING",
      label: { contains: q, mode: "insensitive" },
      ...(customerId
        ? {
            votes: { none: { customerId } },
          }
        : {}),
    },
    orderBy: [{ suggestionCount: "desc" }, { label: "asc" }],
    take: 12,
    select: {
      id: true,
      label: true,
      suggestionCount: true,
    },
  });

  return rows;
}

export type SubmitSpeciesSuggestionResult =
  | { ok: true; suggestionId: string; created: boolean }
  | { ok: false; error: string };

export async function submitSpeciesSuggestion(
  labelInput: string,
  existingSuggestionId?: string | null,
): Promise<SubmitSpeciesSuggestionResult> {
  try {
    const customerId = await requireCustomerId();
    const label = formatSpeciesSuggestionLabel(labelInput);
    if (!label) return { ok: false, error: "Enter a species or design name." };

    if (existingSuggestionId?.trim()) {
      const existing = await prisma.speciesSuggestion.findFirst({
        where: {
          id: existingSuggestionId.trim(),
          status: "PENDING",
        },
      });
      if (!existing) return { ok: false, error: "That suggestion is no longer available." };

      const voted = await prisma.speciesSuggestionVote.findUnique({
        where: {
          suggestionId_customerId: {
            suggestionId: existing.id,
            customerId,
          },
        },
      });
      if (voted) return { ok: false, error: "You already suggested this species." };

      await prisma.$transaction([
        prisma.speciesSuggestionVote.create({
          data: { suggestionId: existing.id, customerId },
        }),
        prisma.speciesSuggestion.update({
          where: { id: existing.id },
          data: { suggestionCount: { increment: 1 } },
        }),
      ]);

      revalidateSuggestionPaths();
      return { ok: true, suggestionId: existing.id, created: false };
    }

    const normalizedKey = normalizeSpeciesSuggestionKey(label);
    if (!normalizedKey) return { ok: false, error: "Enter a species or design name." };

    const match = await prisma.speciesSuggestion.findUnique({
      where: { normalizedKey },
    });

    if (match) {
      if (match.status === "REMOVED") {
        return { ok: false, error: "That suggestion is not available." };
      }
      const voted = await prisma.speciesSuggestionVote.findUnique({
        where: {
          suggestionId_customerId: {
            suggestionId: match.id,
            customerId,
          },
        },
      });
      if (voted) return { ok: false, error: "You already suggested this species." };

      await prisma.$transaction([
        prisma.speciesSuggestionVote.create({
          data: { suggestionId: match.id, customerId },
        }),
        prisma.speciesSuggestion.update({
          where: { id: match.id },
          data: { suggestionCount: { increment: 1 } },
        }),
      ]);

      revalidateSuggestionPaths();
      return { ok: true, suggestionId: match.id, created: false };
    }

    const created = await prisma.speciesSuggestion.create({
      data: {
        label,
        normalizedKey,
        votes: { create: { customerId } },
      },
    });

    revalidateSuggestionPaths();
    return { ok: true, suggestionId: created.id, created: true };
  } catch (e) {
    console.error("submitSpeciesSuggestion", e);
    return { ok: false, error: e instanceof Error ? e.message : "Could not submit suggestion." };
  }
}

export async function listSpeciesSuggestionsForAdmin(): Promise<SpeciesSuggestionAdminRow[]> {
  await requireAdmin();
  const rows = await prisma.speciesSuggestion.findMany({
    orderBy: { firstSuggestedAt: "desc" },
    select: {
      id: true,
      label: true,
      status: true,
      firstSuggestedAt: true,
      suggestionCount: true,
      approvedAt: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    status: r.status,
    firstSuggestedAt: r.firstSuggestedAt.toISOString(),
    suggestionCount: r.suggestionCount,
    approvedAt: r.approvedAt?.toISOString() ?? null,
  }));
}

export async function listApprovedSpeciesSuggestionsForAdmin(): Promise<SpeciesSuggestionApprovedRow[]> {
  await requireAdmin();
  const rows = await prisma.speciesSuggestion.findMany({
    where: { status: "APPROVED" },
    orderBy: { approvedAt: "desc" },
    select: {
      id: true,
      label: true,
      approvedAt: true,
      suggestionCount: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    approvedAt: r.approvedAt?.toISOString() ?? "",
    suggestionCount: r.suggestionCount,
  }));
}

export type SpeciesSuggestionActionResult = { ok: true } | { ok: false; error: string };

export async function approveSpeciesSuggestion(id: string): Promise<SpeciesSuggestionActionResult> {
  try {
    await requireAdmin();
    await prisma.speciesSuggestion.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        removedAt: null,
      },
    });
    revalidateSuggestionPaths();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not approve." };
  }
}

export async function removeSpeciesSuggestion(id: string): Promise<SpeciesSuggestionActionResult> {
  try {
    await requireAdmin();
    await prisma.speciesSuggestion.update({
      where: { id },
      data: {
        status: "REMOVED",
        removedAt: new Date(),
      },
    });
    revalidateSuggestionPaths();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not remove." };
  }
}

export async function unapproveSpeciesSuggestion(id: string): Promise<SpeciesSuggestionActionResult> {
  try {
    await requireAdmin();
    await prisma.speciesSuggestion.update({
      where: { id },
      data: {
        status: "PENDING",
        approvedAt: null,
      },
    });
    revalidateSuggestionPaths();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not unapprove." };
  }
}

export async function updateSpeciesSuggestionLabel(
  id: string,
  labelInput: string,
): Promise<SpeciesSuggestionActionResult> {
  try {
    await requireAdmin();
    const label = formatSpeciesSuggestionLabel(labelInput);
    if (!label) return { ok: false, error: "Label cannot be empty." };
    const normalizedKey = normalizeSpeciesSuggestionKey(label);
    if (!normalizedKey) return { ok: false, error: "Label cannot be empty." };

    const conflict = await prisma.speciesSuggestion.findFirst({
      where: { normalizedKey, NOT: { id } },
    });
    if (conflict) return { ok: false, error: "Another suggestion already uses that name." };

    await prisma.speciesSuggestion.update({
      where: { id },
      data: { label, normalizedKey },
    });
    revalidateSuggestionPaths();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not update." };
  }
}

export async function deleteSpeciesSuggestionPermanently(id: string): Promise<SpeciesSuggestionActionResult> {
  try {
    await requireAdmin();
    await prisma.speciesSuggestion.delete({ where: { id } });
    revalidateSuggestionPaths();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not delete." };
  }
}
