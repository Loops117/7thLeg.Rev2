import type { OrderCustomLabelLineDisplay } from "@/lib/order-label-display";
import { formatPriceUsd } from "@/lib/product-slug";

/** Cart-style summary of custom label lines (account orders, admin, etc.). */
export function OrderCustomLabelsList({
  lines,
  showLineTotals = true,
  className = "",
}: {
  lines: OrderCustomLabelLineDisplay[];
  showLineTotals?: boolean;
  className?: string;
}) {
  if (lines.length === 0) return null;

  return (
    <div className={className}>
      <h3 className="text-sm font-black text-palm dark:text-emerald-300">Custom labels</h3>
      <ul className="mt-3 divide-y divide-palm/20 dark:divide-zinc-600">
        {lines.map((line) => (
          <li key={line.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
            <div className="min-w-0 flex-1">
              <p className="font-bold text-ink dark:text-zinc-100">{line.displayName}</p>
              {line.isBundle && line.bundleEntryLines.length > 0 ? (
                <ul className="mt-2 max-h-40 list-inside list-disc space-y-0.5 overflow-y-auto text-xs text-ink/75 dark:text-zinc-400">
                  {line.bundleEntryLines.map((entry, idx) => (
                    <li key={`${line.id}-${idx}`}>
                      {entry.displayName}
                      <span className="text-ink/50 dark:text-zinc-500">
                        {" "}
                        · {entry.templateName}
                        {entry.dataRowLabel ? ` · ${entry.dataRowLabel}` : ""}
                        {" · "}
                        <span className="font-bold text-ink/70 dark:text-zinc-300">Qty: {entry.quantity}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-ink/55 dark:text-zinc-500">
                  {line.templateName}
                  {line.widthMm != null && line.heightMm != null
                    ? ` · ${line.widthMm}×${line.heightMm} mm`
                    : ""}{" "}
                  · <span className="font-bold text-ink/70 dark:text-zinc-300">Qty: {line.quantity}</span>
                </p>
              )}
              {line.sheetSummary ? (
                <p className="mt-1 text-[11px] text-ink/50 dark:text-zinc-500">{line.sheetSummary}</p>
              ) : null}
            </div>
            {showLineTotals ? (
              <div className="text-right font-bold text-palm dark:text-emerald-300">
                {formatPriceUsd(line.lineTotalCents)}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
