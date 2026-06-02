"use client";

import { useRouter } from "next/navigation";
import type { ReportBucket, ReportDateRange, ReportPreset } from "@/lib/reports/date-range";
import { reportRangeToSearchParams } from "@/lib/reports/date-range";
import { btnChip, btnChipActive } from "@/lib/btn-theme-classes";

const PRESETS: { id: ReportPreset; label: string }[] = [
  { id: "last7", label: "7 days" },
  { id: "last30", label: "30 days" },
  { id: "last90", label: "90 days" },
  { id: "ytd", label: "YTD" },
  { id: "last12m", label: "12 mo" },
  { id: "all", label: "All" },
];

type Props = {
  range: ReportDateRange;
};

export function ReportDateRangeBar({ range }: Props) {
  const router = useRouter();

  function apply(patch: Partial<ReportDateRange> & { customFrom?: string; customTo?: string }) {
    const next: ReportDateRange = {
      ...range,
      ...patch,
    };
    if (patch.customFrom && patch.customTo) {
      const p = new URLSearchParams();
      p.set("preset", "custom");
      p.set("from", patch.customFrom);
      p.set("to", patch.customTo);
      p.set("bucket", next.bucket);
      router.push(`/settings/reports?${p.toString()}`);
      return;
    }
    router.push(`/settings/reports?${reportRangeToSearchParams(next).toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded border border-palm/25 bg-surf/30 p-3 dark:border-zinc-600 dark:bg-zinc-900/40">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-ink/55 dark:text-zinc-500">Range</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => apply({ preset: p.id })}
              className={range.preset === p.id ? btnChipActive : btnChip}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <label className="text-xs font-bold text-ink dark:text-zinc-200">
        Custom from
        <input
          type="date"
          className="mt-0.5 block border border-palm-mid px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          defaultValue={range.preset === "custom" ? range.from.toISOString().slice(0, 10) : ""}
          onChange={(e) => {
            const from = e.target.value;
            const toInput = (e.target.form?.elements.namedItem("customTo") as HTMLInputElement | null)?.value;
            if (from && toInput) apply({ customFrom: from, customTo: toInput });
          }}
          name="customFrom"
        />
      </label>
      <label className="text-xs font-bold text-ink dark:text-zinc-200">
        to
        <input
          type="date"
          name="customTo"
          className="mt-0.5 block border border-palm-mid px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          defaultValue={range.preset === "custom" ? range.to.toISOString().slice(0, 10) : ""}
          onChange={(e) => {
            const to = e.target.value;
            const fromInput = (e.target.form?.elements.namedItem("customFrom") as HTMLInputElement | null)?.value;
            if (to && fromInput) apply({ customFrom: fromInput, customTo: to });
          }}
        />
      </label>

      <label className="text-xs font-bold text-ink dark:text-zinc-200">
        Group by
        <select
          value={range.bucket}
          onChange={(e) => apply({ bucket: e.target.value as ReportBucket })}
          className="mt-0.5 block border border-palm-mid bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-950"
        >
          <option value="week">Week</option>
          <option value="day">Day</option>
        </select>
      </label>

      <p className="ml-auto text-xs text-ink/65 dark:text-zinc-400">
        Showing: <strong className="text-ink dark:text-zinc-200">{range.label}</strong>
        {" · "}
        {range.bucket === "week" ? "Weekly" : "Daily"} buckets
      </p>
    </div>
  );
}
