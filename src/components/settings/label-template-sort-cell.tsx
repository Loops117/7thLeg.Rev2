"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateLabelTemplateSortOrder } from "@/app/actions/label-templates-admin";

export function LabelTemplateSortCell({
  templateId,
  sortOrder,
}: {
  templateId: string;
  sortOrder: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(String(sortOrder));

  function save(next: number) {
    setValue(String(next));
    startTransition(async () => {
      const r = await updateLabelTemplateSortOrder(templateId, next);
      if (r.ok) router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        title="Customer dropdown order (lower appears first)"
        disabled={pending}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          const n = Number.parseInt(value, 10);
          if (Number.isFinite(n) && n !== sortOrder) save(n);
          else setValue(String(sortOrder));
        }}
        className="w-14 border border-palm/30 px-1 py-0.5 text-center text-xs dark:border-zinc-600 dark:bg-zinc-950"
      />
      <button
        type="button"
        disabled={pending}
        title="Move earlier in customer list"
        className="px-1 text-xs font-bold text-palm hover:bg-palm/10 disabled:opacity-40"
        onClick={() => save(sortOrder - 1)}
      >
        ↑
      </button>
      <button
        type="button"
        disabled={pending}
        title="Move later in customer list"
        className="px-1 text-xs font-bold text-palm hover:bg-palm/10 disabled:opacity-40"
        onClick={() => save(sortOrder + 1)}
      >
        ↓
      </button>
    </div>
  );
}
