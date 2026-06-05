export type CustomerSpeciesInsectTypeOption = {
  id: string;
  name: string;
};

export type CustomerSpeciesInsectTypeAdminRow = CustomerSpeciesInsectTypeOption & {
  sortOrder: number;
  active: boolean;
};

/** Match raw input to an allowed type name (case-insensitive); empty string if no match. */
export function resolveCustomerSpeciesInsectType(
  raw: string,
  allowed: readonly { name: string }[],
): string {
  const t = raw.trim();
  if (!t) return "";
  const match = allowed.find(
    (a) => a.name.localeCompare(t, undefined, { sensitivity: "accent" }) === 0,
  );
  return match?.name ?? "";
}
