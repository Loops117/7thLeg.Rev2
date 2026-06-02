"use client";

import { useState } from "react";
import { useLabelEditor } from "@/components/labels/label-editor-context";
import { LABEL_REMOVAL_MESSAGES, confirmLabelRemoval } from "@/lib/label-editor/confirm-removal";
import { parseCsvToDataSheet, type LabelDataSheet } from "@/lib/label-editor/document";
import { btnImportantLink, btnSecondaryMd, btnSecondarySm } from "@/lib/btn-theme-classes";

export function LabelDataPanel({ onMessage }: { onMessage: (msg: string) => void }) {
  const { state, dispatch } = useLabelEditor();
  const [csvPaste, setCsvPaste] = useState("");
  const sheet = state.doc.dataSheet;

  const applyCsv = () => {
    const parsed = parseCsvToDataSheet(csvPaste);
    if (!parsed) {
      onMessage("Could not parse data. Use comma or tab separated rows with a header row.");
      return;
    }
    dispatch({ type: "SET_DATA_SHEET", sheet: parsed });
    onMessage(`Loaded ${parsed.rows.length} row(s), ${parsed.headers.length} column(s).`);
  };

  return (
    <div className="mt-4 space-y-4">
      <h2 className="text-sm font-black text-palm">Data</h2>
      <p className="text-xs text-ink/65">
        Paste CSV data, edit the table below, then map columns to text boxes or table cells in the Text panel.
      </p>
      <textarea
        value={csvPaste}
        onChange={(e) => setCsvPaste(e.target.value)}
        placeholder={"Name,Qty,Date\nAcropora,5,2026-01-01"}
        rows={5}
        className="w-full border-2 border-palm/30 p-2 font-mono text-xs dark:border-zinc-600 dark:bg-zinc-950"
      />
      <button
        type="button"
        className={`w-full ${btnSecondaryMd}`}
        onClick={applyCsv}
      >
        Load data
      </button>

      {sheet ? (
        <DataSheetEditor sheet={sheet} rowIndex={state.doc.dataRowIndex} />
      ) : (
        <p className="text-xs text-ink/50">No data loaded yet.</p>
      )}

      {sheet ? (
        <button
          type="button"
          className={btnImportantLink}
          onClick={() => {
            if (!confirmLabelRemoval(LABEL_REMOVAL_MESSAGES.clearData)) return;
            dispatch({ type: "SET_DATA_SHEET", sheet: null });
            onMessage("Data cleared.");
          }}
        >
          Clear all data
        </button>
      ) : null}
    </div>
  );
}

function DataSheetEditor({ sheet, rowIndex }: { sheet: LabelDataSheet; rowIndex: number }) {
  const { dispatch } = useLabelEditor();

  return (
    <div className="space-y-3 border-t border-palm/15 pt-3 dark:border-zinc-700">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold text-ink/55">
          {sheet.rows.length} row(s) · {sheet.headers.length} column(s)
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={btnSecondarySm}
            onClick={() => dispatch({ type: "ADD_DATA_ROW" })}
          >
            + Row
          </button>
          <button
            type="button"
            className={btnSecondarySm}
            onClick={() => dispatch({ type: "ADD_DATA_COLUMN" })}
          >
            + Column
          </button>
        </div>
      </div>

      <div className="max-h-56 overflow-auto rounded border border-palm/20 dark:border-zinc-600">
        <table className="w-full min-w-[16rem] border-collapse text-left text-[10px]">
          <thead className="sticky top-0 bg-surf dark:bg-zinc-800">
            <tr>
              <th className="border border-palm/15 px-1 py-1 font-black text-palm dark:border-zinc-600">#</th>
              {sheet.headers.map((h, col) => (
                <th key={col} className="border border-palm/15 px-1 py-1 dark:border-zinc-600">
                  <input
                    value={h}
                    onChange={(e) =>
                      dispatch({ type: "UPDATE_DATA_HEADER", col, value: e.target.value })
                    }
                    className="w-full min-w-[4rem] border-0 bg-transparent font-bold outline-none focus:ring-1 focus:ring-palm"
                    aria-label={`Column ${col + 1} header`}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sheet.rows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={rowIdx === rowIndex ? "bg-palm/10 dark:bg-emerald-900/30" : undefined}
              >
                <td className="border border-palm/15 px-1 py-0.5 font-bold text-ink/50 dark:border-zinc-600">
                  {rowIdx + 1}
                </td>
                {sheet.headers.map((_, col) => (
                  <td key={col} className="border border-palm/15 p-0 dark:border-zinc-600">
                    <input
                      value={row[col] ?? ""}
                      onChange={(e) =>
                        dispatch({
                          type: "UPDATE_DATA_CELL",
                          row: rowIdx,
                          col,
                          value: e.target.value,
                        })
                      }
                      className="w-full min-w-[4rem] border-0 bg-transparent px-1 py-0.5 outline-none focus:bg-white/80 dark:focus:bg-zinc-900"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-ink/50">
        Highlighted row matches the label preview on the canvas. Use the arrows on the canvas to change rows.
      </p>
    </div>
  );
}
