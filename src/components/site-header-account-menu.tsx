"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SignOutButton } from "@/components/sign-out-button";

const ACCOUNT_LINKS = [
  { href: "/account/orders", label: "Orders" },
  { href: "/account/messages", label: "Messages" },
  { href: "/account/wishlist", label: "Wishlist" },
  { href: "/account/profile", label: "My info" },
] as const;

const triggerClass =
  "shrink-0 rounded border-2 border-transparent px-1.5 py-0.5 text-xs font-medium text-header-nav-fg/95 hover:border-header-nav-fg/50 sm:px-2 sm:py-1 sm:text-sm";

export function SiteHeaderAccountMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        className={triggerClass}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
      >
        Account
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-[60] mt-1 min-w-[10.5rem] rounded border-2 border-palm/30 bg-white py-1 shadow-xl"
        >
          {ACCOUNT_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              className="block px-3 py-2 text-sm font-medium text-ink hover:bg-surf/80"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-1 border-t border-palm/15 pt-1">
            <SignOutButton className="block w-full px-3 py-2 text-left text-sm font-medium text-coral hover:bg-surf/80">
              Sign out
            </SignOutButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
