"use client";

import { DataColumnMapper } from "@/components/labels/data-column-mapper";
import { PaletteCollapsible } from "@/components/labels/palette-collapsible";
import { useLabelEditor } from "@/components/labels/label-editor-context";
import {
  defaultTableCellStyle,
  getTableCellStyle,
  LABEL_FONT_FAMILIES,
  LABEL_FONT_FAMILY_LABELS,
  patchTableElementSize,
  resizeTableCellMappings,
  resizeTableCells,
  resizeTableCellStyles,
  type LabelTableCellStyle,
  type LabelTableElement,
  type LabelVerticalAlign,
} from "@/lib/label-editor/document";
import { resizeTableColWidths, resizeTableRowHeights } from "@/lib/label-editor/table-layout";
import { normalizeFontSizePercent, percentOf, pxFromPercent } from "@/lib/label-editor/typography";
import { editableRegionPx } from "@/lib/label-template-canvas";

export function LabelTableProperties({ id, el }: { id: string; el: LabelTableElement }) {
  const { dispatch, state, template } = useLabelEditor();
  const { widthPx: editW, heightPx: editH } = editableRegionPx(
    template.canvasWidthPx,
    template.canvasHeightPx,
    template.marginPx,
  );
  const patch = (p: Partial<LabelTableElement>) => dispatch({ type: "UPDATE_ELEMENT", id, patch: p });
  const sheet = state.doc.dataSheet;
  const mappings = el.cellDataColumnIndexes ?? [];
  const styles = el.cellStyles ?? [];
  const rows = Math.max(1, el.rows);
  const cols = Math.max(1, el.cols);

  const setRows = (nextRows: number) => {
    const r = Math.max(1, Math.min(12, nextRows));
    patch({
      rows: r,
      rowHeightsPx: resizeTableRowHeights(el.rowHeightsPx, el.rows, r, el.height),
      cells: resizeTableCells(el.cells, el.rows, el.cols, r, el.cols),
      cellDataColumnIndexes: resizeTableCellMappings(mappings, el.rows, el.cols, r, el.cols),
      cellStyles: resizeTableCellStyles(styles, el.rows, el.cols, r, el.cols),
    });
  };

  const setCols = (nextCols: number) => {
    const c = Math.max(1, Math.min(12, nextCols));
    patch({
      cols: c,
      colWidthsPx: resizeTableColWidths(el.colWidthsPx, el.cols, c, el.width),
      cells: resizeTableCells(el.cells, el.rows, el.cols, el.rows, c),
      cellDataColumnIndexes: resizeTableCellMappings(mappings, el.rows, el.cols, el.rows, c),
      cellStyles: resizeTableCellStyles(styles, el.rows, el.cols, el.rows, c),
    });
  };

  const setCell = (index: number, value: string) => {
    const cells = [...el.cells];
    cells[index] = value;
    patch({ cells });
  };

  const setCellMapping = (index: number, col: number | null) => {
    const cellDataColumnIndexes = [...mappings];
    while (cellDataColumnIndexes.length < rows * cols) cellDataColumnIndexes.push(null);
    cellDataColumnIndexes[index] = col;
    patch({ cellDataColumnIndexes });
  };

  const setCellStyle = (index: number, patchStyle: Partial<LabelTableCellStyle>) => {
    const cellStyles = [...styles];
    while (cellStyles.length < rows * cols) cellStyles.push(defaultTableCellStyle());
    cellStyles[index] = { ...getTableCellStyle(el, index), ...patchStyle };
    patch({ cellStyles });
  };

  return (
    <div className="mt-4 space-y-2 border-t border-palm/15 pt-4 text-xs dark:border-zinc-700">
      <p className="font-black uppercase text-palm">Selected table</p>

      <PaletteCollapsible title="Size & rotation" defaultOpen={false}>
        <label className="block font-bold text-ink/55">
          Width ({percentOf(el.width, editW)}%)
          <input
            type="range"
            min={5}
            max={100}
            value={percentOf(el.width, editW)}
            onChange={(e) =>
              patch(patchTableElementSize(el, pxFromPercent(Number(e.target.value), editW), el.height))
            }
            className="mt-1 w-full accent-palm"
          />
          <span className="mt-0.5 block text-[10px] font-normal text-ink/50">100% = full printable width</span>
        </label>
        <label className="block font-bold text-ink/55">
          Height ({percentOf(el.height, editH)}%)
          <input
            type="range"
            min={5}
            max={100}
            value={percentOf(el.height, editH)}
            onChange={(e) =>
              patch(patchTableElementSize(el, el.width, pxFromPercent(Number(e.target.value), editH)))
            }
            className="mt-1 w-full accent-palm"
          />
          <span className="mt-0.5 block text-[10px] font-normal text-ink/50">100% = full printable height</span>
        </label>
        <label className="block font-bold text-ink/55">
          Rotation ({el.rotation}°)
          <input
            type="range"
            min={-180}
            max={180}
            value={el.rotation}
            onChange={(e) => patch({ rotation: Number(e.target.value) })}
            className="mt-1 w-full accent-palm"
          />
        </label>
      </PaletteCollapsible>

      <PaletteCollapsible title="Rows, columns & borders" defaultOpen={false}>
        <label className="block font-bold text-ink/55">
          Rows
          <input
            type="number"
            min={1}
            max={12}
            value={rows}
            onChange={(e) => setRows(Number(e.target.value))}
            className="mt-1 w-full border px-2 py-1 dark:bg-zinc-950"
          />
        </label>
        <label className="block font-bold text-ink/55">
          Columns
          <input
            type="number"
            min={1}
            max={12}
            value={cols}
            onChange={(e) => setCols(Number(e.target.value))}
            className="mt-1 w-full border px-2 py-1 dark:bg-zinc-950"
          />
        </label>
        <label className="flex items-center gap-2 font-bold text-ink/55">
          <input
            type="checkbox"
            checked={el.showBorder}
            onChange={(e) => patch({ showBorder: e.target.checked })}
          />
          Show borders
        </label>
        {el.showBorder ? (
          <>
            <label className="block font-bold text-ink/55">
              Border width ({el.borderWidth}px)
              <input
                type="range"
                min={1}
                max={8}
                value={el.borderWidth}
                onChange={(e) => patch({ borderWidth: Number(e.target.value) })}
                className="mt-1 w-full accent-palm"
              />
            </label>
            <label className="block font-bold text-ink/55">
              Border color
              <input
                type="color"
                value={el.borderColor}
                onChange={(e) => patch({ borderColor: e.target.value })}
                className="mt-1 h-8 w-full"
              />
            </label>
          </>
        ) : null}
      </PaletteCollapsible>

      <PaletteCollapsible title="Cells" defaultOpen={false}>
        <div className="max-h-72 space-y-2 overflow-y-auto pr-0.5">
          {Array.from({ length: rows * cols }).map((_, i) => {
            const row = Math.floor(i / cols) + 1;
            const col = (i % cols) + 1;
            const mapped = mappings[i] ?? null;
            const style = getTableCellStyle(el, i);
            const cellH = Math.max(8, el.height / rows);
            return (
              <div key={i} className="rounded border border-palm/15 p-2 dark:border-zinc-600">
                <p className="text-[10px] font-bold text-palm">
                  Row {row}, col {col}
                </p>
                {sheet ? (
                  <DataColumnMapper
                    label="Data column"
                    value={mapped}
                    headers={sheet.headers}
                    onChange={(c) => setCellMapping(i, c)}
                  />
                ) : null}
                {mapped === null ? (
                  <label className="mt-1 block text-[10px] text-ink/60">
                    Static text
                    <input
                      value={el.cells[i] ?? ""}
                      onChange={(e) => setCell(i, e.target.value)}
                      className="mt-0.5 w-full border px-1 py-0.5 text-xs dark:bg-zinc-950"
                    />
                  </label>
                ) : (
                  <p className="mt-1 text-[10px] text-ink/50">Preview uses data row on canvas.</p>
                )}
                <label className="mt-2 block font-bold text-ink/55">
                  Font
                  <select
                    value={style.fontFamily}
                    onChange={(e) => setCellStyle(i, { fontFamily: e.target.value })}
                    className="mt-1 w-full border px-1 py-0.5 text-xs dark:bg-zinc-950"
                  >
                    {LABEL_FONT_FAMILIES.map((f) => (
                      <option key={f} value={f}>
                        {LABEL_FONT_FAMILY_LABELS[f]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mt-1 block font-bold text-ink/55">
                  Size ({normalizeFontSizePercent(style.fontSize, cellH)}%)
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={normalizeFontSizePercent(style.fontSize, cellH)}
                    onChange={(e) => setCellStyle(i, { fontSize: Number(e.target.value) })}
                    className="mt-1 w-full accent-palm"
                  />
                  <span className="mt-0.5 block text-[10px] font-normal text-ink/50">100% = cell height</span>
                </label>
                <label className="mt-1 block font-bold text-ink/55">
                  Color
                  <input
                    type="color"
                    value={style.color}
                    onChange={(e) => setCellStyle(i, { color: e.target.value })}
                    className="mt-1 h-7 w-full"
                  />
                </label>
                <div className="mt-1 flex flex-wrap gap-2 text-[10px]">
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={style.bold}
                      onChange={(e) => setCellStyle(i, { bold: e.target.checked })}
                    />
                    Bold
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={style.italic}
                      onChange={(e) => setCellStyle(i, { italic: e.target.checked })}
                    />
                    Italic
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={style.underline}
                      onChange={(e) => setCellStyle(i, { underline: e.target.checked })}
                    />
                    Underline
                  </label>
                </div>
                <label className="mt-1 block font-bold text-ink/55">
                  Horizontal align
                  <select
                    value={style.align}
                    onChange={(e) =>
                      setCellStyle(i, { align: e.target.value as LabelTableCellStyle["align"] })
                    }
                    className="mt-1 w-full border px-1 py-0.5 text-xs dark:bg-zinc-950"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </label>
                <label className="mt-1 block font-bold text-ink/55">
                  Vertical align
                  <select
                    value={style.verticalAlign}
                    onChange={(e) =>
                      setCellStyle(i, { verticalAlign: e.target.value as LabelVerticalAlign })
                    }
                    className="mt-1 w-full border px-1 py-0.5 text-xs dark:bg-zinc-950"
                  >
                    <option value="top">Top</option>
                    <option value="middle">Middle</option>
                    <option value="bottom">Bottom</option>
                  </select>
                </label>
                <div className="mt-1 flex flex-wrap gap-3 text-[10px]">
                  <label className="flex items-center gap-1 font-bold text-ink/55">
                    <input
                      type="checkbox"
                      checked={style.wordWrap !== false}
                      onChange={(e) => setCellStyle(i, { wordWrap: e.target.checked })}
                    />
                    Word wrap
                  </label>
                  <label className="flex items-center gap-1 font-bold text-ink/55">
                    <input
                      type="checkbox"
                      checked={style.textFit === true}
                      onChange={(e) => setCellStyle(i, { textFit: e.target.checked })}
                    />
                    Fit to cell
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </PaletteCollapsible>
    </div>
  );
}
