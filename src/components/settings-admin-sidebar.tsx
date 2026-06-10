"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { SettingsAdminDarkToggle } from "@/components/settings/admin-appearance";
import { SignOutButton } from "@/components/sign-out-button";

const MAIN_LINKS: { href: string; label: string; badge?: "messages" }[] = [
  { href: "/settings/sales", label: "Sales" },
  { href: "/settings/messages", label: "Messages", badge: "messages" },
  { href: "/settings/customers", label: "Customers" },
  { href: "/settings/species-list", label: "Species List" },
];

const PRODUCT_LINKS: { href: string; label: string }[] = [
  { href: "/settings/products", label: "Catalog" },
  { href: "/settings/products/stocking", label: "Product stocking" },
  { href: "/settings/products/types", label: "Product types" },
  { href: "/settings/products/footers", label: "Product footers" },
];

const INSIGHTS_LINKS: { href: string; label: string }[] = [
  { href: "/settings/reports", label: "Reports" },
  { href: "/settings/suggestions", label: "Suggestions" },
];

const FUN_STUFF_LINKS: { href: string; label: string }[] = [
  { href: "/settings/image-submission", label: "Image Submission" },
];

const SETTINGS_LINKS: { href: string; label: string }[] = [
  { href: "/settings/home", label: "Home" },
  { href: "/settings/store", label: "Store" },
  { href: "/settings/featured", label: "Featured" },
  { href: "/settings/events", label: "Events" },
  { href: "/settings/labels", label: "Labels" },
  { href: "/settings/about", label: "About" },
  { href: "/settings/shipping", label: "Shipping" },
  { href: "/settings/theme", label: "Theme" },
  { href: "/settings/footer", label: "Site Footer" },
  { href: "/settings/global", label: "Global" },
  { href: "/settings/seo", label: "SEO" },
  { href: "/settings/loyalty", label: "Loyalty" },
  { href: "/settings/payments", label: "Payments" },
  { href: "/settings/email", label: "Email" },
  { href: "/settings/reviews", label: "Reviews" },
  { href: "/settings/qr-codes", label: "QR Codes" },
];

const BACK_TO_MAIN_HREF = "/settings/sales";
const SETTINGS_ENTRY_HREF = "/settings/home";

export function pathIsSettingsArea(pathname: string): boolean {
  return SETTINGS_LINKS.some(({ href }) => pathname === href || pathname.startsWith(`${href}/`));
}

function linkActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === "/settings/products" && pathname === "/settings/products") return true;
  if (href === "/settings/reports" && pathname.startsWith("/settings/reports")) return true;
  return pathname.startsWith(`${href}/`);
}

const linkClass =
  "block rounded px-2 py-2 font-medium text-white hover:bg-[#1b4332] hover:text-white dark:text-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-white";
const linkActiveClass = "bg-[#1b4332] ring-1 ring-white/25 dark:bg-zinc-800";

function NavLink({
  href,
  children,
  pathname,
  onPick,
}: {
  href: string;
  children: React.ReactNode;
  pathname: string;
  onPick: () => void;
}) {
  const active = linkActive(pathname, href);
  return (
    <Link href={href} onClick={onPick} className={`${linkClass} ${active ? linkActiveClass : ""}`}>
      {children}
    </Link>
  );
}

