"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { readUploadedCsvText } from "@/lib/csv-text-encoding";
import {
  type CustomerSpeciesEntryInput,
  type CustomerSpeciesEntryRow,
  exportCustomerSpeciesCsv,
  parseCustomerSpeciesCsv,
  parseSpeciesDateInput,
  speciesDateFromDb,
  speciesDateToIsoString,
  resolveSpeciesListTitle,
  speciesListDefaultTitle,
  speciesListPublicPath,
  speciesListPublicUrl,
} from "@/lib/customer-species";
import { resolveCustomerSpeciesInsectType } from "@/lib/customer-species-insect-types";
import { getPublicAppOrigin } from "@/lib/public-app-origin";
import { prisma } from "@/lib/prisma";

async function requireCustomerId(): Promise<string> {
  const session = await auth();
  if (session?.user?.role !== "customer" || !session.user.id) {
    throw new Error("You must be signed in as a customer.");
  }
  return session.user.id;
}

function newShareToken(): string {
  return randomBytes(18).toString("base64url");
}

function rowFromDb(row: {
  id: string;
  species: string;
  insectType: string;
  morphName: string;
  commonName: string;
  dateObtained: Date | null;
  source: string;
  priceCents: number | null;
  acquisitionNotes: string;
  available: boolean;
  availabilityNotes: string;
}): CustomerSpeciesEntryRow {
  return {
    id: row.id,
    species: row.species,
    insectType: row.insectType,
    morphName: row.morphName,
    commonName: row.commonName,
    dateObtained: speciesDateFromDb(row.dateObtained),
    source: row.source,
    priceCents: row.priceCents,
    acquisitionNotes: row.acquisitionNotes,
    available: row.available,
    availabilityNotes: row.availabilityNotes,
  };
}

async function loadActiveInsectTypes(): Promise<{ name: string }[]> {
  return prisma.customerSpeciesInsectType.findMany({
    where: { active: true },
    select: { name: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

function sanitizeInput(
  input: CustomerSpeciesEntryInput,
  allowedInsectTypes: readonly { name: string }[],
): CustomerSpeciesEntryInput {
  const species = input.species?.trim().slice(0, 200) ?? "";
  if (!species) throw new Error("Species is required.");

  const price =
    input.priceCents == null || input.priceCents === ("" as unknown as number)
      ? null
      : Math.max(0, Math.floor(Number(input.priceCents)));

  let dateObtained: string | null = null;
  if (typeof input.dateObtained === "string" && input.dateObtained.trim()) {
    const d = parseSpeciesDateInput(input.dateObtained);
    if (!d) throw new Error("Date Obtained must be YYYY-MM-DD or M/D/YYYY.");
    dateObtained = speciesDateToIsoString(d);
    if (!dateObtained) throw new Error("Date Obtained must be YYYY-MM-DD or M/D/YYYY.");
  }

  const insectType = resolveCustomerSpeciesInsectType(input.insectType ?? "", allowedInsectTypes);

  return {
    species,
    insectType,
    morphName: (input.morphName ?? "").trim().slice(0, 200),
    commonName: (input.commonName ?? "").trim().slice(0, 200),
    dateObtained,
    source: (input.source ?? "").trim().slice(0, 200),
    priceCents: price != null && Number.isFinite(price) ? price : null,
    acquisitionNotes: (input.acquisitionNotes ?? "").trim().slice(0, 4000),
    available: !!input.available,
    availabilityNotes: (input.availabilityNotes ?? "").trim().slice(0, 1000),
  };
}

function revalidateSpeciesPaths(shareToken: string | null | undefined) {
  revalidatePath("/account/species");
  if (shareToken) revalidatePath(speciesListPublicPath(shareToken));
}

export async function listCustomerSpeciesForAccount(): Promise<CustomerSpeciesEntryRow[]> {
  const customerId = await requireCustomerId();
  const rows = await prisma.customerSpeciesEntry.findMany({
    where: { customerId },
    orderBy: [{ species: "asc" }, { insectType: "asc" }, { morphName: "asc" }],
  });
  return rows.map(rowFromDb);
}

export type CustomerSpeciesShareInfo = {
  shareToken: string;
  publicUrl: string;
  publicEnabled: boolean;
  listDisplayName: string;
  defaultListTitle: string;
  listTitle: string;
};

const customerShareSelect = {
  speciesListShareToken: true,
  speciesListPublicEnabled: true,
  speciesListDisplayName: true,
  displayName: true,
  firstName: true,
  lastName: true,
  email: true,
} as const;

function shareInfoFromCustomer(customer: {
  speciesListShareToken: string | null;
  speciesListPublicEnabled: boolean;
  speciesListDisplayName: string | null;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
}): CustomerSpeciesShareInfo {
  const shareToken = customer.speciesListShareToken;
  if (!shareToken) throw new Error("Could not create a share link. Try again.");
  return {
    shareToken,
    publicUrl: speciesListPublicUrl(shareToken, getPublicAppOrigin()),
    publicEnabled: customer.speciesListPublicEnabled ?? true,
    listDisplayName: customer.speciesListDisplayName?.trim() ?? "",
    defaultListTitle: speciesListDefaultTitle(customer),
    listTitle: resolveSpeciesListTitle(customer),
  };
}

export async function getCustomerSpeciesShareInfo(): Promise<CustomerSpeciesShareInfo> {
  const customerId = await requireCustomerId();
  let customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: customerShareSelect,
  });
  if (!customer) throw new Error("Account not found.");

  if (!customer.speciesListShareToken) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const token = newShareToken();
      try {
        customer = await prisma.customer.update({
          where: { id: customerId },
          data: { speciesListShareToken: token },
          select: customerShareSelect,
        });
        break;
      } catch {
        /* token collision — retry */
      }
    }
  }

  if (!customer) throw new Error("Account not found.");
  return shareInfoFromCustomer(customer);
}

