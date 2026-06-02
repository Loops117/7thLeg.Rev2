export type SpeciesSuggestionStatusKey = "PENDING" | "APPROVED" | "REMOVED";

export type SpeciesSuggestionPublic = {
  id: string;
  label: string;
  suggestionCount: number;
};

export type SpeciesSuggestionAdminRow = {
  id: string;
  label: string;
  status: SpeciesSuggestionStatusKey;
  firstSuggestedAt: string;
  suggestionCount: number;
  approvedAt: string | null;
};

export type SpeciesSuggestionApprovedRow = {
  id: string;
  label: string;
  approvedAt: string;
  suggestionCount: number;
};

/** Normalize for dedup: lowercase, collapse whitespace, max 120 chars. */
export function normalizeSpeciesSuggestionKey(input: string): string | null {
  const t = input.trim().replace(/\s+/g, " ").toLowerCase().slice(0, 120);
  return t.length > 0 ? t : null;
}

/** Display label from user input (trim, collapse spaces, max 120). */
export function formatSpeciesSuggestionLabel(input: string): string | null {
  const t = input.trim().replace(/\s+/g, " ").slice(0, 120);
  return t.length > 0 ? t : null;
}

export type SpeciesSuggestionSortKey =
  | "date_desc"
  | "date_asc"
  | "count_desc"
  | "count_asc"
  | "label_asc"
  | "label_desc";

export type SpeciesSuggestionStatusFilter = "all" | "pending" | "approved" | "removed";

export function sortSpeciesSuggestionRows(
  rows: SpeciesSuggestionAdminRow[],
  sort: SpeciesSuggestionSortKey,
): SpeciesSuggestionAdminRow[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    switch (sort) {
      case "date_asc":
        return a.firstSuggestedAt.localeCompare(b.firstSuggestedAt);
      case "count_desc":
        return b.suggestionCount - a.suggestionCount;
      case "count_asc":
        return a.suggestionCount - b.suggestionCount;
      case "label_asc":
        return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
      case "label_desc":
        return b.label.localeCompare(a.label, undefined, { sensitivity: "base" });
      case "date_desc":
      default:
        return b.firstSuggestedAt.localeCompare(a.firstSuggestedAt);
    }
  });
  return copy;
}

export function filterSpeciesSuggestionRows(
  rows: SpeciesSuggestionAdminRow[],
  opts: { q?: string; status?: SpeciesSuggestionStatusFilter },
): SpeciesSuggestionAdminRow[] {
  const q = opts.q?.trim().toLowerCase() ?? "";
  const status = opts.status ?? "all";
  return rows.filter((r) => {
    if (status === "pending" && r.status !== "PENDING") return false;
    if (status === "approved" && r.status !== "APPROVED") return false;
    if (status === "removed" && r.status !== "REMOVED") return false;
    if (q && !r.label.toLowerCase().includes(q)) return false;
    return true;
  });
}
