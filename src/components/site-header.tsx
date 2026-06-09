import { readCartOwner } from "@/lib/cart-owner";
import { SiteHeaderClient, type SiteHeaderNavItem } from "@/components/site-header-client";
import { getSiteConfig } from "@/lib/site-config";
import { getCartHeaderPreviewForOwner } from "@/lib/store-cart";
import { auth as readAuthSession } from "@/auth";

function mainNavLinks(config: {
  labelBuilderEnabled: boolean;
  labelBuilderNavEnabled: boolean;
  navShopEnabled: boolean;
  navShopLabel: string;
  navFeaturedEnabled: boolean;
  navFeaturedLabel: string;
  navGalleryEnabled: boolean;
  navGalleryLabel: string;
  navAboutEnabled: boolean;
  navAboutLabel: string;
}): SiteHeaderNavItem[] {
  const links: SiteHeaderNavItem[] = [{ href: "/", label: "Home" }];
  if (config.navShopEnabled) {
    links.push({ href: "/store", label: config.navShopLabel });
  }
  if (config.navFeaturedEnabled) {
    links.push({ href: "/featured", label: config.navFeaturedLabel });
  }
  if (config.navGalleryEnabled) {
    links.push({ href: "/gallery", label: config.navGalleryLabel });
  }
  if (config.labelBuilderEnabled && config.labelBuilderNavEnabled) {
    links.push({ href: "/labels", label: "Labels" });
  }
  if (config.navAboutEnabled) {
    links.push({ href: "/about", label: config.navAboutLabel });
  }
  return links;
}

export async function SiteHeader() {
  const config = await getSiteConfig();
  const session = await readAuthSession().catch(() => null);
  const role = session?.user?.role === "admin" || session?.user?.role === "customer" ? session.user.role : null;
  const owner = await readCartOwner();
  const cartPreview = owner ? await getCartHeaderPreviewForOwner(owner) : null;
  const cartCount = cartPreview?.count ?? 0;

  return (
    <SiteHeaderClient
      companyName={config.companyName}
      companyLogoUrl={config.companyLogoUrl}
      companyLogoPlacement={config.companyLogoPlacement}
      headerShowCompanyName={config.headerShowCompanyName}
      headerShowCompanyLogo={config.headerShowCompanyLogo}
      navItems={mainNavLinks(config)}
      role={role}
      cartPreview={cartPreview}
      cartCount={cartCount}
    />
  );
}
