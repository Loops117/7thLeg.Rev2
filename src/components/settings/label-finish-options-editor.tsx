"use client";

import { btnSecondaryMd } from "@/lib/btn-theme-classes";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  adminDeleteLabelFinishOption,
  adminUpsertLabelFinishOption,
  type LabelFinishOptionAdminRow,
} from "@/app/actions/label-finish-admin";

export function LabelFinishOptionsEditor({ initial }: { initial: LabelFinishOptionAdminRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState<LabelFinishOptionAdminRow | null>(null);
  const [name, setName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [active, setActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);

  const resetForm = () => {
    setEditing(null);
    setName("");
    setGroupName("");
    setActive(true);
    setSortOrder(0);
  };

  const startEdit = (row: LabelFinishOptionAdminRow) => {
    setEditing(row);
    setName(row.name);
    setGroupName(row.groupName);
    setActive(row.active);
    setSortOrder(row.sortOrder);
  };

  const save = () => {
    setMsg("");
    startTransition(async () => {
      const r = await adminUpsertLabelFinishOption({
        id: editing?.id,
        name,
        groupName,
        active,
        sortOrder,
      });
      if (!r.ok) {
        setMsg(r.error);
        return;
      }
      resetForm();
      router.refresh();
    });
  };

  const remove = (id: string) => {
    if (!window.confirm("Delete this option?")) return;
    startTransition(async () => {
      const r = await adminDeleteLabelFinishOption(id);
      if (!r.ok) setMsg(r.error);
      else router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded border-2 border-palm/20 bg-white p-4 dark:border-zinc-600 dark:bg-zinc-900/50">
        <h2 className="text-sm font-black text-palm dark:text-emerald-300">
          {editing ? "Edit option" : "New option"}
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-bold">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full border-2 border-palm/30 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
          </label>
          <label className="block text-xs font-bold">
            Group
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Material"
              className="mt-1 w-full border-2 border-palm/30 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
          </label>
          <label className="block text-xs font-bold">
            Sort order
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              className="mt-1 w-full border-2 border-palm/30 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
          </label>
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs font-bold">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Enabled (inactive options are hidden from template setup and customers)
        </label>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={save}
            className={btnSecondaryMd}
          >
            {pending ? "Saving…" : editing ? "Update" : "Add option"}
          </button>
          {editing ? (
            <button type="button" className="rounded border px-4 py-2 text-sm font-bold" onClick={resetForm}>
              Cancel
            </button>
          ) : null}
        </div>
        {msg ? <p className="mt-2 text-xs text-coral">{msg}</p> : null}
      </div>

      <div className="overflow-x-auto rounded border-2 border-palm/20 dark:border-zinc-600">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="bg-surf/80 text-xs font-black uppercase text-palm/80 dark:bg-zinc-800">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Group</th>
              <th className="px-3 py-2">Sort</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-palm/10">
            {initial.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-ink/50">
                  No options yet.
                </td>
              </tr>
            ) : (
              initial.map((row) => (
                <tr key={row.id} className="bg-white dark:bg-zinc-900/40">
                  <td className="px-3 py-2 font-bold">{row.name}</td>
                  <td className="px-3 py-2">{row.groupName || "—"}</td>
                  <td className="px-3 py-2">{row.sortOrder}</td>
                  <td className="px-3 py-2">{row.active ? "Enabled" : "Disabled"}</td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" className="text-xs font-bold text-palm underline" onClick={() => startEdit(row)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="ml-2 text-xs font-bold text-coral underline"
                      onClick={() => remove(row.id)}
                    >
                      Delete
                    </button>
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