export async function setCustomerSpeciesListDisplayName(
  name: string,
): Promise<{ ok: true; info: CustomerSpeciesShareInfo } | { ok: false; error: string }> {
  try {
    const customerId = await requireCustomerId();
    const trimmed = name.trim().slice(0, 120);
    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: { speciesListDisplayName: trimmed || null },
      select: customerShareSelect,
    });
    const info = shareInfoFromCustomer(customer);
    revalidateSpeciesPaths(info.shareToken);
    return { ok: true, info };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save list name." };
  }
}

export async function setCustomerSpeciesListPublicEnabled(
  enabled: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const customerId = await requireCustomerId();
    const info = await getCustomerSpeciesShareInfo();
    await prisma.customer.update({
      where: { id: customerId },
      data: { speciesListPublicEnabled: !!enabled },
    });
    revalidateSpeciesPaths(info.shareToken);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not update sharing." };
  }
}

export async function saveCustomerSpeciesEntry(
  input: CustomerSpeciesEntryInput & { id?: string },
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const customerId = await requireCustomerId();
    const allowedInsectTypes = await loadActiveInsectTypes();
    const data = sanitizeInput(input, allowedInsectTypes);
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { speciesListShareToken: true },
    });

    if (input.id?.trim()) {
      const existing = await prisma.customerSpeciesEntry.findFirst({
        where: { id: input.id.trim(), customerId },
        select: { id: true },
      });
      if (!existing) return { ok: false, error: "Entry not found." };

      await prisma.customerSpeciesEntry.update({
        where: { id: existing.id },
        data: {
          species: data.species,
          insectType: data.insectType,
          morphName: data.morphName,
          commonName: data.commonName,
          dateObtained: data.dateObtained ? new Date(`${data.dateObtained}T12:00:00.000Z`) : null,
          source: data.source,
          priceCents: data.priceCents,
          acquisitionNotes: data.acquisitionNotes,
          available: data.available,
          availabilityNotes: data.availabilityNotes,
        },
      });
      revalidateSpeciesPaths(customer?.speciesListShareToken);
      return { ok: true, id: existing.id };
    }

    const created = await prisma.customerSpeciesEntry.create({
      data: {
        customerId,
        species: data.species,
        insectType: data.insectType,
        morphName: data.morphName,
        commonName: data.commonName,
        dateObtained: data.dateObtained ? new Date(`${data.dateObtained}T12:00:00.000Z`) : null,
        source: data.source,
        priceCents: data.priceCents,
        acquisitionNotes: data.acquisitionNotes,
        available: data.available,
        availabilityNotes: data.availabilityNotes,
      },
      select: { id: true },
    });
    revalidateSpeciesPaths(customer?.speciesListShareToken);
    return { ok: true, id: created.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save entry." };
  }
}

