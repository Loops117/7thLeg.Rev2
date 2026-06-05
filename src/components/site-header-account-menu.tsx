"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SignOutButton } from "@/components/sign-out-button";
import { useCoarsePointer } from "@/lib/use-coarse-pointer";

const ACCOUNT_LINKS = [
  { href: "/account/orders", label: "Orders" },
  { href: "/account/messages", label: "Messages" },
  { href: "/account/wishlist", label: "Wishlist" },
  { href: "/account/species", label: "My Species" },
  { href: "/account/profile", label: "My info" },
] as const;

const triggerClass =
  "shrink-0 rounded border-2 border-transparent px-1.5 py-0.5 text-xs font-medium text-header-nav-fg/95 hover:border-header-nav-fg/50 sm:px-2 sm:py-1 sm:text-sm";

export function SiteHeaderAccountMenu() {
  const router = useRouter();
  const coarsePointer = useCoarsePointer();
  const [mobileOpen, setMobileOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!coarsePointer || !mobileOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setMobileOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [coarsePointer, mobileOpen]);

  function handleMobileAccountClick() {
    if (mobileOpen) {
      setMobileOpen(false);
      router.push("/account");
      return;
    }
    setMobileOpen(true);
  }

  const dropdownVisibilityClass = coarsePointer
    ? mobileOpen
      ? "block"
      : "hidden"
    : "hidden group-hover/header-account:block group-focus-within/header-account:block";

  return (
    <div ref={rootRef} className="group/header-account relative shrink-0">
      {coarsePointer ? (
        <button
          type="button"
          className={triggerClass}
          aria-expanded={mobileOpen}
          aria-haspopup="menu"
          onClick={handleMobileAccountClick}
        >
          Account
        </button>
      ) : (
        <Link href="/account" className={triggerClass}>
          Account
        </Link>
      )}
      <div
        role="menu"
        className={`header-account-menu absolute right-0 top-full z-[60] mt-1 min-w-[10.5rem] py-1 ${dropdownVisibilityClass}`}
      >
        {ACCOUNT_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            role="menuitem"
            className="header-account-menu__item"
            onClick={() => setMobileOpen(false)}
          >
            {item.label}
          </Link>
        ))}
        <div className="header-account-menu__divider">
          <SignOutButton className="header-account-menu__item header-account-menu__sign-out">
            Sign out
          </SignOutButton>
        </div>
      </div>
    </div>
  );
}
