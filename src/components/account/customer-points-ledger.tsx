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
      <dl className="rounded border-2 border-palm/25 bg-white/90 p-6 shadow-sm">
        <dt className="text-xs font-bold uppercase tracking-wide text-palm-mid">Current balance</dt>
        <dd className="mt-1 text-3xl font-black text-palm">{balance}</dd>
      </dl>

      <h2 className="mt-10 text-lg font-black text-palm">Point history</h2>
      <p className="mt-1 text-sm text-ink/75">Every earn, spend, and adjustment on your account is listed here.</p>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-ink/60">No point activity yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded border-2 border-palm bg-white shadow-sm">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead>
              <tr className="border-b-2 border-palm bg-surf/50 font-bold text-palm">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Change</th>
                <th className="px-3 py-2">Description</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-palm/15">
                  <td className="whitespace-nowrap px-3 py-2 text-ink/80">{formatPointsLedgerWhen(row.createdAt)}</td>
                  <td
                    className={`px-3 py-2 font-bold ${row.delta >= 0 ? "text-palm" : "text-coral"}`}
                  >
                    {formatPointsDelta(row.delta)}
                  </td>
                  <td className="px-3 py-2 text-ink">
                    {row.reason}
                    {row.orderId ? (
                      <span className="mt-0.5 block text-xs text-ink/50">
                        Order{" "}
                        <Link href="/account/orders" className="font-medium text-lagoon-dark underline">
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
