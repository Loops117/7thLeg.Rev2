"use client";

import {
  batchFinishLineTotalForOption,
  finishGroupKey,
  groupFinishOptionsByGroup,
  type BatchFinishGroupChoice,
  type BatchFinishSelection,
  type TemplateFinishOptionRow,
} from "@/lib/label-finish-options";
import { formatPriceUsd } from "@/lib/product-slug";

export type { BatchFinishSelection };

function choiceForGroup(selection: BatchFinishSelection, groupName: string): string | null {
  const key = finishGroupKey(groupName);
  return (
    selection.choices.find((c) => finishGroupKey(c.groupName) === key)?.finishOptionId ?? null
  );
}

export function LabelBatchFinishPicker({
  labelQty,
  options,
  selection,
  items,
  finishOptionsByTemplateId,
  onChange,
}: {
  labelQty: number;
  options: TemplateFinishOptionRow[];
  selection: BatchFinishSelection;
  items: { templateId: string; quantity: number }[];
  finishOptionsByTemplateId: Record<string, TemplateFinishOptionRow[]>;
  onChange: (next: BatchFinishSelection) => void;
}) {
  if (options.length === 0) return null;

  const groups = groupFinishOptionsByGroup(options);
  const qty = Math.max(1, labelQty);

  const setGroupChoice = (groupName: string, opt: TemplateFinishOptionRow) => {
    const key = finishGroupKey(groupName);
    const nextChoice: BatchFinishGroupChoice = {
      groupName,
      finishOptionId: opt.finishOptionId,
      finishOptionName: opt.name,
    };
    const rest = selection.choices.filter((c) => finishGroupKey(c.groupName) !== key);
    onChange({ choices: [...rest, nextChoice] });
  };

  return (
    <div className="rounded border border-palm/20 p-3 dark:border-zinc-600">
      <p className="text-[11px] text-ink/55">
        {qty} label{qty === 1 ? "" : "s"} in this batch · one choice per group
      </p>

      {groups.map((group) => (
        <div key={group.groupName} className="mt-3">
          <p className="text-[10px] font-black uppercase text-palm/70 dark:text-emerald-300/80">
            {group.groupName}
          </p>
          <ul className="mt-1 space-y-1.5">
            {group.items.map((opt) => {
              const lineTotalCents = batchFinishLineTotalForOption(
                items,
                finishOptionsByTemplateId,
                selection,
                group.groupName,
                opt.finishOptionId,
              );
              const selected = choiceForGroup(selection, group.groupName) === opt.finishOptionId;
              const perLabelHint =
                lineTotalCents > 0 && qty > 0
                  ? `${formatPriceUsd(Math.round(lineTotalCents / qty))}/label × ${qty}`
                  : null;
              return (
                <li key={opt.finishOptionId}>
                  <label
                    className={`flex cursor-pointer items-start justify-between gap-2 rounded border p-2 text-xs dark:border-zinc-600 ${
                      selected
                        ? "border-palm bg-palm/5 dark:border-emerald-600 dark:bg-emerald-950/30"
                        : "border-palm/15"
                    }`}
                  >
                    <span className="flex min-w-0 items-start gap-2">
                      <input
                        type="radio"
                        name={`batch-finish-${finishGroupKey(group.groupName)}`}
                        checked={selected}
                        onChange={() => setGroupChoice(group.groupName, opt)}
                        className="mt-0.5 shrink-0"
                      />
                      <span className="min-w-0 font-bold text-ink">{opt.name}</span>
                    </span>
                    <span className="shrink-0 text-right font-bold text-ink/70">
                      {lineTotalCents === 0 ? (
                        <span className="text-ink/50">$0.00</span>
                      ) : (
                        <span>
                          +{formatPriceUsd(lineTotalCents)}
                          {perLabelHint ? (
                            <span className="block text-[10px] font-normal text-ink/45">{perLabelHint}</span>
                          ) : null}
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