function NavSections({
  pathname,
  unreadSupportCount,
  onPick,
}: {
  pathname: string;
  unreadSupportCount: number;
  onPick: () => void;
}) {
  if (pathIsSettingsArea(pathname)) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <p className="mb-2 shrink-0 text-xs font-bold uppercase tracking-wider text-white/90 dark:text-zinc-400">Settings</p>
        <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto text-sm" aria-label="Settings menu">
          {SETTINGS_LINKS.map((item) => (
            <NavLink key={item.href} href={item.href} pathname={pathname} onPick={onPick}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-4 shrink-0 border-t border-white/20 pt-4 dark:border-zinc-700">
          <Link
            href={BACK_TO_MAIN_HREF}
            onClick={onPick}
            className="block w-full rounded border-2 border-white/40 px-2 py-2 text-center text-sm font-bold text-mango hover:bg-[#1b4332] hover:text-white"
          >
            Back to main menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
        <nav className="flex flex-col text-sm" aria-label="Admin menu">
          <div>
            <p className="mb-1 px-2 text-xs font-bold uppercase tracking-wider text-white/70 dark:text-zinc-500">Main</p>
            <ul className="flex flex-col gap-0.5 border-l border-white/20 pl-2 dark:border-zinc-700">
              {MAIN_LINKS.map((item) => (
                <li key={item.href}>
                  <NavLink href={item.href} pathname={pathname} onPick={onPick}>
                    {item.label}
                    {item.badge === "messages" && unreadSupportCount > 0 ? (
                      <span className="ml-2 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-coral px-1.5 py-0.5 text-[10px] font-black leading-none text-white">
                        {unreadSupportCount > 99 ? "99+" : unreadSupportCount}
                      </span>
                    ) : null}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 border-t border-white/15 pt-5 dark:border-zinc-700/80">
            <p className="mb-1 px-2 text-xs font-bold uppercase tracking-wider text-white/70 dark:text-zinc-500">Product</p>
            <ul className="flex flex-col gap-0.5 border-l border-white/20 pl-2 dark:border-zinc-700">
              {PRODUCT_LINKS.map((item) => (
                <li key={item.href}>
                  <NavLink href={item.href} pathname={pathname} onPick={onPick}>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 border-t border-white/15 pt-5 dark:border-zinc-700/80">
            <p className="mb-1 px-2 text-xs font-bold uppercase tracking-wider text-white/70 dark:text-zinc-500">
              Insights
            </p>
            <ul className="flex flex-col gap-0.5 border-l border-white/20 pl-2 dark:border-zinc-700">
              {INSIGHTS_LINKS.map((item) => (
                <li key={item.href}>
                  <NavLink href={item.href} pathname={pathname} onPick={onPick}>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 border-t border-white/15 pt-5 dark:border-zinc-700/80">
            <p className="mb-1 px-2 text-xs font-bold uppercase tracking-wider text-white/70 dark:text-zinc-500">
              Fun Stuff
            </p>
            <ul className="flex flex-col gap-0.5 border-l border-white/20 pl-2 dark:border-zinc-700">
              {FUN_STUFF_LINKS.map((item) => (
                <li key={item.href}>
                  <NavLink href={item.href} pathname={pathname} onPick={onPick}>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </div>

      <div className="mt-6 shrink-0 border-t border-white/15 pt-5 dark:border-zinc-700/80">
        <Link href={SETTINGS_ENTRY_HREF} onClick={onPick} className={`${linkClass} w-full text-left`}>
          Settings
          <span className="ml-1 text-white/60">→</span>
        </Link>
      </div>
    </div>
  );
}

function SidebarBody({
  pathname,
  unreadSupportCount,
  closeDrawer,
}: {
  pathname: string;
  unreadSupportCount: number;
  closeDrawer: () => void;
}) {
  const onPick = useCallback(() => {
    closeDrawer();
  }, [closeDrawer]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-4 shrink-0">
        <p className="text-xs font-bold uppercase tracking-wider text-white/90 dark:text-zinc-400">Admin</p>
        <div className="mt-3">
          <SettingsAdminDarkToggle />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <NavSections pathname={pathname} unreadSupportCount={unreadSupportCount} onPick={onPick} />
      </div>

      <div className="mt-auto shrink-0 border-t border-white/20 pt-4 dark:border-zinc-700">
        <SignOutButton className="block w-full rounded border-2 border-white/80 bg-[#0f2d22] px-3 py-2 text-center text-sm font-bold text-white hover:border-mango hover:bg-mango hover:text-palm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:border-mango dark:hover:bg-mango dark:hover:text-palm" />
      </div>
    </div>
  );
}

export function SettingsAdminSidebar({ unreadSupportCount = 0 }: { unreadSupportCount?: number }) {
  const pathname = usePathname() || "";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  return (
    <>
      <button
        type="button"
        aria-label={drawerOpen ? "Close menu" : "Open menu"}
        aria-expanded={drawerOpen}
        onClick={() => setDrawerOpen((o) => !o)}
        className="fixed left-0 top-[40%] z-[60] flex h-16 w-10 -translate-y-1/2 items-center justify-center rounded-r-xl border border-l-0 border-white/25 bg-[#0f2d22] text-white shadow-lg md:hidden dark:border-zinc-600 dark:bg-zinc-950"
      >
        <span className="text-lg leading-none" aria-hidden>
          {drawerOpen ? "×" : "☰"}
        </span>
      </button>

      {drawerOpen ? (
        <div className="fixed inset-0 z-[70] md:hidden" role="dialog" aria-modal="true" aria-label="Admin navigation">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
            aria-label="Close menu"
            onClick={closeDrawer}
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(20rem,90vw)] flex-col border-r-4 border-palm bg-[#0f2d22] p-4 text-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
            <SidebarBody pathname={pathname} unreadSupportCount={unreadSupportCount} closeDrawer={closeDrawer} />
          </div>
        </div>
      ) : null}

      <aside className="relative hidden w-56 shrink-0 border-r-4 border-palm bg-[#0f2d22] text-white dark:border-zinc-800 dark:bg-zinc-950 md:flex md:flex-col">
        <div className="sticky top-0 flex h-dvh max-h-dvh flex-col overflow-hidden p-4">
          <SidebarBody pathname={pathname} unreadSupportCount={unreadSupportCount} closeDrawer={() => {}} />
        </div>
      </aside>
    </>
  );
}
