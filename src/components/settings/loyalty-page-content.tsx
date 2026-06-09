"use client";

import { adminFieldsetClass } from "@/lib/admin-surface-classes";
import { adminTableRowClass } from "@/lib/admin-table-classes";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adjustCustomerLoyaltyPoints, listPointsLedgerForCustomer, type PointsLedgerRow } from "@/app/actions/loyalty-admin";
import { updateLoyaltyProgramSettings } from "@/app/actions/site-config-admin";
import { formatCustomerFullName } from "@/lib/customer-display-name";
import type { LoyaltyProgramState } from "@/lib/site-config-types";

export type LoyaltyMemberRow = {
  id: string;
  email: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  pointsBalance: number;
  createdAt: string;
};

export function LoyaltyPageContent({
  initialProgram,
  members,
}: {
  initialProgram: LoyaltyProgramState;
  members: LoyaltyMemberRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [program, setProgram] = useState(initialProgram);
  const [rows, setRows] = useState(members);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [ledgerById, setLedgerById] = useState<Record<string, PointsLedgerRow[] | "loading" | "err">>({});
  const [adjustId, setAdjustId] = useState<string | null>(null);
  const [deltaInput, setDeltaInput] = useState("");
  const [reasonInput, setReasonInput] = useState("");

  function saveProgram() {
    setMsg(null);
    startTransition(async () => {
      try {
        await updateLoyaltyProgramSettings(program);
        setMsg("Loyalty program settings saved.");
        router.refresh();
      } catch {
        setMsg("Could not save.");
      }
    });
  }

  function loadLedger(id: string) {
    if (ledgerById[id] && ledgerById[id] !== "loading" && ledgerById[id] !== "err") return;
    setLedgerById((m) => ({ ...m, [id]: "loading" }));
    startTransition(async () => {
      const r = await listPointsLedgerForCustomer(id, 80);
      if ("error" in r) {
        setLedgerById((m) => ({ ...m, [id]: "err" }));
        return;
      }
      setLedgerById((m) => ({ ...m, [id]: r }));
    });
  }

  function toggleRow(id: string) {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    loadLedger(id);
  }

  function applyAdjust(id: string) {
    const delta = Math.trunc(Number(deltaInput));
    if (delta === 0 || Number.isNaN(delta)) {
      setMsg("Enter a non-zero number for the point change.");
      return;
    }
    setMsg(null);
    startTransition(async () => {
      const r = await adjustCustomerLoyaltyPoints(id, delta, reasonInput);
      if (!r.ok) {
        setMsg(r.error);
        return;
      }
      setRows((prev) => prev.map((c) => (c.id === id ? { ...c, pointsBalance: r.newBalance } : c)));
      setLedgerById((m) => {
        const next = { ...m };
        delete next[id];
        return next;
      });
      if (expanded === id) loadLedger(id);
      setAdjustId(null);
      setDeltaInput("");
      setReasonInput("");
      setMsg("Points updated.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <fieldset className={`${adminFieldsetClass} border-2 p-4`}>
        <legend className="text-sm font-bold text-palm">Program</legend>
        <p className="mb-3 text-xs text-ink/65">These values are stored in the site config and used at checkout when points accrual is wired in.</p>
        <label className="flex items-center gap-2 text-sm font-bold text-ink">
          <input
            type="checkbox"
            checked={program.loyaltyEnabled}
            onChange={(e) => setProgram((p) => ({ ...p, loyaltyEnabled: e.target.checked }))}
          />
          Enable loyalty program
        </label>
        <label className="mt-3 flex items-center gap-2 text-sm font-bold text-ink">
          <input
            type="checkbox"
            checked={program.guestCheckoutEnabled}
            onChange={(e) => setProgram((p) => ({ ...p, guestCheckoutEnabled: e.target.checked }))}
          />
          Allow guest checkout (products only — labels still require sign-in)
        </label>
        <label className="mt-3 block text-sm font-bold text-ink">
          Points per $1.00 (eligible orders, whole points)
          <input
            type="number"
            min={0}
            max={1000}
            value={program.pointsPerDollar}
            onChange={(e) => setProgram((p) => ({ ...p, pointsPerDollar: Number(e.target.value) }))}
            className="mt-1 w-28 border-2 border-palm-mid px-2 py-2 text-sm"
          />
        </label>
        <label className="mt-3 block text-sm font-bold text-ink">
          Point value at checkout (cents per point)
          <input
            type="number"
            min={0}
            max={10000}
            value={program.loyaltyRedemptionCentsPerPoint}
            onChange={(e) =>
              setProgram((p) => ({ ...p, loyaltyRedemptionCentsPerPoint: Number(e.target.value) }))
            }
            className="mt-1 w-28 border-2 border-palm-mid px-2 py-2 text-sm"
          />
          <span className="mt-1 block text-xs font-normal text-ink/65">
            Example: <strong>10</strong> = each point takes <strong>$0.10</strong> off the merchandise subtotal (10 points = $1.00 off). Set
            to <strong>0</strong> to hide redemption on the cart.
          </span>
        </label>
        <div className="mt-4">
          <button
            type="button"
            disabled={pending}
            onClick={saveProgram}
            className="border-2 border-black bg-black px-4 py-2 text-sm font-bold text-white hover:bg-neutral-900 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save program settings"}
          </button>
          {msg ? <span className="ms-3 text-sm text-lagoon-dark">{msg}</span> : null}
        </div>
      </fieldset>

      <div>
        <h2 className="border-b-2 border-palm/20 pb-2 text-lg font-black text-palm">Members &amp; points</h2>
        <p className="mt-2 text-sm text-ink/80">
          All storefront accounts. Expand a row for point history. Use <strong>Adjust</strong> to add or remove points (balance never goes below zero).
        </p>

        <div className="mt-4 overflow-x-auto rounded border-2 border-palm">
          <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-palm bg-surf/50 font-bold text-palm">
                <th className="px-3 py-2"> </th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Points</th>
                <th className="px-3 py-2">Joined</th>
                <th className="px-3 py-2">Adjust</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-ink/60">
                    No customers yet.
                  </td>
                </tr>
              ) : (
                rows.map((c) => (
                  <MemberBlock
                    key={c.id}
                    c={c}
                    expanded={expanded === c.id}
                    adjustOpen={adjustId === c.id}
                    onToggle={() => toggleRow(c.id)}
                    onOpenAdjust={() => {
                      setAdjustId(c.id);
                      setDeltaInput("");
                      setReasonInput("");
                    }}
                    onCloseAdjust={() => setAdjustId(null)}
                    deltaInput={deltaInput}
                    setDeltaInput={setDeltaInput}
                    reasonInput={reasonInput}
                    setReasonInput={setReasonInput}
                    onApplyAdjust={() => applyAdjust(c.id)}
                    pending={pending}
                    ledger={ledgerById[c.id]}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MemberBlock({
  c,
  expanded,
  adjustOpen,
  onToggle,
  onOpenAdjust,
  onCloseAdjust,
  deltaInput,
  setDeltaInput,
  reasonInput,
  setReasonInput,
  onApplyAdjust,
  pending,
  ledger,
}: {
  c: LoyaltyMemberRow;
  expanded: boolean;
  adjustOpen: boolean;
  onToggle: () => void;
  onOpenAdjust: () => void;
  onCloseAdjust: () => void;
  deltaInput: string;
  setDeltaInput: (v: string) => void;
  reasonInput: string;
  setReasonInput: (v: string) => void;
  onApplyAdjust: () => void;
  pending: boolean;
  ledger: PointsLedgerRow[] | "loading" | "err" | undefined;
}) {
  return (
    <>
      <tr className={adminTableRowClass}>
        <td className="px-2 py-2">
          <button
            type="button"
            className="rounded border border-palm/40 px-2 py-1 text-xs font-bold text-palm hover:bg-surf"
            onClick={onToggle}
          >
            {expanded ? "Hide" : "View"}
          </button>
        </td>
        <td className="px-3 py-2 font-mono text-xs break-all text-ink">{c.email}</td>
        <td className="px-3 py-2 text-ink">{formatCustomerFullName(c) || "—"}</td>
        <td className="px-3 py-2 font-bold text-palm">{c.pointsBalance}</td>
        <td className="whitespace-nowrap px-3 py-2 text-ink/75">{c.createdAt}</td>
        <td className="px-3 py-2">
          {adjustOpen ? (
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:flex-wrap">
              <input
                type="number"
                className="w-24 border border-palm-mid px-1 py-1 text-xs"
                placeholder="Δ"
                value={deltaInput}
                onChange={(e) => setDeltaInput(e.target.value)}
              />
              <input
                type="text"
                className="min-w-[8rem] flex-1 border border-palm-mid px-1 py-1 text-xs"
                placeholder="Reason"
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
              />
              <button
                type="button"
                disabled={pending}
                onClick={onApplyAdjust}
                className="text-xs font-bold text-palm underline disabled:opacity-50"
              >
                Apply
              </button>
              <button type="button" onClick={onCloseAdjust} className="text-xs text-ink/60">
                Cancel
              </button>
            </div>
          ) : (
            <button type="button" onClick={onOpenAdjust} className="text-xs font-bold text-lagoon-dark underline">
              Adjust
            </button>
          )}
        </td>
      </tr>
      {expanded ? (
        <tr className="bg-surf/40">
          <td colSpan={6} className="px-4 py-3 text-sm">
            <p className="text-xs font-bold text-palm">Point history (latest first)</p>
            {ledger === "loading" ? <p className="mt-2 text-xs text-ink/60">Loading…</p> : null}
            {ledger === "err" ? <p className="mt-2 text-xs text-coral">Could not load history.</p> : null}
            {Array.isArray(ledger) && ledger.length === 0 ? (
              <p className="mt-2 text-xs text-ink/55">No ledger entries yet.</p>
            ) : null}
            {Array.isArray(ledger) && ledger.length > 0 ? (
              <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto font-mono text-xs text-ink/85">
                {ledger.map((l) => (
                  <li key={l.id}>
                    {l.createdAt.slice(0, 10)} — {l.delta > 0 ? `+${l.delta}` : l.delta} — {l.reason}
                    {l.orderId ? ` (order)` : ""}
                  </li>
                ))}
              </ul>
            ) : null}
          </td>
        </tr>
      ) : null}
    </>
  );
}
