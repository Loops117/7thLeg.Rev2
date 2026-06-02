"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { btnMainLg } from "@/lib/btn-theme-classes";
import { createPortal } from "react-dom";
import type { UrgentHomeNotificationPayload } from "@/lib/site-config";

const STORAGE_PREFIX = "storefront-urgent-homeok";

function storageKey(revision: number) {
  return `${STORAGE_PREFIX}-r${revision}`;
}

/**
 * Shown on `/` only. Blocks interaction with the app until the visitor acknowledges (localStorage per revision).
 */
export function UrgentHomeNotificationClient({
  config,
}: {
  config: UrgentHomeNotificationPayload;
}) {
  const pathname = usePathname();
  const labelId = useId();
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  const shouldOffer =
    config.enabled && config.body.trim().length > 0 && (pathname === "/" || pathname === "");

  useEffect(() => {
    if (!shouldOffer) {
      setOpen(false);
      return;
    }
    try {
      if (globalThis.localStorage.getItem(storageKey(config.revision)) === "1") {
        setOpen(false);
        return;
      }
    } catch {
      /* ignore */
    }
    setOpen(true);
  }, [shouldOffer, config.revision, config.body]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => closeRef.current?.focus(), 50);
    const trapTab = (e: KeyboardEvent) => {
      if (e.key === "Tab") e.preventDefault();
    };
    document.addEventListener("keydown", trapTab, true);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", trapTab, true);
    };
  }, [open]);

  const dismiss = useCallback(() => {
    try {
      globalThis.localStorage.setItem(storageKey(config.revision), "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }, [config.revision]);

  if (!open) return null;

  const title = config.title.trim() || "Important notice";

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <div className="absolute inset-0 bg-ink/70 backdrop-blur-sm" aria-hidden />
      <div
        className="relative z-10 w-full max-w-lg overflow-hidden rounded border-4 border-coral bg-parchment shadow-2xl"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={labelId}
        aria-describedby={`${labelId}-desc`}
      >
        <div className="border-b-4 border-coral bg-coral/15 px-4 py-3">
          <h2 id={labelId} className="text-center text-lg font-black text-ink sm:text-xl">
            {title}
          </h2>
        </div>
        <div
          id={`${labelId}-desc`}
          className="max-h-[min(50vh,22rem)] overflow-y-auto px-4 py-4 text-ink/90"
        >
          <p className="whitespace-pre-wrap text-sm sm:text-base">{config.body}</p>
        </div>
        <div className="border-t-2 border-palm/20 bg-sand/40 px-4 py-4">
          <button
            type="button"
            ref={closeRef}
            onClick={dismiss}
            className={`w-full ${btnMainLg} text-base focus:outline-none focus:ring-2 focus:ring-lagoon focus:ring-offset-2`}
          >
            Continue
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
