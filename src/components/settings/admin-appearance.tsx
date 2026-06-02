"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "io-admin-ui-dark";

export function SettingsAdminHydrateAppearance() {
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const el = document.getElementById("settings-admin-shell");
      if (!el) return;
      if (window.localStorage.getItem(STORAGE_KEY) === "1") {
        el.classList.add("dark");
      }
    } catch {
      /* ignore */
    }
  }, []);

  return null;
}

export function SettingsAdminDarkToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    try {
      setDark(typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setDark(false);
    }
  }, []);

  const apply = useCallback((next: boolean) => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      }
    } catch {
      /* ignore */
    }
    const el = typeof document !== "undefined" ? document.getElementById("settings-admin-shell") : null;
    el?.classList.toggle("dark", next);
    setDark(next);
  }, []);

  return (
    <label className="flex cursor-pointer items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-white/90 dark:text-zinc-500">
      <input
        type="checkbox"
        className="h-4 w-4 shrink-0 rounded border-2 border-white/50 accent-mango"
        checked={dark}
        onChange={(e) => apply(e.target.checked)}
      />
      Dark mode
    </label>
  );
}
