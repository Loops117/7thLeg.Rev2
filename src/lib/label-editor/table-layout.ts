import type { LabelTableElement } from "@/lib/label-editor/document";

export const TABLE_MIN_CELL_PX = 16;

export function getTableColWidthsPx(el: LabelTableElement): number[] {
  const cols = Math.max(1, el.cols);
  const stored = el.colWidthsPx;
  if (stored?.length === cols && stored.every((w) => w > 0)) {
    return scaleSizesToTotal(stored, el.width, cols);
  }
  return Array.from({ length: cols }, () => el.width / cols);
}

export function getTableRowHeightsPx(el: LabelTableElement): number[] {
  const rows = Math.max(1, el.rows);
  const stored = el.rowHeightsPx;
  if (stored?.length === rows && stored.every((h) => h > 0)) {
    return scaleSizesToTotal(stored, el.height, rows);
  }
  return Array.from({ length: rows }, () => el.height / rows);
}

function scaleSizesToTotal(sizes: number[], total: number, count: number): number[] {
  const sum = sizes.reduce((a, b) => a + b, 0);
  if (sum <= 0 || count <= 0) {
    return Array.from({ length: count }, () => total / Math.max(1, count));
  }
  const scaled = sizes.map((s) => (s / sum) * total);
  const rounded = scaled.map((s) => Math.max(TABLE_MIN_CELL_PX, s));
  const roundedSum = rounded.reduce((a, b) => a + b, 0);
  if (Math.abs(roundedSum - total) > 0.5 && rounded.length > 0) {
    const diff = total - roundedSum;
    rounded[rounded.length - 1] = Math.max(TABLE_MIN_CELL_PX, rounded[rounded.length - 1]! + diff);
  }
  return rounded;
}

export function applyColDividerDrag(
  colWidths: number[],
  dividerIndex: number,
  deltaPx: number,
  totalWidth: number,
): number[] {
  const i = dividerIndex;
  const j = i + 1;
  if (j >= colWidths.length) return colWidths;
  const next = [...colWidths];
  next[i] = (next[i] ?? 0) + deltaPx;
  next[j] = (next[j] ?? 0) - deltaPx;
  if (next[i]! < TABLE_MIN_CELL_PX) {
    const fix = TABLE_MIN_CELL_PX - next[i]!;
    next[i] = TABLE_MIN_CELL_PX;
    next[j]! -= fix;
  }
  if (next[j]! < TABLE_MIN_CELL_PX) {
    const fix = TABLE_MIN_CELL_PX - next[j]!;
    next[j] = TABLE_MIN_CELL_PX;
    next[i]! -= fix;
  }
  return scaleSizesToTotal(next, totalWidth, colWidths.length);
}

export function applyRowDividerDrag(
  rowHeights: number[],
  dividerIndex: number,
  deltaPx: number,
  totalHeight: number,
): number[] {
  const i = dividerIndex;
  const j = i + 1;
  if (j >= rowHeights.length) return rowHeights;
  const next = [...rowHeights];
  next[i] = (next[i] ?? 0) + deltaPx;
  next[j] = (next[j] ?? 0) - deltaPx;
  if (next[i]! < TABLE_MIN_CELL_PX) {
    const fix = TABLE_MIN_CELL_PX - next[i]!;
    next[i] = TABLE_MIN_CELL_PX;
    next[j]! -= fix;
  }
  if (next[j]! < TABLE_MIN_CELL_PX) {
    const fix = TABLE_MIN_CELL_PX - next[j]!;
    next[j] = TABLE_MIN_CELL_PX;
    next[i]! -= fix;
  }
  return scaleSizesToTotal(next, totalHeight, rowHeights.length);
}

export function resizeTableColWidths(
  widths: number[] | undefined,
  oldCols: number,
  newCols: number,
  tableWidth: number,
): number[] {
  const c = Math.max(1, Math.min(12, newCols));
  const oc = Math.max(1, oldCols);
  const old = getTableColWidthsPx({
    kind: "table",
    cols: oc,
    rows: 1,
    width: tableWidth,
    height: 1,
    colWidthsPx: widths,
  } as LabelTableElement);

  if (c === oc) return old;

  if (c > oc) {
    const next = [...old];
    const add = c - oc;
    const slice = Math.max(TABLE_MIN_CELL_PX, tableWidth / (oc + add));
    for (let i = 0; i < add; i++) {
      const takeFrom = Math.max(0, next.length - 1 - (i % next.length));
      const half = slice / 2;
      next[takeFrom] = Math.max(TABLE_MIN_CELL_PX, next[takeFrom]! - half);
      next.push(half);
    }
    return scaleSizesToTotal(next, tableWidth, c);
  }

  const next = [...old];
  while (next.length > c) {
    let bestI = 0;
    let bestSum = next[0]! + next[1]!;
    for (let i = 0; i < next.length - 1; i++) {
      const sum = next[i]! + next[i + 1]!;
      if (sum < bestSum) {
        bestSum = sum;
        bestI = i;
      }
    }
    next[bestI] = bestSum;
    next.splice(bestI + 1, 1);
  }
  return scaleSizesToTotal(next, tableWidth, c);
}

export function resizeTableRowHeights(
  heights: number[] | undefined,
  oldRows: number,
  newRows: number,
  tableHeight: number,
): number[] {
  const r = Math.max(1, Math.min(12, newRows));
  const or = Math.max(1, oldRows);
  const old = getTableRowHeightsPx({
    kind: "table",
    rows: or,
    cols: 1,
    width: 1,
    height: tableHeight,
    rowHeightsPx: heights,
  } as LabelTableElement);

  if (r === or) return old;

  if (r > or) {
    const next = [...old];
    const add = r - or;
    const slice = Math.max(TABLE_MIN_CELL_PX, tableHeight / (or + add));
    for (let i = 0; i < add; i++) {
      const takeFrom = Math.max(0, next.length - 1 - (i % next.length));
      const half = slice / 2;
      next[takeFrom] = Math.max(TABLE_MIN_CELL_PX, next[takeFrom]! - half);
      next.push(half);
    }
    return scaleSizesToTotal(next, tableHeight, r);
  }

  const next = [...old];
  while (next.length > r) {
    let bestI = 0;
    let bestSum = next[0]! + next[1]!;
    for (let i = 0; i < next.length - 1; i++) {
      const sum = next[i]! + next[i + 1]!;
      if (sum < bestSum) {
        bestSum = sum;
        bestI = i;
      }
    }
    next[bestI] = bestSum;
    next.splice(bestI + 1, 1);
  }
  return scaleSizesToTotal(next, tableHeight, r);
}

export function scaleTableLayoutToSize(
  el: LabelTableElement,
  width: number,
  height: number,
): Pick<LabelTableElement, "colWidthsPx" | "rowHeightsPx"> {
  const colWidthsPx = scaleSizesToTotal(getTableColWidthsPx(el), width, el.cols);
  const rowHeightsPx = scaleSizesToTotal(getTableRowHeightsPx(el), height, el.rows);
  return { colWidthsPx, rowHeightsPx };
}
