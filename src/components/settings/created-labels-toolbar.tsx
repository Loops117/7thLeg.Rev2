"use client";

import { btnSecondaryMd, btnSecondarySm } from "@/lib/btn-theme-classes";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function CreatedLabelsToolbar({ initialQ }: { initialQ: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(initialQ);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    const trimmed = q.trim();
    if (trimmed) params.set("q", trimmed);
    else params.delete("q");
    router.push(`/settings/labels/created?${params.toString()}`);
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
      <label className="min-w-[12rem] flex-1 text-xs font-bold text-ink/55 dark:text-zinc-400">
        Search customer, label name, or template
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Email, name, template…"
          className="mt-1 w-full border-2 border-palm/30 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
        />
      </label>
      <button
        type="submit"
        className={btnSecondaryMd}
      >
        Search
      </button>
      {initialQ ? (
        <button
          type="button"
          className={btnSecondarySm}
          onClick={() => {
            setQ("");
            router.push("/settings/labels/created");
          }}
        >
          Clear
        </button>
      ) : null}
    </form>
  );
}
