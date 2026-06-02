"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SiteHeaderAccountMenu } from "@/components/site-header-account-menu";
import { SiteHeaderBrand } from "@/components/site-header-brand";
import { SiteHeaderCartLink, type CartPreviewLine } from "@/components/site-header-cart-link";
import { SignOutButton } from "@/components/sign-out-button";
import { isLabelEditorPath } from "@/lib/label-editor-path";
import type { CompanyLogoPlacement } from "@/lib/site-config-types";

export type SiteHeaderNavItem = { href: string; label: string };

const navLinkClass =
  "shrink-0 rounded border-2 border-transparent px-1.5 py-0.5 text-xs font-medium text-header-nav-fg/95 hover:border-header-nav-fg/50 md:px-2 md:py-1 md:text-sm";

const adminLinkClass =
  "shrink-0 rounded border-2 border-mango/80 bg-mango/20 px-1.5 py-0.5 text-xs font-bold text-mango hover:border-mango hover:bg-mango/30 md:px-2 md:py-1 md:text-sm";

const guestLinkClass =
  "shrink-0 text-xs font-medium text-header-nav-fg underline-offset-4 hover:text-mango hover:underline md:text-sm";

const cartLinkClass =
  "flex shrink-0 items-center gap-1 rounded border-2 border-mango bg-mango px-2 py-0.5 text-xs font-bold text-palm shadow-sm hover:border-coral hover:bg-coral hover:text-white md:gap-2 md:px-3 md:py-1.5 md:text-sm";

/** Hide logo after scrolling down; show again only near top (avoids flicker at ~28px). */
const MOBILE_BRAND_HIDE_PX = 72;
const MOBILE_BRAND_SHOW_PX = 12;

export function SiteHeaderClient({
  companyName,
  companyLogoUrl,
  companyLogoPlacement,
  headerShowCompanyName,
  headerShowCompanyLogo,
  navItems,
  role,
  cartPreview,
  cartCount,
}: {
  companyName: string;
  companyLogoUrl: string;
  companyLogoPlacement: CompanyLogoPlacement;
  headerShowCompanyName: boolean;
  headerShowCompanyLogo: boolean;
  navItems: SiteHeaderNavItem[];
  role: "admin" | "customer" | null;
  cartPreview: { count: number; lines: CartPreviewLine[]; subtotalCents: number } | null;
  cartCount: number;
}) {
  const pathname = usePathname();
  const labelEditorMobile = isLabelEditorPath(pathname);
  const [brandHiddenByScroll, setBrandHiddenByScroll] = useState(false);
  const brandHiddenRef = useRef(false);

  const brandProps = {
    name: companyName,
    logoUrl: companyLogoUrl,
    placement: companyLogoPlacement,
    showName: headerShowCompanyName,
    showLogo: headerShowCompanyLogo,
  };

  const showBrand = brandProps.showName || (brandProps.showLogo && !!brandProps.logoUrl?.trim());

  useEffect(() => {
    if (labelEditorMobile) {
      brandHiddenRef.current = true;
      setBrandHiddenByScroll(true);
      return;
    }

    function syncFromScroll() {
      const y = Math.max(0, window.scrollY);
      let next = brandHiddenRef.current;
      if (y >= MOBILE_BRAND_HIDE_PX) next = true;
      else if (y <= MOBILE_BRAND_SHOW_PX) next = false;
      if (next !== brandHiddenRef.current) {
        brandHiddenRef.current = next;
        setBrandHiddenByScroll(next);
      }
    }

    syncFromScroll();
    let raf = 0;
    function onScroll() {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        syncFromScroll();
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [labelEditorMobile]);

  const hideMobileBrand = labelEditorMobile || brandHiddenByScroll;

  return (
    <header
      className="site-header-chrome sticky top-0 z-50 shadow-md [overflow-anchor:none]"
      style={{ overflowAnchor: "none" }}
    >
      {/* Mobile: slide logo up; collapse slot height only when hidden (hysteresis avoids flicker) */}
      {showBrand && !labelEditorMobile ? (
        <div
          className="overflow-hidden transition-[max-height,opacity] duration-200 ease-out md:hidden"
          style={{ maxHeight: hideMobileBrand ? 0 : "5rem" }}
          aria-hidden={hideMobileBrand}
        >
          <div
            className={`flex justify-center px-2 pt-0.5 transition-opacity duration-200 ease-out ${
              hideMobileBrand ? "pointer-events-none opacity-0" : "opacity-100"
            }`}
          >
            <SiteHeaderBrand {...brandProps} compact />
          </div>
        </div>
      ) : null}

      {/* Menu row — always visible */}
      <div className="storefront-content-width flex items-center gap-1 px-2 py-1 max-md:pt-0 md:gap-3 md:px-4 md:py-2.5">
        {/* Desktop brand */}
        {showBrand ? (
          <div className="hidden min-w-0 shrink-0 md:block md:max-w-[min(16rem,32%)]">
            <SiteHeaderBrand {...brandProps} />
          </div>
        ) : null}

        <nav
          className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] md:flex-wrap md:justify-center md:gap-x-3 md:overflow-visible [&::-webkit-scrollbar]:hidden"
          aria-label="Main"
        >
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={navLinkClass}>
              {item.label}
            </Link>
          ))}
          {role === "admin" ? (
            <Link href="/settings/sales" className={adminLinkClass}>
              Admin
            </Link>
          ) : null}
        </nav>

        <div className="flex shrink-0 items-center gap-1 md:gap-2">
          {!role ? (
            <>
              <Link href="/login" className={guestLinkClass}>
                Log in
              </Link>
              <Link href="/register" className={`${guestLinkClass} font-bold text-mango`}>
                Join
              </Link>
            </>
          ) : null}
          {role === "customer" ? <SiteHeaderAccountMenu /> : null}
          {role === "admin" ? (
            <SignOutButton className={guestLinkClass}>Sign out</SignOutButton>
          ) : null}
          {role === "customer" && cartPreview ? (
            <SiteHeaderCartLink
              count={cartPreview.count}
              lines={cartPreview.lines}
              subtotalCents={cartPreview.subtotalCents}
            />
          ) : (
            <Link href="/cart" className={cartLinkClass} aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ""}`}>
              Cart
              {cartCount > 0 ? (
                <span className="min-w-[1rem] text-center text-[10px] md:min-w-[1.25rem] md:text-xs">{cartCount}</span>
              ) : null}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
