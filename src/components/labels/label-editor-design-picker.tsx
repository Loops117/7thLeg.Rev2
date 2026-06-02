"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { listCustomerLabelDesignsForTemplate } from "@/app/actions/label-designs";
import type { SavedLabelDesignSummary } from "@/app/actions/label-designs";
import { useLabelEditor } from "@/components/labels/label-editor-context";
import { readLabelEditorDraftMeta } from "@/lib/label-editor/label-editor-draft";

const DRAFT_VALUE = "__browser_draft__";

function formatDraftTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

type MenuItem = {
  value: string;
  label: string;
  group: "current" | "browser" | "saved";
};

export function LabelEditorDesignPicker({ onMessage }: { onMessage?: (msg: string) => void }) {
  const {
    templateId,
    isLoggedInCustomer,
    savedDesignId,
    designName,
    loadSavedDesignIntoEditor,
    loadBrowserDraftIntoEditor,
  } = useLabelEditor();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [savedDesigns, setSavedDesigns] = useState<SavedLabelDesignSummary[]>([]);
  const [draftMeta, setDraftMeta] = useState<ReturnType<typeof readLabelEditorDraftMeta>>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const refreshList = useCallback(() => {
    setDraftMeta(readLabelEditorDraftMeta(templateId));
    if (!isLoggedInCustomer) {
      setSavedDesigns([]);
      return;
    }
    startTransition(async () => {
      try {
        setSavedDesigns(await listCustomerLabelDesignsForTemplate(templateId));
      } catch {
        setSavedDesigns([]);
      }
    });
  }, [templateId, isLoggedInCustomer]);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  useEffect(() => {
    refreshList();
  }, [savedDesignId, refreshList]);

  const showDraftOption = draftMeta !== null;

  if (!isLoggedInCustomer && !showDraftOption) return null;

  const items = useMemo((): MenuItem[] => {
    const list: MenuItem[] = [
      {
        value: "",
        label: savedDesignId ? designName || "Current design" : "New design",
        group: "current",
      },
    ];
    if (showDraftOption && draftMeta) {
      list.push({
        value: DRAFT_VALUE,
        label: `${draftMeta.designName} (draft · ${formatDraftTime(draftMeta.savedAt)})`,
        group: "browser",
      });
    }
    for (const d of savedDesigns) {
      list.push({
        value: d.id,
        label: d.folderName ? `${d.name} · ${d.folderName}` : d.name,
        group: "saved",
      });
    }
    return list;
  }, [savedDesignId, designName, showDraftOption, draftMeta, savedDesigns]);

  const selectedValue = useMemo(() => {
    if (savedDesignId && savedDesigns.some((d) => d.id === savedDesignId)) {
      return savedDesignId;
    }
    return "";
  }, [savedDesignId, savedDesigns]);

  const triggerLabel =
    items.find((i) => i.value === selectedValue)?.label ??
    (savedDesignId ? designName || "Current design" : "Open design…");

  const updateMenuPosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setMenuPos({
      top: r.bottom + 4,
      left: r.left,
      width: Math.max(r.width, 200),
    });
  }, []);

  const toggleOpen = () => {
    if (open) {
      setOpen(false);
      return;
    }
    refreshList();
    updateMenuPosition();
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();
    const onScrollOrResize = () => updateMenuPosition();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      const menu = document.getElementById("label-design-picker-menu");
      if (menu?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onPick = (value: string) => {
    setOpen(false);
    if (value === selectedValue) return;
    if (value === DRAFT_VALUE) {
      const ok = loadBrowserDraftIntoEditor();
      onMessage?.(ok ? "Loaded browser draft." : "No draft found for this template.");
      return;
    }
    if (!value) return;
    startTransition(async () => {
      const r = await loadSavedDesignIntoEditor(value);
      onMessage?.(r.ok ? "Design loaded." : r.error);
      if (r.ok) refreshList();
    });
  };

  const menu =
    open && menuPos && typeof document !== "undefined"
      ? createPortal(
          <div
            id="label-design-picker-menu"
            role="listbox"
            className="max-h-56 overflow-y-auto rounded-lg border-2 border-palm/25 bg-white py-1 shadow-xl dark:border-zinc-600 dark:bg-zinc-900"
            style={{
              position: "fixed",
              top: menuPos.top,
              left: menuPos.left,
              width: menuPos.width,
              zIndex: 9999,
            }}
          >
            {items.map((item) => {
              const isActive = item.value === selectedValue;
              const groupLabel =
                item.group === "browser" ? "Browser" : item.group === "saved" ? "Saved" : null;
              const showGroupHeader =
                groupLabel &&
                (item.group === "browser"
                  ? items.findIndex((x) => x.group === "browser") === items.indexOf(item)
                  : items.findIndex((x) => x.group === "saved") === items.indexOf(item));
              return (
                <div key={item.value || "__current__"}>
                  {showGroupHeader ? (
                    <p className="px-3 py-1 text-[9px] font-black uppercase tracking-wide text-palm/60 dark:text-emerald-300/70">
                      {groupLabel}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    disabled={pending}
                    onClick={() => onPick(item.value)}
                    className={`block w-full px-3 py-2 text-left text-xs font-bold disabled:opacity-50 ${
                      isActive
                        ? "bg-palm/15 text-palm dark:bg-emerald-900/40 dark:text-emerald-300"
                        : "text-ink hover:bg-surf dark:text-zinc-200 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {item.label}
                  </button>
                </div>
              );
            })}
            {items.length <= 1 && isLoggedInCustomer ? (
              <p className="px-3 py-2 text-[11px] text-ink/50">No other saves for this template yet.</p>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        disabled={pending}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={toggleOpen}
        className="flex max-w-[11rem] items-center gap-1 rounded border border-palm/30 bg-white py-1 pl-2 pr-1.5 text-[11px] font-bold text-palm disabled:opacity-50 sm:max-w-[14rem] sm:text-xs dark:border-zinc-600 dark:bg-zinc-950 dark:text-emerald-300"
        title="Open a saved design"
      >
        <span className="min-w-0 truncate">{triggerLabel}</span>
        <span className="shrink-0 text-[10px] opacity-70" aria-hidden>
          ▼
        </span>
      </button>
      {menu}
    </div>
  );
}
