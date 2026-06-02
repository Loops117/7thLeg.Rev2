"use client";

import { btnSecondaryMd } from "@/lib/btn-theme-classes";

import { useState, useTransition } from "react";
import {
  deleteLabelStickerAsset,
  type LabelStickerAssetRow,
  updateLabelStickerAsset,
  uploadLabelStickerAsset,
} from "@/app/actions/label-stickers-admin";

export function LabelStickersEditor({ initial }: { initial: LabelStickerAssetRow[] }) {
  const [rows, setRows] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink/70">
        Upload small images customers can place on labels in the editor (stickers panel). Only active stickers
        are shown on the storefront.
      </p>

      <form
        className="flex flex-wrap items-end gap-3 rounded border border-palm/20 bg-surf/40 p-3 dark:border-zinc-600"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(async () => {
            const r = await uploadLabelStickerAsset(fd);
            if (!r.ok) {
              setMsg(r.error);
              return;
            }
            setRows((prev) => [...prev, r.row].sort((a, b) => a.sortOrder - b.sortOrder));
            setMsg("Sticker uploaded.");
            e.currentTarget.reset();
          });
        }}
      >
        <label className="block text-xs font-bold text-ink/55">
          Name
          <input
            name="name"
            required
            className="mt-1 block border px-2 py-1 text-sm dark:bg-zinc-950"
            placeholder="Coral icon"
          />
        </label>
        <label className="block text-xs font-bold text-ink/55">
          Image
          <input
            name="file"
            type="file"
            accept="image/png,image/webp,image/jpeg,image/gif,image/avif"
            required
            className="mt-1 block text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className={btnSecondaryMd}
        >
          Upload sticker
        </button>
      </form>

      <div className="overflow-x-auto rounded border border-palm/20 dark:border-zinc-600">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-surf text-left text-xs font-black uppercase text-ink/50 dark:bg-zinc-800">
              <th className="px-2 py-2">Preview</th>
              <th className="px-2 py-2">Name</th>
              <th className="px-2 py-2">Order</th>
              <th className="px-2 py-2">Active</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-ink/50">
                  No stickers yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-palm/10 dark:border-zinc-700">
                  <td className="px-2 py-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={row.imageUrl} alt="" className="h-12 w-12 object-contain" />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      defaultValue={row.name}
                      className="w-full min-w-[8rem] border px-1 py-0.5 text-sm dark:bg-zinc-950"
                      onBlur={(e) => {
                        const name = e.target.value.trim();
                        if (name === row.name) return;
                        startTransition(async () => {
                          await updateLabelStickerAsset(row.id, { name });
                          setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, name } : r)));
                        });
                      }}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      defaultValue={row.sortOrder}
                      className="w-16 border px-1 py-0.5 text-sm dark:bg-zinc-950"
                      onBlur={(e) => {
                        const sortOrder = Number(e.target.value);
                        if (!Number.isFinite(sortOrder) || sortOrder === row.sortOrder) return;
                        startTransition(async () => {
                          await updateLabelStickerAsset(row.id, { sortOrder });
                          setRows((prev) =>
                            [...prev.map((r) => (r.id === row.id ? { ...r, sortOrder } : r))].sort(
                              (a, b) => a.sortOrder - b.sortOrder,
                            ),
                          );
                        });
                      }}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="checkbox"
                      checked={row.active}
                      onChange={(e) => {
                        const active = e.target.checked;
                        startTransition(async () => {
                          await updateLabelStickerAsset(row.id, { active });
                          setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, active } : r)));
                        });
                      }}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      className="text-xs font-bold text-coral underline"
                      onClick={() => {
                        if (!window.confirm(`Delete “${row.name}”?`)) return;
                        startTransition(async () => {
                          await deleteLabelStickerAsset(row.id);
                          setRows((prev) => prev.filter((r) => r.id !== row.id));
                        });
                      }}
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

      {msg ? <p className="text-xs text-ink/70">{msg}</p> : null}
    </div>
  );
}

