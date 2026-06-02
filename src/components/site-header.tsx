import { auth as readAuthSession } from "@/auth";
import { SiteHeaderClient, type SiteHeaderNavItem } from "@/components/site-header-client";
import { getSiteConfig } from "@/lib/site-config";
import { getCartHeaderPreview } from "@/lib/store-cart";

function mainNavLinks(config: {
  labelBuilderEnabled: boolean;
  labelBuilderNavEnabled: boolean;
  navShopEnabled: boolean;
  navShopLabel: string;
  navFeaturedEnabled: boolean;
  navFeaturedLabel: string;
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
  const customerId = role === "customer" && session?.user?.id ? session.user.id : null;
  const cartPreview = customerId ? await getCartHeaderPreview(customerId) : null;
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
