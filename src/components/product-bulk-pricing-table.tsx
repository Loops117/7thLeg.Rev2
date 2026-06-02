import type { ProductTierBreakdownRow } from "@/lib/product-price-tiers-storefront";

export function ProductBulkPricingTable({ rows }: { rows: ProductTierBreakdownRow[] }) {
  if (rows.length === 0) return null;

  return (
    <div className="mt-4 rounded border-2 border-palm/20 bg-white/60 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-palm-mid">Bulk pricing</p>
      <table className="mt-2 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-palm/15 text-xs font-bold text-ink/70">
            <th className="pb-1 pr-2">Min qty</th>
            <th className="pb-1">Unit price</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.minQty}
              className={row.active ? "font-bold text-palm" : "text-ink/80"}
            >
              <td className="py-1 pr-2">{row.minQty}+</td>
              <td className="py-1">{row.unitDisplay}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
