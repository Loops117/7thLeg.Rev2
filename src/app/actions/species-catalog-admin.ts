"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  normalizeSpeciesCatalogInput,
  parseSpeciesCatalogCsv,
  speciesCatalogDedupeKey,
  type SpeciesCatalogInput,
} from "@/lib/species-catalog";
import { prisma } from "@/lib/prisma";

async function findSpeciesDuplicate(
  type: string,
  genus: string,
  species: string,
  morph: string,
  excludeId?: string,
) {
  return prisma.speciesCatalogEntry.findFirst({
    where: {
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
      type: { equals: type, mode: "insensitive" },
      genus: { equals: genus, mode: "insensitive" },
      species: { equals: species, mode: "insensitive" },
      morph: { equals: morph, mode: "insensitive" },
    },
    select: { id: true },
  });
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

function revalidateSpeciesCatalog() {
  revalidatePath("/settings/labels/species");
  revalidatePath("/settings/labels");
  revalidatePath("/labels");
}

export type SpeciesCatalogActionResult = { ok: true } | { ok: false; error: string };

export type SpeciesCatalogImportResult =
  | { ok: true; created: number; skippedDuplicates: number; rowErrors: string[] }
  | { ok: false; error: string };

export async function adminCreateSpeciesCatalogEntry(
  input: SpeciesCatalogInput,
): Promise<SpeciesCatalogActionResult & { id?: string }> {
  try {
    await requireAdmin();
    const norm = normalizeSpeciesCatalogInput(input);
    if ("error" in norm) return { ok: false, error: norm.error };

    const dup = await findSpeciesDuplicate(norm.type, norm.genus, norm.species, norm.morph);
    if (dup) return { ok: false, error: "An entry with this type, genus, species, and morph already exists." };

    const row = await prisma.speciesCatalogEntry.create({ data: norm });
    revalidateSpeciesCatalog();
    return { ok: true, id: row.id };
  } catch (e) {
    console.error("adminCreateSpeciesCatalogEntry", e);
    return { ok: false, error: e instanceof Error ? e.message : "Could not create entry." };
  }
}

export async function adminUpdateSpeciesCatalogEntry(
  id: string,
  input: SpeciesCatalogInput,
): Promise<SpeciesCatalogActionResult> {
  try {
    await requireAdmin();
    const tid = id.trim();
    if (!tid) return { ok: false, error: "Invalid entry." };

    const norm = normalizeSpeciesCatalogInput(input);
    if ("error" in norm) return { ok: false, error: norm.error };

    const dup = await findSpeciesDuplicate(norm.type, norm.genus, norm.species, norm.morph, tid);
    if (dup) return { ok: false, error: "Another entry already uses this type, genus, species, and morph." };

    await prisma.speciesCatalogEntry.update({ where: { id: tid }, data: norm });
    revalidateSpeciesCatalog();
    return { ok: true };
  } catch (e) {
    console.error("adminUpdateSpeciesCatalogEntry", e);
    return { ok: false, error: e instanceof Error ? e.message : "Could not update entry." };
  }
}

export async function adminDeleteSpeciesCatalogEntry(id: string): Promise<SpeciesCatalogActionResult> {
  try {
    await requireAdmin();
    const tid = id.trim();
    if (!tid) return { ok: false, error: "Invalid entry." };
    await prisma.speciesCatalogEntry.delete({ where: { id: tid } });
    revalidateSpeciesCatalog();
    return { ok: true };
  } catch (e) {
    console.error("adminDeleteSpeciesCatalogEntry", e);
    return { ok: false, error: e instanceof Error ? e.message : "Could not delete entry." };
  }
}

export async function adminBulkSpeciesCatalogAction(
  ids: string[],
  action: "approve" | "deny" | "delete",
): Promise<SpeciesCatalogActionResult & { affected?: number }> {
  try {
    await requireAdmin();
    const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
    if (unique.length === 0) return { ok: false, error: "Select at least one entry." };

    if (action === "delete") {
      const r = await prisma.speciesCatalogEntry.deleteMany({ where: { id: { in: unique } } });
      revalidateSpeciesCatalog();
      return { ok: true, affected: r.count };
    }

    const approved = action === "approve";
    const r = await prisma.speciesCatalogEntry.updateMany({
      where: { id: { in: unique } },
      data: { approved },
    });
    revalidateSpeciesCatalog();
    return { ok: true, affected: r.count };
  } catch (e) {
    console.error("adminBulkSpeciesCatalogAction", e);
    return { ok: false, error: e instanceof Error ? e.message : "Bulk action failed." };
  }
}

export async function adminImportSpeciesCatalogCsv(formData: FormData): Promise<SpeciesCatalogImportResult> {
  try {
    await requireAdmin();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return { ok: false, error: "Choose a CSV file." };
    }
    if (file.size > 2 * 1024 * 1024) {
      return { ok: false, error: "CSV must be 2MB or smaller." };
    }

    const text = await file.text();
    const parsed = parseSpeciesCatalogCsv(text);
    if (!parsed.ok) return { ok: false, error: parsed.error };

    const seen = new Set<string>();
    const existing = await prisma.speciesCatalogEntry.findMany({
      select: { type: true, genus: true, species: true, morph: true },
    });
    for (const e of existing) seen.add(speciesCatalogDedupeKey(e.type, e.genus, e.species, e.morph));

    let created = 0;
    let skippedDuplicates = 0;
    const rowErrors: string[] = [];

    for (let i = 0; i < parsed.rows.length; i++) {
      const row = parsed.rows[i]!;
      const key = speciesCatalogDedupeKey(row.type, row.genus, row.species, row.morph);
      if (seen.has(key)) {
        skippedDuplicates++;
        continue;
      }
      try {
        await prisma.speciesCatalogEntry.create({ data: row });
        seen.add(key);
        created++;
      } catch {
        rowErrors.push(`Row ${i + 2}: could not save ${row.genus} ${row.species}.`);
      }
    }

    revalidateSpeciesCatalog();
    return { ok: true, created, skippedDuplicates, rowErrors: rowErrors.slice(0, 20) };
  } catch (e) {
    console.error("adminImportSpeciesCatalogCsv", e);
    return { ok: false, error: e instanceof Error ? e.message : "Import failed." };
  }
}
