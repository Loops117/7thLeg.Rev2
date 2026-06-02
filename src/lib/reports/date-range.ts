export type ReportPreset =
  | "last7"
  | "last30"
  | "last90"
  | "ytd"
  | "last12m"
  | "all"
  | "custom";

export type ReportBucket = "day" | "week";

export type ReportDateRange = {
  preset: ReportPreset;
  from: Date;
  to: Date;
  bucket: ReportBucket;
  label: string;
};

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function endOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

const PRESET_LABELS: Record<ReportPreset, string> = {
  last7: "Last 7 days",
  last30: "Last 30 days",
  last90: "Last 90 days",
  ytd: "Year to date",
  last12m: "Last 12 months",
  all: "All time",
  custom: "Custom range",
};

function isPreset(v: string): v is ReportPreset {
  return v in PRESET_LABELS;
}

export function parseReportDateRange(search: {
  preset?: string;
  from?: string;
  to?: string;
  bucket?: string;
}): ReportDateRange {
  const now = new Date();
  const to = endOfUtcDay(now);

  if (search.preset === "custom" && search.from && search.to) {
    const f = new Date(search.from);
    const t = new Date(search.to);
    if (!Number.isNaN(f.getTime()) && !Number.isNaN(t.getTime())) {
      const from = startOfUtcDay(f);
      const toCustom = endOfUtcDay(t);
      const bucket: ReportBucket = search.bucket === "week" ? "week" : "day";
      return {
        preset: "custom",
        from,
        to: toCustom > from ? toCustom : endOfUtcDay(from),
        bucket,
        label: `${formatShort(from)} – ${formatShort(toCustom)}`,
      };
    }
  }

  const preset: ReportPreset = search.preset && isPreset(search.preset) ? search.preset : "last30";
  let from: Date;

  switch (preset) {
    case "last7":
      from = startOfUtcDay(new Date(to.getTime() - 6 * 86400000));
      break;
    case "last90":
      from = startOfUtcDay(new Date(to.getTime() - 89 * 86400000));
      break;
    case "ytd":
      from = startOfUtcDay(new Date(Date.UTC(to.getUTCFullYear(), 0, 1)));
      break;
    case "last12m":
      from = startOfUtcDay(new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth() - 11, 1)));
      break;
    case "all":
      from = startOfUtcDay(new Date(Date.UTC(2020, 0, 1)));
      break;
    case "last30":
    default:
      from = startOfUtcDay(new Date(to.getTime() - 29 * 86400000));
      break;
  }

  const days = Math.ceil((to.getTime() - from.getTime()) / 86400000);
  const bucket: ReportBucket =
    search.bucket === "day" ? "day" : search.bucket === "week" ? "week" : days > 90 ? "week" : "day";

  return { preset, from, to, bucket, label: PRESET_LABELS[preset] };
}

function formatShort(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export function reportRangeToSearchParams(range: ReportDateRange): URLSearchParams {
  const p = new URLSearchParams();
  p.set("preset", range.preset);
  p.set("bucket", range.bucket);
  if (range.preset === "custom") {
    p.set("from", range.from.toISOString().slice(0, 10));
    p.set("to", range.to.toISOString().slice(0, 10));
  }
  return p;
}
