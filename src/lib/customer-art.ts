import { formatCustomerFullName } from "@/lib/customer-display-name";

/** Art group tag for customer uploads from the public /gallery page. */
export const GALLERY_PAGE_ART_GROUP = "Gallery";

export type CustomerArtSubmissionRow = {
  id: string;
  artGroup: string;
  imageUrl: string;
  approved: boolean;
  customerRemovedAt: string | null;
  createdAt: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
};

export type CustomerMyArtUploadRow = {
  id: string;
  artGroup: string;
  imageUrl: string;
  approved: boolean;
  createdAt: string;
};

export type CustomerArtSortKey = "date_desc" | "date_asc" | "name_asc" | "name_desc" | "group_asc" | "group_desc";

export type CustomerArtStatusFilter = "all" | "approved" | "pending" | "customer_removed";

export function customerArtDisplayName(c: {
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  email: string;
}): string {
  const name = formatCustomerFullName(c);
  return name || c.email;
}

export function sortCustomerArtRows(rows: CustomerArtSubmissionRow[], sort: CustomerArtSortKey): CustomerArtSubmissionRow[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    switch (sort) {
      case "date_asc":
        return a.createdAt.localeCompare(b.createdAt);
      case "name_asc":
        return a.customerName.localeCompare(b.customerName, undefined, { sensitivity: "base" });
      case "name_desc":
        return b.customerName.localeCompare(a.customerName, undefined, { sensitivity: "base" });
      case "group_asc":
        return a.artGroup.localeCompare(b.artGroup, undefined, { sensitivity: "base" });
      case "group_desc":
        return b.artGroup.localeCompare(a.artGroup, undefined, { sensitivity: "base" });
      case "date_desc":
      default:
        return b.createdAt.localeCompare(a.createdAt);
    }
  });
  return copy;
}

export function filterCustomerArtRows(
  rows: CustomerArtSubmissionRow[],
  opts: {
    q?: string;
    artGroup?: string;
    status?: CustomerArtStatusFilter;
  },
): CustomerArtSubmissionRow[] {
  const q = opts.q?.trim().toLowerCase() ?? "";
  const group = opts.artGroup?.trim() ?? "";
  const status = opts.status ?? "all";

  return rows.filter((r) => {
    if (group && r.artGroup !== group) return false;
    if (status === "approved" && (!r.approved || r.customerRemovedAt)) return false;
    if (status === "pending" && (r.approved || r.customerRemovedAt)) return false;
    if (status === "customer_removed" && !r.customerRemovedAt) return false;
    if (q) {
      const hay = `${r.customerName} ${r.customerEmail} ${r.artGroup}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
