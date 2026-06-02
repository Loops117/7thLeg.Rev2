"use client";

import type { LabelDataSheet } from "@/lib/label-editor/document";

export function DataColumnMapper({
  label,
  value,
  headers,
  onChange,
  disabled,
}: {
  label: string;
  value: number | null;
  headers: LabelDataSheet["headers"];
  onChange: (col: number | null) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block font-bold text-ink/55">
      {label}
      <select
        disabled={disabled}
        value={value === null ? "" : String(value)}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "" ? null : Number(v));
        }}
        className="mt-1 w-full border px-2 py-1 text-xs dark:bg-zinc-950"
      >
        <option value="">Static text (no data column)</option>
        {headers.map((h, i) => (
          <option key={i} value={i}>
            {h?.trim() ? h : `Column ${i + 1}`}
          </option>
        ))}
      </select>
    </label>
  );
}
