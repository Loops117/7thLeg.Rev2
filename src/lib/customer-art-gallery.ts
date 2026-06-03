import { prisma } from "@/lib/prisma";
import { formatCustomerFullName } from "@/lib/customer-display-name";
import type { HomePaneConfig } from "@/lib/pane-config";
import { normalizeArtGroupKey, parseHomePaneConfig } from "@/lib/pane-config";

export type ArtGalleryScope = "same_group" | "all_approved" | "selected_groups";

export type ApprovedArtGalleryItem = {
  id: string;
  imageUrl: string;
  artGroup: string;
  /** First + last name when set; otherwise display name or fallback label (never email). */
  submitterName: string;
};

/** Storefront gallery / lightbox submitter line (first + last preferred). */
export function gallerySubmitterName(c: {
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
}): string {
  const full = formatCustomerFullName(c);
  return full || "Community member";
}

export function resolveArtGalleryFilter(
  cfg: HomePaneConfig,
  paneArtGroup: string,
): { enabled: false } | { enabled: true; mode: "all" } | { enabled: true; mode: "groups"; groups: string[] } {
  if (cfg.artGalleryEnabled === false) return { enabled: false };

  const scope: ArtGalleryScope = cfg.artGalleryScope ?? "same_group";
  if (scope === "all_approved") return { enabled: true, mode: "all" };

  if (scope === "same_group") {
    const g = paneArtGroup.trim();
    if (!g) return { enabled: false };
    return { enabled: true, mode: "groups", groups: [g] };
  }

  const picked = [...new Set((cfg.artGalleryGroupKeys ?? []).map((k) => k.trim()).filter(Boolean))];
  if (picked.length === 0) {
    const g = paneArtGroup.trim();
    if (!g) return { enabled: false };
    return { enabled: true, mode: "groups", groups: [g] };
  }
  return { enabled: true, mode: "groups", groups: picked };
}

export async function listApprovedArtForGallery(
  filter: ReturnType<typeof resolveArtGalleryFilter>,
  limit = 48,
): Promise<ApprovedArtGalleryItem[]> {
  if (!filter.enabled) return [];

  const rows = await prisma.customerArtSubmission.findMany({
    where: {
      approved: true,
      customerRemovedAt: null,
      ...(filter.mode === "groups" ? { artGroup: { in: filter.groups } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      customer: {
        select: { email: true, firstName: true, lastName: true, displayName: true },
      },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    imageUrl: r.imageUrl,
    artGroup: r.artGroup,
    submitterName: gallerySubmitterName(r.customer),
  }));
}

/** Distinct art groups from submissions + ART_SUB pane configs (for admin pickers). */
export async function listKnownArtGroupNames(extraFromPanes: string[] = []): Promise<string[]> {
  const fromDb = await prisma.customerArtSubmission.findMany({
    distinct: ["artGroup"],
    select: { artGroup: true },
    orderBy: { artGroup: "asc" },
  });
  const set = new Set<string>();
  for (const row of fromDb) {
    const n = normalizeArtGroupKey(row.artGroup);
    if (n) set.add(n);
  }
  for (const raw of extraFromPanes) {
    const n = normalizeArtGroupKey(raw);
    if (n) set.add(n);
  }
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

/** All approved customer submissions for the public gallery page. */
export async function listAllApprovedArtForPublicGallery(limit = 200): Promise<ApprovedArtGalleryItem[]> {
  return listApprovedArtForGallery({ enabled: true, mode: "all" }, limit);
}

/** All known art group names for admin (DB + every ART_SUB pane on the site). */
export async function listKnownArtGroupNamesForAdmin(): Promise<string[]> {
  const artSubPanes = await prisma.pane.findMany({
    where: { type: "ART_SUB" },
    select: { config: true },
  });
  const extra: string[] = [];
  for (const pane of artSubPanes) {
    const cfg = parseHomePaneConfig(pane.config, "ART_SUB");
    if (cfg.artGroup) extra.push(cfg.artGroup);
    for (const g of cfg.artGalleryGroupKeys ?? []) extra.push(g);
  }
  return listKnownArtGroupNames(extra);
}
