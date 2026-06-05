"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  adminDeleteCustomerSpeciesInsectType,
  adminUpsertCustomerSpeciesInsectType,
} from "@/app/actions/customer-species-insect-types-admin";
import { btnSecondaryMd } from "@/lib/btn-theme-classes";
import type { CustomerSpeciesInsectTypeAdminRow } from "@/lib/customer-species-insect-types";

export function SpeciesListInsectTypesEditor({
  initial,
}: {
  initial: CustomerSpeciesInsectTypeAdminRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState<CustomerSpeciesInsectTypeAdminRow | null>(null);
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [active, setActive] = useState(true);

  function resetForm() {
    setEditing(null);
    setName("");
    setSortOrder(0);
    setActive(true);
  }

  function startEdit(row: CustomerSpeciesInsectTypeAdminRow) {
    setEditing(row);
    setName(row.name);
    setSortOrder(row.sortOrder);
    setActive(row.active);
  }

  function save() {
    setMsg("");
    startTransition(async () => {
      const r = await adminUpsertCustomerSpeciesInsectType({
        id: editing?.id,
        name,
        sortOrder,
        active,
      });
      if (!r.ok) {
        setMsg(r.error);
        return;
      }
      resetForm();
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!window.confirm("Delete this insect type? Existing entries keep their stored value.")) return;
    startTransition(async () => {
      const r = await adminDeleteCustomerSpeciesInsectType(id);
      if (!r.ok) setMsg(r.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded border-2 border-palm/20 bg-white p-4 dark:border-zinc-600 dark:bg-zinc-900/50">
        <h2 className="text-sm font-black text-palm dark:text-emerald-300">
          {editing ? "Edit insect type" : "New insect type"}
        </h2>
        <p className="mt-1 text-xs text-ink/60 dark:text-zinc-400">
          These options populate the Type dropdown on customer species lists. Inactive types are hidden from customers.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-bold text-ink dark:text-zinc-200">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full border-2 border-palm/30 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              maxLength={120}
            />
          </label>
          <label className="block text-xs font-bold text-ink dark:text-zinc-200">
            Sort order
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              className="mt-1 w-full border-2 border-palm/30 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs font-bold text-ink dark:text-zinc-200">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Active (shown in customer dropdown)
        </label>
        <div className="mt-4 flex gap-2">
          <button type="button" disabled={pending} onClick={save} className={btnSecondaryMd}>
            {pending ? "Saving…" : editing ? "Update" : "Add type"}
          </button>
          {editing ? (
            <button
              type="button"
              className="rounded border px-4 py-2 text-sm font-bold dark:border-zinc-600"
              onClick={resetForm}
            >
              Cancel
            </button>
          ) : null}
        </div>
        {msg ? <p className="mt-2 text-xs font-bold text-coral">{msg}</p> : null}
      </div>

      <div className="overflow-x-auto rounded border border-palm/25 dark:border-zinc-600">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-palm/20 bg-palm/5 dark:border-zinc-700 dark:bg-zinc-900/80">
              <th className="px-3 py-2 font-black text-palm dark:text-emerald-300">Name</th>
              <th className="px-3 py-2 font-black text-palm dark:text-emerald-300">Order</th>
              <th className="px-3 py-2 font-black text-palm dark:text-emerald-300">Status</th>
              <th className="px-3 py-2 font-black text-palm dark:text-emerald-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {initial.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-ink/60 dark:text-zinc-400">
                  No insect types yet — add one above.
                </td>
              </tr>
            ) : (
              initial.map((row) => (
                <tr key={row.id} className="border-b border-palm/10 dark:border-zinc-800">
                  <td className="px-3 py-2 font-bold">{row.name}</td>
                  <td className="px-3 py-2 tabular-nums">{row.sortOrder}</td>
                  <td className="px-3 py-2">{row.active ? "Active" : "Inactive"}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="text-xs font-bold text-lagoon-dark underline dark:text-emerald-300"
                        onClick={() => startEdit(row)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-xs font-bold text-coral underline"
                        onClick={() => remove(row.id)}
                        disabled={pending}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
