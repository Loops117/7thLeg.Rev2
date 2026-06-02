import type { ReportBucket, ReportDateRange } from "@/lib/reports/date-range";

export type TimeBucket = {
  key: string;
  label: string;
  start: Date;
  end: Date;
};

function startOfUtcWeek(d: Date): Date {
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff));
}

export function buildTimeBuckets(range: ReportDateRange): TimeBucket[] {
  const buckets: TimeBucket[] = [];
  const { from, to, bucket } = range;

  if (bucket === "day") {
    let cur = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
    const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
    while (cur <= end) {
      const start = new Date(cur);
      const endDay = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth(), cur.getUTCDate(), 23, 59, 59, 999));
      const key = start.toISOString().slice(0, 10);
      buckets.push({
        key,
        label: start.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
        start,
        end: endDay > to ? to : endDay,
      });
      cur = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth(), cur.getUTCDate() + 1));
    }
    return buckets;
  }

  let cur = startOfUtcWeek(from);
  const lastWeek = startOfUtcWeek(to);
  while (cur <= lastWeek) {
    const start = new Date(cur);
    const weekEnd = new Date(
      Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth(), cur.getUTCDate() + 6, 23, 59, 59, 999),
    );
    const key = start.toISOString().slice(0, 10);
    buckets.push({
      key,
      label: `Week of ${start.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`,
      start,
      end: weekEnd > to ? to : weekEnd,
    });
    cur = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth(), cur.getUTCDate() + 7));
  }
  return buckets;
}

export function bucketIndexForDate(buckets: TimeBucket[], at: Date): number {
  const t = at.getTime();
  for (let i = 0; i < buckets.length; i++) {
    if (t >= buckets[i]!.start.getTime() && t <= buckets[i]!.end.getTime()) return i;
  }
  return -1;
}

export function emptySeries(buckets: TimeBucket[]): number[] {
  return buckets.map(() => 0);
}

export function fillSeriesFromDates(
  buckets: TimeBucket[],
  rows: { at: Date; value?: number }[],
  valuePerRow = 1,
): number[] {
  const series = emptySeries(buckets);
  for (const row of rows) {
    const i = bucketIndexForDate(buckets, row.at);
    if (i >= 0) series[i]! += row.value ?? valuePerRow;
  }
  return series;
}