function normalizeEntryIds(entryIds: string[]): string[] {
  return [...new Set(entryIds.map((id) => id.trim()).filter(Boolean))];
}

export async function bulkDeleteCustomerSpeciesEntries(
  entryIds: string[],
): Promise<{ ok: true; deleted: number } | { ok: false; error: string }> {
  try {
    const customerId = await requireCustomerId();
    const ids = normalizeEntryIds(entryIds);
    if (ids.length === 0) return { ok: false, error: "Select at least one entry." };

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { speciesListShareToken: true },
    });
    const deleted = await prisma.customerSpeciesEntry.deleteMany({
      where: { customerId, id: { in: ids } },
    });
    revalidateSpeciesPaths(customer?.speciesListShareToken);
    return { ok: true, deleted: deleted.count };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not delete entries." };
  }
}

export async function bulkSetCustomerSpeciesAvailability(
  entryIds: string[],
  available: boolean,
): Promise<{ ok: true; updated: number } | { ok: false; error: string }> {
  try {
    const customerId = await requireCustomerId();
    const ids = normalizeEntryIds(entryIds);
    if (ids.length === 0) return { ok: false, error: "Select at least one entry." };

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { speciesListShareToken: true },
    });
    const updated = await prisma.customerSpeciesEntry.updateMany({
      where: { customerId, id: { in: ids } },
      data: { available: !!available },
    });
    revalidateSpeciesPaths(customer?.speciesListShareToken);
    return { ok: true, updated: updated.count };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not update entries." };
  }
}

export async function deleteCustomerSpeciesEntry(
  entryId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const customerId = await requireCustomerId();
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { speciesListShareToken: true },
    });
    const deleted = await prisma.customerSpeciesEntry.deleteMany({
      where: { id: entryId.trim(), customerId },
    });
    if (deleted.count === 0) return { ok: false, error: "Entry not found." };
    revalidateSpeciesPaths(customer?.speciesListShareToken);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not delete entry." };
  }
}

export async function exportCustomerSpeciesCsvAction(): Promise<
  { ok: true; csv: string } | { ok: false; error: string }
> {
  try {
    const entries = await listCustomerSpeciesForAccount();
    return { ok: true, csv: exportCustomerSpeciesCsv(entries) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Export failed." };
  }
}

export async function importCustomerSpeciesCsvAction(
  formData: FormData,
): Promise<{ ok: true; imported: number } | { ok: false; error: string }> {
  try {
    const customerId = await requireCustomerId();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Choose a CSV file to import." };
    }
    if (file.size > 2_000_000) {
      return { ok: false, error: "CSV must be under 2 MB." };
    }

    const text = await readUploadedCsvText(file);
    const parsed = parseCustomerSpeciesCsv(text);
    if (!parsed.ok) return { ok: false, error: parsed.error };

    const allowedInsectTypes = await loadActiveInsectTypes();
    const rows = parsed.rows.map((row) => ({
      ...row,
      insectType: resolveCustomerSpeciesInsectType(row.insectType, allowedInsectTypes),
    }));

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { speciesListShareToken: true },
    });

    await prisma.$transaction(async (tx) => {
      await tx.customerSpeciesEntry.deleteMany({ where: { customerId } });
      if (rows.length > 0) {
        await tx.customerSpeciesEntry.createMany({
          data: rows.map((row) => ({
            customerId,
            species: row.species,
            insectType: row.insectType,
            morphName: row.morphName,
            commonName: row.commonName,
            dateObtained: row.dateObtained ? new Date(`${row.dateObtained}T12:00:00.000Z`) : null,
            source: row.source,
            priceCents: row.priceCents,
            acquisitionNotes: row.acquisitionNotes,
            available: row.available,
            availabilityNotes: row.availabilityNotes,
          })),
        });
      }
    });

    revalidateSpeciesPaths(customer?.speciesListShareToken);
    return { ok: true, imported: rows.length };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Import failed." };
  }
}
