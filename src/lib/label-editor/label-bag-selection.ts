const KEY = "lemons-label-bag-cart-selection";

export function readBagCartSelection(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeBagCartSelection(ids: Iterable<string>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify([...ids]));
}
