"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { RichTextEditor } from "@/components/rich-text-editor";
import { createAutomaticFooter, deleteAutomaticFooter } from "@/app/actions/product-footers-admin";

export type FooterRow = { id: string; title: string };

export function ProductFootersAdmin({ initialFooters }: { initialFooters: FooterRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [html, setHtml] = useState("");

  function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    startTransition(async () => {
      try {
        await createAutomaticFooter({ title, html });
        setTitle("");
        setHtml("");
        router.refresh();
      } catch (ex) {
        setErr(ex instanceof Error ? ex.message : "Could not create.");
      }
    });
  }

  function remove(id: string, label: string) {
    if (!window.confirm(`Delete footer “${label}”? It will be removed from types and products that use it.`)) return;
    startTransition(async () => {
      try {
        await deleteAutomaticFooter(id);
        router.refresh();
      } catch {
        setErr("Could not delete.");
      }
    });
  }

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-3 text-lg font-black text-palm">Automatic footers</h2>
        <p className="mb-4 text-sm text-ink/70">
          Reusable HTML blocks. Assign them to <strong>product types</strong> as defaults, or attach extras on each
          product. They render at the bottom of the public product page.
        </p>
        {initialFooters.length === 0 ? (
          <p className="text-ink/70">No footers yet. Create one below.</p>
        ) : (
          <ul className="space-y-2 rounded border-2 border-palm bg-white p-3 dark:border-zinc-600 dark:bg-zinc-900/55">
            {initialFooters.map((f) => (
              <li
                key={f.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-palm/10 py-2 last:border-0"
              >
                <span className="font-medium text-ink">{f.title}</span>
                <div className="flex gap-3">
                  <Link href={`/settings/products/footers/${f.id}/edit`} className="text-sm font-bold text-palm underline">
                    Edit
                  </Link>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => remove(f.id, f.title)}
                    className="text-sm font-bold text-coral hover:underline disabled:opacity-40"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded border-2 border-palm bg-white p-4 shadow-sm dark:border-zinc-600 dark:bg-zinc-900/55 sm:p-6">
        <h2 className="text-lg font-black text-palm">Add footer</h2>
        <form onSubmit={create} className="mt-4 space-y-4">
          <label className="block text-sm font-bold text-ink">
            Title <span className="text-coral">*</span>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm"
              placeholder="Care sheet"
            />
          </label>
          <RichTextEditor
            label="Content"
            value={html}
            onChange={setHtml}
            minHeightClassName="min-h-[10rem]"
          />
          <button
            type="submit"
            disabled={pending}
            className="border-2 border-black bg-black px-4 py-2 text-sm font-bold text-white hover:bg-neutral-900 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Create footer"}
          </button>
          {err ? <p className="text-sm text-coral">{err}</p> : null}
        </form>
      </section>
    </div>
  );
}
