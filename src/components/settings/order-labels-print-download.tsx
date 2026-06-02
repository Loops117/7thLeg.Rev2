"use client";

import { btnSecondaryMd } from "@/lib/btn-theme-classes";
import { useState } from "react";
import { countOrderPrintSheets, type LabelFulfillmentPrintSettings } from "@/lib/order-label-print-plan";
import type { OrderLabelLineRecord } from "@/lib/order-label-entries";
import { labelFulfillmentSheetFormatLabel } from "@/lib/label-print-imposition";

function printSheetsZipHref(orderId: string): string {
  return `/api/settings/orders/${orderId}/labels/print-sheets.zip`;
}

export function OrderLabelsPrintDownload({
  orderId,
  lines,
  printSettings,
  downloadFilename,
}: {
  orderId: string;
  lines: OrderLabelLineRecord[];
  printSettings: LabelFulfillmentPrintSettings;
  downloadFilename: string;
}) {
  const sheetCount = countOrderPrintSheets(lines, printSettings);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  if (sheetCount === 0) return null;

  const onDownload = async () => {
    setError("");
    setPending(true);
    try {
      const res = await fetch(printSheetsZipHref(orderId), { cache: "no-store" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Download failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = downloadFilename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not download print sheets.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mt-4 border-t border-palm/20 pt-4 dark:border-zinc-600">
      <button
        type="button"
        disabled={pending}
        onClick={onDownload}
        className={btnSecondaryMd}
      >
        {pending ? "Preparing…" : `Download print sheets (${sheetCount} sheet${sheetCount === 1 ? "" : "s"}) →`}
      </button>
      <p className="mt-2 text-[11px] text-ink/55 dark:text-zinc-500">
        Saves as <span className="font-mono">{downloadFilename}</span>
      </p>
      <p className="mt-1 text-[11px] text-ink/55 dark:text-zinc-500">
        {labelFulfillmentSheetFormatLabel(printSettings.sheetFormat)} · {printSettings.sheetMarginMm} mm margin ·{" "}
        {printSettings.labelGapMm} mm gap · {printSettings.printDpi} DPI
        {printSettings.printTransparentBackground ? " · transparent sheet background" : ""} · ZIP of PNG files
      </p>
      {error ? <p className="mt-2 text-xs font-bold text-coral">{error}</p> : null}
    </div>
  );
}
