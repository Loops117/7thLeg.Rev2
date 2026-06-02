"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SUB_LINKS = [
  { href: "/settings/labels", label: "Overview", exact: true },
  { href: "/settings/labels/options", label: "Options" },
  { href: "/settings/labels/information", label: "Information" },
  { href: "/settings/labels/created", label: "Created labels" },
  { href: "/settings/labels/species", label: "Species catalog" },
];

export function LabelsSettingsSubnav() {
  const pathname = usePathname() || "";

  return (
    <nav
      className="mb-6 flex flex-wrap gap-2 border-b border-palm/15 pb-3 dark:border-zinc-700"
      aria-label="Labels settings"
    >
      {SUB_LINKS.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg border-2 px-3 py-1.5 text-sm font-bold ${
              active
                ? "border-palm bg-palm text-white dark:border-emerald-600 dark:bg-emerald-700"
                : "border-palm/20 text-palm hover:bg-surf/60 dark:border-zinc-600 dark:text-emerald-300 dark:hover:bg-zinc-800"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
