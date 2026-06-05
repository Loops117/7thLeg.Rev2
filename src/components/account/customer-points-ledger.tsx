import Link from "next/link";
import { formatPointsDelta, formatPointsLedgerWhen, type CustomerPointsLedgerRow } from "@/lib/customer-points";

export function CustomerPointsLedger({
  balance,
  rows,
}: {
  balance: number;
  rows: CustomerPointsLedgerRow[];
}) {
  return (
    <div className="max-w-3xl">
      <dl className="account-panel">
        <dt className="account-panel__dt">Current balance</dt>
        <dd className="account-panel__stat">{balance}</dd>
      </dl>

      <h2 className="account-panel__heading mt-10">Point history</h2>
      <p className="account-panel__text mt-1">Every earn, spend, and adjustment on your account is listed here.</p>

      {rows.length === 0 ? (
        <p className="account-panel__text mt-6 text-sm">No point activity yet.</p>
      ) : (
        <div className="account-table-shell mt-4 min-w-0">
          <table className="min-w-[28rem]">
            <thead>
              <tr>
                <th>Date</th>
                <th>Change</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="whitespace-nowrap">{formatPointsLedgerWhen(row.createdAt)}</td>
                  <td className={`font-bold ${row.delta >= 0 ? "" : "text-coral"}`} style={row.delta >= 0 ? { color: "var(--product-card-title)" } : undefined}>
                    {formatPointsDelta(row.delta)}
                  </td>
                  <td>
                    {row.reason}
                    {row.orderId ? (
                      <span className="account-panel__muted mt-0.5 block text-xs">
                        Order{" "}
                        <Link href="/account/orders" className="font-medium underline" style={{ color: "var(--lagoon-dark)" }}>
                          {row.orderId.slice(0, 8)}
                        </Link>
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
