"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { btnImportantLink } from "@/lib/btn-theme-classes";

const MENU_MIN_WIDTH = 176;
const MENU_EST_HEIGHT = 220;

type Props = {
  productName: string;
  pending: boolean;
  onRestock: () => void;
  onToggleActive: () => void;
  onEdit: () => void;
  viewHref: string;
  onDelete: () => void;
  active: boolean;
};

export function ProductCatalogActionsMenu({
  productName,
  pending,
  onRestock,
  onToggleActive,
  onEdit,
  viewHref,
  onDelete,
  active,
}: Props) {
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  const updateMenuPosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const openUp = spaceBelow < MENU_EST_HEIGHT && r.top > spaceBelow;
    const top = openUp ? Math.max(8, r.top - MENU_EST_HEIGHT - 4) : r.bottom + 4;
    const left = Math.min(
      Math.max(8, r.right - MENU_MIN_WIDTH),
      window.innerWidth - MENU_MIN_WIDTH - 8,
    );
    setMenuPos({ top, left });
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const toggle = () => {
    if (open) {
      close();
      return;
    }
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
      const menu = document.getElementById(menuId);
      if (menu?.contains(t)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close, menuId]);

  const menu =
    open && menuPos && typeof document !== "undefined"
      ? createPortal(
          <div
            id={menuId}
            role="menu"
            className="min-w-[11rem] rounded border-2 border-palm bg-white py-1 shadow-xl dark:border-zinc-600 dark:bg-zinc-800 dark:shadow-black/40"
            style={{
              position: "fixed",
              top: menuPos.top,
              left: menuPos.left,
              zIndex: 9999,
            }}
          >
            <button
              type="button"
              role="menuitem"
              disabled={pending}
              className="block w-full px-3 py-2 text-left text-sm font-medium text-ink hover:bg-surf disabled:opacity-50 dark:hover:bg-zinc-700"
              onClick={() => {
                close();
                onRestock();
              }}
            >
              Restock…
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={pending}
              className="block w-full px-3 py-2 text-left text-sm font-medium text-ink hover:bg-surf disabled:opacity-50 dark:hover:bg-zinc-700"
              onClick={() => {
                close();
                onToggleActive();
              }}
            >
              {active ? "Deactivate" : "Activate"}
            </button>
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-sm font-medium text-ink hover:bg-surf dark:hover:bg-zinc-700"
              onClick={() => {
                close();
                onEdit();
              }}
            >
              Edit
            </button>
            <a
              role="menuitem"
              href={viewHref}
              target="_blank"
              rel="noreferrer"
              className="block px-3 py-2 text-sm font-medium text-lagoon-dark hover:bg-surf dark:text-emerald-300 dark:hover:bg-zinc-700"
              onClick={close}
            >
              View
            </a>
            <button
              type="button"
              role="menuitem"
              disabled={pending}
              className={`block w-full px-3 py-2 text-left text-sm disabled:opacity-50 ${btnImportantLink}`}
              onClick={() => {
                close();
                onDelete();
              }}
            >
              Remove from catalogue (delete)…
            </button>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
        className="mx-auto flex h-8 w-8 cursor-pointer items-center justify-center rounded border-2 border-palm-mid text-palm hover:bg-surf dark:border-zinc-500 dark:text-zinc-100 dark:hover:bg-zinc-700"
      >
        <span aria-hidden className="text-lg leading-none">
          ▾
        </span>
        <span className="sr-only">Actions for {productName}</span>
      </button>
      {menu}
    </>
  );
}
