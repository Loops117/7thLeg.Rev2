"use client";

import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LabelDesignPreview } from "@/components/labels/label-design-preview";
import { bagItemDisplayName } from "@/lib/label-bag-stats";
import { LABEL_REMOVAL_MESSAGES, confirmLabelRemoval } from "@/lib/label-editor/confirm-removal";
import type { LabelBagItem } from "@/lib/label-editor/label-bag";
import type { LabelBuilderPublicConfig } from "@/lib/label-builder-public";
import type { LabelTemplatePickerOption } from "@/lib/label-editor/template-meta";
import { btnImportantSm, btnSecondarySm } from "@/lib/btn-theme-classes";

/** Approximate chips that fit one row before offering expand. */
const CHIPS_PER_ROW = 7;
const TOOLTIP_WIDTH_PX = 144;
const TOOLTIP_GAP_PX = 8;

export function LabelBagStrip({
  items,
  templates,
  publicConfig,
  onRemoveFromBag,
  onEmptyBag,
}: {
  items: LabelBagItem[];
  templates: LabelTemplatePickerOption[];
  publicConfig: LabelBuilderPublicConfig;
  onRemoveFromBag: (id: string) => void;
  onEmptyBag?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const canExpand = items.length > CHIPS_PER_ROW;

  const sorted = useMemo(
    () => [...items].sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0)),
    [items],
  );

  return (
    <section
      className="overflow-visible rounded-lg border-2 border-palm/35 bg-surf/80 p-2 dark:border-emerald-700/50 dark:bg-zinc-900/60"
      aria-label="Your bag"
    >
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-wide text-palm dark:text-emerald-300">
          Bag ({items.length})
        </p>
        <div className="flex items-center gap-1.5">
          {items.length > 0 && onEmptyBag ? (
            <button
              type="button"
              className={btnImportantSm}
              onClick={onEmptyBag}
            >
              Clear bag
            </button>
          ) : null}
          {canExpand ? (
            <button
              type="button"
              className={`flex items-center gap-0.5 ${btnSecondarySm}`}
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
            >
              {expanded ? (
                <>
                  <span aria-hidden>▲</span> Collapse
                </>
              ) : (
                <>
                  <span aria-hidden>▼</span> Show all
                </>
              )}
            </button>
          ) : null}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="py-2 text-center text-[11px] text-ink/50">
          No labels in your bag. Select saved labels below and use Actions → Send to bag.
        </p>
      ) : (
        <div
          className={
            expanded
              ? "flex max-h-40 flex-wrap gap-1.5 overflow-x-hidden overflow-y-auto"
              : "flex h-14 flex-nowrap gap-1.5 overflow-x-auto overflow-y-visible"
          }
        >
          {sorted.map((item) => (
            <BagChip
              key={item.id}
              item={item}
              template={templates.find((t) => t.id === item.templateId) ?? templates[0]!}
              publicConfig={publicConfig}
              onRemoveFromBag={onRemoveFromBag}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function BagChip({
  item,
  template,
  publicConfig,
  onRemoveFromBag,
}: {
  item: LabelBagItem;
  template: LabelTemplatePickerOption;
  publicConfig: LabelBuilderPublicConfig;
  onRemoveFromBag: (id: string) => void;
}) {
  const name = bagItemDisplayName(item);
  const chipRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties | null>(null);

  const showTooltip = () => {
    const el = chipRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const belowTop = rect.bottom + TOOLTIP_GAP_PX;
    const estimatedHeight = 160;
    const placeAbove = belowTop + estimatedHeight > window.innerHeight - 8;
    const top = placeAbove ? rect.top - TOOLTIP_GAP_PX : belowTop;
    const transform = placeAbove
      ? "translate(-50%, -100%)"
      : "translate(-50%, 0)";
    let left = centerX;
    const half = TOOLTIP_WIDTH_PX / 2;
    if (left - half < 8) left = half + 8;
    if (left + half > window.innerWidth - 8) left = window.innerWidth - half - 8;

    setTooltipStyle({
      position: "fixed",
      top,
      left,
      transform,
      zIndex: 9999,
      width: TOOLTIP_WIDTH_PX,
    });
    setHover(true);
  };

  const hideTooltip = () => {
    setHover(false);
    setTooltipStyle(null);
  };

  return (
    <>
      <div
        ref={chipRef}
        className="relative shrink-0"
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
      >
        <div
          className="relative h-12 w-12 overflow-hidden rounded border border-palm/40 bg-white shadow-sm dark:border-zinc-600 dark:bg-zinc-900"
          title={name}
        >
          <LabelDesignPreview
            template={template}
            doc={item.document}
            publicConfig={publicConfig}
            maxWidthPx={44}
            showWatermark={false}
          />
          <span className="absolute bottom-0 right-0 min-w-[1.1rem] rounded-tl bg-palm px-1 text-center text-[9px] font-black leading-tight text-white">
            {item.quantity}
          </span>
          <button
            type="button"
            className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-coral text-[10px] font-black leading-none text-white opacity-90 hover:opacity-100"
            aria-label={`Remove ${name} from bag`}
            onClick={() => {
              if (!confirmLabelRemoval(LABEL_REMOVAL_MESSAGES.removeFromBag)) return;
              onRemoveFromBag(item.id);
            }}
          >
            ×
          </button>
        </div>
      </div>

      {hover && tooltipStyle && typeof document !== "undefined"
        ? createPortal(
            <div
              role="tooltip"
              style={tooltipStyle}
              className="pointer-events-none rounded-lg border border-palm/25 bg-white p-2 shadow-xl dark:border-zinc-600 dark:bg-zinc-900"
            >
              <div className="mx-auto flex justify-center">
                <LabelDesignPreview
                  template={template}
                  doc={item.document}
                  publicConfig={publicConfig}
                  maxWidthPx={100}
                  showWatermark={false}
                />
              </div>
              <p className="mt-1 line-clamp-3 text-center text-[10px] font-bold leading-tight text-ink">{name}</p>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
