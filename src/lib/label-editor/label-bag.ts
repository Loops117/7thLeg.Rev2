import type { LabelEditorDocument } from "@/lib/label-editor/document";

export type LabelBagItem = {
  id: string;
  templateId: string;
  templateName: string;
  widthMm: number;
  heightMm: number;
  document: LabelEditorDocument;
  quantity: number;
  /** 1-based row label for display when data mail-merge was used. */
  dataRowLabel: string | null;
  /** Linked saved design (account) when added after save. */
  savedDesignId?: string | null;
  /** Display name from saved design. */
  savedDesignName?: string | null;
  /** Client-side bag folder id (localStorage). */
  bagFolderId?: string | null;
  /** Unix ms when added to the label library. */
  addedAt?: number;
  /** In the checkout bag (above); false = saved in library only. */
  inBag?: boolean;
  /** Selected finish option for this line. */
  finishOptionId?: string | null;
  finishOptionName?: string | null;
  /** Per-label unit surcharge (cents) from finish selection. */
  finishPriceDeltaCents?: number;
};

export function normalizeBagItem(item: LabelBagItem): LabelBagItem {
  return {
    ...item,
    addedAt: typeof item.addedAt === "number" ? item.addedAt : 0,
    inBag: item.inBag !== false,
  };
}

export function sortBagItemsByAddedAt(items: LabelBagItem[]): LabelBagItem[] {
  return [...items].sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0));
}

const STORAGE_KEY = "lemons-label-bag";

export function readLabelBag(): LabelBagItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LabelBagItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeBagItem);
  } catch {
    return [];
  }
}

export function writeLabelBag(items: LabelBagItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 200)));
}

export function newBagItemId(): string {
  return `bag_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Parse "all", "1,2,4", or "1-21" into 0-based row indices (capped to rowCount). */
export function parseDataRowSelection(input: string, rowCount: number): number[] {
  const n = Math.max(0, rowCount);
  if (n === 0) return [];
  const raw = input.trim().toLowerCase();
  if (!raw || raw === "all") {
    return Array.from({ length: n }, (_, i) => i);
  }
  const out = new Set<number>();
  for (const part of raw.split(/[,;]+/)) {
    const p = part.trim();
    if (!p) continue;
    const range = p.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const a = Math.max(1, parseInt(range[1], 10));
      const b = Math.max(1, parseInt(range[2], 10));
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      for (let r = lo; r <= hi; r++) {
        if (r >= 1 && r <= n) out.add(r - 1);
      }
      continue;
    }
    const one = parseInt(p, 10);
    if (Number.isFinite(one) && one >= 1 && one <= n) out.add(one - 1);
  }
  return [...out].sort((a, b) => a - b);
}

export function cloneDocument(doc: LabelEditorDocument): LabelEditorDocument {
  return JSON.parse(JSON.stringify(doc)) as LabelEditorDocument;
}
