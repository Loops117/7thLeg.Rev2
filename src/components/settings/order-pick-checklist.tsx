"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { adminUpdateOrderPickChecks } from "@/app/actions/orders-admin";

export type OrderPickLine = {
  key: string;
  label: string;
  quantity: number;
  kind: "product" | "label";
};

export function OrderPickChecklist({
  orderId,
  lines,
  initialChecks,
}: {
  orderId: string;
  lines: OrderPickLine[];
  initialChecks: Record<string, boolean>;
}) {
  const [checks, setChecks] = useState<Record<string, boolean>>(initialChecks);
  const [, startTransition] = useTransition();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setChecks(initialChecks);
  }, [initialChecks, orderId]);

  const persist = useCallback(
    (next: Record<string, boolean>) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        startTransition(() => {
          void adminUpdateOrderPickChecks(orderId, next);
        });
      }, 400);
    },
    [orderId],
  );

  const toggle = (key: string) => {
    setChecks((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      persist(next);
      return next;
    });
  };

  if (lines.length === 0) return null;

  const picked = lines.filter((l) => checks[l.key]).length;

  return (
    <div className="rounded border border-palm/25 bg-surf/30 p-3 dark:border-zinc-600 dark:bg-zinc-900/40">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-black uppercase tracking-wide text-palm dark:text-emerald-300">
          Pick checklist
        </h3>
        <span className="text-[11px] text-ink/55 dark:text-zinc-500">
          {picked} / {lines.length} picked · saved automatically
        </span>
      </div>
      <ul className="mt-2 space-y-1.5">
        {lines.map((line) => (
          <li key={line.key}>
            <label className="flex cursor-pointer items-start gap-2 rounded px-1 py-0.5 hover:bg-white/60 dark:hover:bg-zinc-800/60">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-palm"
                checked={!!checks[line.key]}
                onChange={() => toggle(line.key)}
              />
              <span className={`text-sm ${checks[line.key] ? "text-ink/45 line-through dark:text-zinc-500" : "text-ink dark:text-zinc-200"}`}>
                <span className="font-bold">{line.quantity}×</span> {line.label}
                <span className="ml-1 text-[10px] font-bold uppercase text-ink/40">
                  {line.kind === "label" ? "label" : "product"}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
