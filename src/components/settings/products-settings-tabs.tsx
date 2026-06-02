"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/settings/products", label: "Catalog" },
  { href: "/settings/products/types", label: "Product types" },
  { href: "/settings/products/footers", label: "Product footers" },
];

export function ProductsSettingsTabs() {
  const pathname = usePathname() ?? "";
  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b border-palm/25 pb-3" aria-label="Products section">
      {tabs.map((t) => {
        const active =
          t.href === "/settings/products"
            ? pathname === "/settings/products" ||
              (pathname.startsWith("/settings/products/") &&
                !pathname.startsWith("/settings/products/types") &&
                !pathname.startsWith("/settings/products/footers"))
            : pathname === t.href || pathname.startsWith(`${t.href}/`);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded border-2 px-3 py-1.5 text-sm font-bold ${
              active
                ? "border-palm bg-palm text-sand"
                : "border-palm/30 text-palm hover:border-palm hover:bg-surf/50"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
