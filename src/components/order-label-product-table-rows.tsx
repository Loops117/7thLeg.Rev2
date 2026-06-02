import type { OrderCustomLabelLineDisplay } from "@/lib/order-label-display";
import type { OrderLabelLineRecord } from "@/lib/order-label-entries";
import { formatPriceUsd } from "@/lib/product-slug";

type Variant = "admin" | "account";

function unitCentsForLine(record: OrderLabelLineRecord): number {
  const qty = Math.max(1, record.quantity);
  return Math.round(record.lineTotalCents / qty);
}

export function OrderLabelProductTableRows({
  displayLines,
  records,
  variant,
  showSubtotal = true,
}: {
  displayLines: OrderCustomLabelLineDisplay[];
  records: OrderLabelLineRecord[];
  variant: Variant;
  showSubtotal?: boolean;
}) {
  if (displayLines.length === 0) return null;

  const recordById = new Map(records.map((r) => [r.id, r]));
  const subtotalCents = records.reduce((sum, r) => sum + r.lineTotalCents, 0);

  const nameCellClass = variant === "admin" ? "px-3 py-2.5" : "py-2 pr-2";
  const numCellClass =
    variant === "admin" ? "px-3 py-2.5 text-right" : "py-2 pr-2 text-right tabular-nums";
  const lineCellClass =
    variant === "admin"
      ? "px-3 py-2.5 text-right font-bold"
      : "py-2 text-right font-bold tabular-nums";

  const nameBoldClass =
    variant === "admin" ? "font-bold text-ink dark:text-zinc-100" : "font-semibold text-ink";

  const borderRowClass =
    variant === "admin" ? "border-b border-palm/15" : "border-b border-palm/10";

  const subtotalRowClass =
    variant === "admin"
      ? "border-t-2 border-palm/25 bg-surf/30 dark:border-zinc-600 dark:bg-zinc-900/40"
      : "border-t-2 border-palm/20 bg-surf/25";

  return (
    <>
      {displayLines.map((line) => {
        const record = recordById.get(line.id);
        const unitCents = record ? unitCentsForLine(record) : 0;

        return (
          <tr key={line.id} className={borderRowClass}>
            <td className={nameCellClass}>
              <span className={nameBoldClass}>{line.displayName}</span>
              {line.isBundle && line.bundleEntryLines.length > 0 ? (
                <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-xs text-ink/70 dark:text-zinc-400">
                  {line.bundleEntryLines.map((entry, idx) => (
                    <li key={`${line.id}-entry-${idx}`}>
                      {entry.displayName}
                      <span className="text-ink/50 dark:text-zinc-500">
                        {" "}
                        · {entry.templateName}
                        {entry.dataRowLabel ? ` · ${entry.dataRowLabel}` : ""}
                        {" · "}
                        <span className="font-bold text-ink/75 dark:text-zinc-300">Qty: {entry.quantity}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-0.5 text-xs text-ink/60 dark:text-zinc-500">
                  {line.templateName}
                  {line.widthMm != null && line.heightMm != null
                    ? ` · ${line.widthMm}×${line.heightMm} mm`
                    : ""}
                  {line.sheetSummary ? ` · ${line.sheetSummary}` : ""}
                </p>
              )}
            </td>
            <td className={numCellClass}>{line.quantity}</td>
            <td className={numCellClass}>{formatPriceUsd(unitCents)}</td>
            <td className={lineCellClass}>{formatPriceUsd(line.lineTotalCents)}</td>
          </tr>
        );
      })}
      {showSubtotal ? (
        <tr className={subtotalRowClass}>
          <td
            colSpan={3}
            className={
              variant === "admin"
                ? "px-3 py-2.5 text-right text-sm font-black text-palm dark:text-emerald-300"
                : "py-2.5 pr-2 text-right text-sm font-black text-palm"
            }
          >
            Custom labels subtotal
          </td>
          <td className={lineCellClass}>{formatPriceUsd(subtotalCents)}</td>
        </tr>
      ) : null}
    </>
  );
}
