import { SiteAnalyticsBeacon } from "@/components/analytics/site-analytics-beacon";
import { SiteHeader } from "@/components/site-header";
import { SiteFooterWrapper } from "@/components/site-footer-wrapper";
import { SiteMain } from "@/components/site-main";
import { SupportChatBubbleHost } from "@/components/support-chat-bubble-host";
import { getSiteConfig } from "@/lib/site-config";
import { getSiteFooterSettings } from "@/lib/site-footer-settings";
import { getStorefrontNavSettings } from "@/lib/storefront-nav-settings";
import { getStoreSettings } from "@/lib/store-settings";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [footerSettings, siteConfig, nav, store] = await Promise.all([
    getSiteFooterSettings(),
    getSiteConfig(),
    getStorefrontNavSettings(),
    getStoreSettings(),
  ]);
  const cardHover = store.cardHoverMode;
  const builderUrl = process.env.NEXT_PUBLIC_SITE_BUILDER_URL?.trim() ?? "";

  return (
    <div className="storefront-shell flex min-h-0 flex-1 flex-col" data-store-card-hover={cardHover}>
      <SiteAnalyticsBeacon />
      <SiteHeader />
      <SiteMain>{children}</SiteMain>
      <SiteFooterWrapper
        settings={footerSettings}
        companyName={siteConfig.companyName}
        shopLabel={nav.shop.label}
        aboutLabel={nav.about.label}
        shopNavEnabled={nav.shop.enabled}
        aboutNavEnabled={nav.about.enabled}
        builderUrl={builderUrl}
      />
      <SupportChatBubbleHost />
    </div>
  );
}
