export type LabelFinishOptionRow = {
  id: string;
  name: string;
  groupName: string;
  active: boolean;
  sortOrder: number;
};

export type TemplateFinishOptionRow = {
  finishOptionId: string;
  name: string;
  groupName: string;
  enabled: boolean;
  priceDeltaCents: number;
};

export type BatchFinishGroupChoice = {
  groupName: string;
  finishOptionId: string;
  finishOptionName: string;
};

/** One choice per option group for the whole bag batch. */
export type BatchFinishSelection = {
  choices: BatchFinishGroupChoice[];
};

export function finishGroupKey(groupName: string): string {
  return groupName.trim() || "Other";
}

export function groupFinishOptionsByGroup<T extends { groupName: string; name: string }>(
  options: T[],
): { groupName: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const opt of options) {
    const g = finishGroupKey(opt.groupName);
    const list = map.get(g) ?? [];
    list.push(opt);
    map.set(g, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([groupName, items]) => ({
      groupName,
      items: [...items].sort((x, y) => x.name.localeCompare(y.name)),
    }));
}

/** Unique options across all templates in the bag (same global catalog). */
export function mergeFinishOptionsForBatch(
  finishOptionsByTemplateId: Record<string, TemplateFinishOptionRow[]>,
  templateIds: string[],
): TemplateFinishOptionRow[] {
  const byId = new Map<string, TemplateFinishOptionRow>();
  for (const tid of templateIds) {
    for (const o of finishOptionsByTemplateId[tid] ?? []) {
      if (!byId.has(o.finishOptionId)) {
        byId.set(o.finishOptionId, o);
      }
    }
  }
  return [...byId.values()].sort(
    (a, b) => a.groupName.localeCompare(b.groupName) || a.name.localeCompare(b.name),
  );
}

export function perLabelFinishCentsForTemplate(
  templateId: string,
  finishOptionsByTemplateId: Record<string, TemplateFinishOptionRow[]>,
  selection: BatchFinishSelection | undefined,
): number {
  const opts = finishOptionsByTemplateId[templateId] ?? [];
  let sum = 0;
  for (const choice of selection?.choices ?? []) {
    const row = opts.find((o) => o.finishOptionId === choice.finishOptionId);
    sum += Math.max(0, row?.priceDeltaCents ?? 0);
  }
  return sum;
}

export function batchFinishSurchargeCents(
  items: { templateId: string; quantity: number }[],
  finishOptionsByTemplateId: Record<string, TemplateFinishOptionRow[]>,
  selection: BatchFinishSelection | undefined,
): number {
  const qtyByTemplate = new Map<string, number>();
  for (const item of items) {
    const tid = item.templateId;
    const qty = Math.max(1, Math.floor(item.quantity || 1));
    qtyByTemplate.set(tid, (qtyByTemplate.get(tid) ?? 0) + qty);
  }
  let total = 0;
  for (const [templateId, qty] of qtyByTemplate) {
    total += perLabelFinishCentsForTemplate(templateId, finishOptionsByTemplateId, selection) * qty;
  }
  return total;
}

/** Line total if this option were selected for its group (entire batch). */
export function batchFinishLineTotalForOption(
  items: { templateId: string; quantity: number }[],
  finishOptionsByTemplateId: Record<string, TemplateFinishOptionRow[]>,
  currentSelection: BatchFinishSelection,
  groupName: string,
  finishOptionId: string,
): number {
  const key = finishGroupKey(groupName);
  const simulated: BatchFinishSelection = {
    choices: [
      ...currentSelection.choices.filter((c) => finishGroupKey(c.groupName) !== key),
      ...(() => {
        const row = mergeFinishOptionsForBatch(
          finishOptionsByTemplateId,
          [...new Set(items.map((i) => i.templateId))],
        ).find((o) => o.finishOptionId === finishOptionId);
        if (!row) return [];
        return [
          {
            groupName,
            finishOptionId: row.finishOptionId,
            finishOptionName: row.name,
          },
        ];
      })(),
    ],
  };
  return batchFinishSurchargeCents(items, finishOptionsByTemplateId, simulated);
}

export function defaultBatchFinishSelection(
  options: TemplateFinishOptionRow[],
): BatchFinishSelection {
  const groups = groupFinishOptionsByGroup(options);
  const choices: BatchFinishGroupChoice[] = [];
  for (const group of groups) {
    const pick = group.items.find((o) => o.priceDeltaCents === 0) ?? group.items[0];
    if (!pick) continue;
    choices.push({
      groupName: group.groupName,
      finishOptionId: pick.finishOptionId,
      finishOptionName: pick.name,
    });
  }
  return { choices };
}
