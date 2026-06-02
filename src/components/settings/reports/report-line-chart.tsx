"use client";

import type { ReportLineSeries } from "@/lib/reports/queries";

type Props = {
  data: ReportLineSeries;
  height?: number;
  /** When true, left axis is dollars; otherwise integer counts. */
  dollarAxis?: boolean;
};

export function ReportLineChart({ data, height = 220, dollarAxis = false }: Props) {
  const { labels, series } = data;
  const n = labels.length;
  if (n === 0) {
    return <p className="py-8 text-center text-sm text-ink/60 dark:text-zinc-400">No data in this range.</p>;
  }

  const w = 720;
  const pad = { top: 16, right: 16, bottom: 44, left: 52 };
  const innerW = w - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const allY = series.flatMap((s) => s.values);
  const maxY = Math.max(1, ...allY);
  const minY = 0;

  const xAt = (i: number) => pad.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const yAt = (v: number) => pad.top + innerH - ((v - minY) / (maxY - minY)) * innerH;

  const yTicks = 4;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => minY + ((maxY - minY) * i) / yTicks);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${w} ${height}`}
        className="mx-auto block min-w-[min(100%,720px)] max-w-full"
        role="img"
        aria-label="Line chart"
      >
        {yTickValues.map((tv, i) => {
          const y = yAt(tv);
          return (
            <g key={i}>
              <line x1={pad.left} y1={y} x2={w - pad.right} y2={y} stroke="#2d6a4f22" strokeWidth={1} />
              <text
                x={pad.left - 6}
                y={y + 4}
                textAnchor="end"
                className="fill-ink/55 text-[10px] dark:fill-zinc-500"
              >
                {dollarAxis ? `$${tv.toFixed(maxY < 10 ? 1 : 0)}` : Math.round(tv)}
              </text>
            </g>
          );
        })}

        {series.map((s) => {
          const points = s.values.map((v, i) => `${xAt(i)},${yAt(v)}`).join(" ");
          return (
            <g key={s.id}>
              <polyline
                fill="none"
                stroke={s.color}
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                points={points}
              />
              {s.values.map((v, i) => (
                <circle key={i} cx={xAt(i)} cy={yAt(v)} r={3.5} fill={s.color} stroke="#fff" strokeWidth={1} />
              ))}
            </g>
          );
        })}

        {labels.map((label, i) => {
          if (n > 14 && i % 2 !== 0) return null;
          return (
            <text
              key={label + i}
              x={xAt(i)}
              y={height - 8}
              textAnchor="middle"
              className="fill-ink/65 text-[9px] dark:fill-zinc-400"
            >
              {label.length > 14 ? `${label.slice(0, 12)}…` : label}
            </text>
          );
        })}
      </svg>

      <ul className="mt-3 flex flex-wrap justify-center gap-4 text-xs font-bold text-ink/80 dark:text-zinc-300">
        {series.map((s) => (
          <li key={s.id} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            {s.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
