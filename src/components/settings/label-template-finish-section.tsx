"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useTransition,
} from "react";
import {
  listTemplateFinishLinksAdmin,
  type LabelFinishOptionAdminRow,
  type TemplateFinishLinkInput,
} from "@/app/actions/label-finish-admin";
import { groupFinishOptionsByGroup } from "@/lib/label-finish-options";

type PriceState = {
  finishOptionId: string;
  priceDeltaCents: string;
};

export type LabelTemplateFinishSectionHandle = {
  validateAndGetLinks: () => string | null | TemplateFinishLinkInput[];
};

export const LabelTemplateFinishSection = forwardRef<
  LabelTemplateFinishSectionHandle,
  {
    templateId: string;
    globalOptions: LabelFinishOptionAdminRow[];
  }
>(function LabelTemplateFinishSection({ templateId, globalOptions }, ref) {
  const [prices, setPrices] = useState<PriceState[]>([]);
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const existing = await listTemplateFinishLinksAdmin(templateId);
      const byId = new Map(existing.map((e) => [e.finishOptionId, e]));
      setPrices(
        globalOptions.map((g) => {
          const ex = byId.get(g.id);
          return {
            finishOptionId: g.id,
            priceDeltaCents:
              ex?.priceDeltaCents != null ? (ex.priceDeltaCents / 100).toFixed(2) : "0.00",
          };
        }),
      );
    });
  }, [templateId, globalOptions]);

  useImperativeHandle(ref, () => ({
    validateAndGetLinks: () => {
      const out: TemplateFinishLinkInput[] = [];
      for (const row of prices) {
        const g = globalOptions.find((x) => x.id === row.finishOptionId);
        if (!g?.active) continue;
        const n = Number.parseFloat(row.priceDeltaCents.replace(/,/g, ""));
        if (!Number.isFinite(n) || n < 0) {
          return `“${g.name}”: enter a valid price increase (0 or more).`;
        }
        out.push({
          finishOptionId: row.finishOptionId,
          priceDeltaCents: Math.round(n * 100),
        });
      }
      return out;
    },
  }));

  if (!globalOptions.length) {
    return (
      <div className="space-y-2 border-t border-palm/15 pt-4 dark:border-zinc-700">
        <h3 className="text-xs font-black uppercase text-palm dark:text-emerald-300">Options</h3>
        <p className="text-xs text-ink/60">
          Add global options under{" "}
          <a href="/settings/labels/options" className="font-bold underline">
            Options
          </a>{" "}
          first, then set per-label price increases here.
        </p>
      </div>
    );
  }

  const sorted = [...globalOptions].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  const groups = groupFinishOptionsByGroup(sorted);

  return (
    <div className="space-y-3 border-t border-palm/15 pt-4 dark:border-zinc-700">
      <h3 className="text-xs font-black uppercase text-palm dark:text-emerald-300">Options</h3>
      <p className="text-xs text-ink/60">
        Price increase per label for each global option. $0.00 options still appear at checkout (e.g. standard glossy).
        Customers pick one option per group when adding their bag to the cart.
      </p>
      {groups.map((group) => (
        <div key={group.groupName}>
          <p className="text-[10px] font-black uppercase text-palm/70 dark:text-emerald-300/80">
            {group.groupName}
          </p>
          <ul className="mt-2 space-y-2">
            {group.items.map((item) => {
              const g = sorted.find((x) => x.name === item.name && x.groupName === item.groupName);
              if (!g) return null;
              const idx = prices.findIndex((p) => p.finishOptionId === g.id);
              const row = prices[idx];
              if (!row) return null;
              const globallyOff = !g.active;
              return (
                <li
                  key={g.id}
                  className={`flex flex-wrap items-center gap-3 rounded border border-palm/15 p-2 text-xs dark:border-zinc-600 ${
                    globallyOff ? "opacity-50" : ""
                  }`}
                >
                  <span className="min-w-[8rem] font-bold">
                    {g.name}
                    {globallyOff ? (
                      <span className="ml-1 text-[10px] font-normal text-ink/50">(disabled globally)</span>
                    ) : null}
                  </span>
                  <label className="flex items-center gap-1.5 font-bold text-ink/70">
                    Price increase ($/label)
                    <input
                      value={row.priceDeltaCents}
                      disabled={globallyOff}
                      onChange={(e) => {
                        const next = [...prices];
                        next[idx] = { ...row, priceDeltaCents: e.target.value };
                        setPrices(next);
                      }}
                      className="w-20 border-2 border-palm/30 px-2 py-0.5 dark:border-zinc-600 dark:bg-zinc-950"
                    />
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <p className="text-[11px] text-ink/50">Saved with <strong>Save changes</strong> below.</p>
    </div>
  );
});
