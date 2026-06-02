/** Full name for tables and headers; prefers first + last, falls back to legacy displayName. */
export function formatCustomerFullName(c: {
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
}): string {
  const parts = [c.firstName?.trim(), c.lastName?.trim()].filter(Boolean);
  if (parts.length) return parts.join(" ");
  return c.displayName?.trim() || "";
}
