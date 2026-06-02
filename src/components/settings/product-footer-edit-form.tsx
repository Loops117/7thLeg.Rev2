"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { RichTextEditor } from "@/components/rich-text-editor";
import { updateAutomaticFooter } from "@/app/actions/product-footers-admin";

export function ProductFooterEditForm({
  footerId,
  initialTitle,
  initialHtml,
}: {
  footerId: string;
  initialTitle: string;
  initialHtml: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [title, setTitle] = useState(initialTitle);
  const [html, setHtml] = useState(initialHtml);

  function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    startTransition(async () => {
      try {
        await updateAutomaticFooter(footerId, { title, html });
        setMsg("Saved.");
        router.refresh();
      } catch (ex) {
        setErr(ex instanceof Error ? ex.message : "Could not save.");
      }
    });
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <label className="block text-sm font-bold text-ink">
        Title <span className="text-coral">*</span>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm"
        />
      </label>
      <RichTextEditor
        label="Content"
        value={html}
        onChange={setHtml}
        minHeightClassName="min-h-[12rem]"
        placeholder="Footer text for the product page."
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="border-2 border-black bg-black px-4 py-2 text-sm font-bold text-white hover:bg-neutral-900 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save footer"}
        </button>
        <Link href="/settings/products/footers" className="text-sm font-medium text-lagoon-dark underline">
          ← Back to footers
        </Link>
        {msg ? <span className="text-sm text-lagoon-dark">{msg}</span> : null}
        {err ? <span className="text-sm text-coral">{err}</span> : null}
      </div>
    </form>
  );
}
