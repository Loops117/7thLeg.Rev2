import Link from "next/link";
import {
  applyFooterPlaceholders,
  footerAlignmentClasses,
  type SiteFooterSettings,
} from "@/lib/site-footer-settings-shared";

export type SiteFooterProps = {
  settings: SiteFooterSettings;
  companyName: string;
  shopLabel: string;
  aboutLabel: string;
  shopNavEnabled: boolean;
  aboutNavEnabled: boolean;
  builderUrl: string;
  compact?: boolean;
};

function FooterRichBlock({
  html,
  className,
}: {
  html: string;
  className: string;
}) {
  if (!html.trim()) return null;
  return (
    <div
      className={`site-footer-rich max-w-2xl leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function FooterNavLinks({
  settings,
  shopLabel,
  aboutLabel,
  shopNavEnabled,
  aboutNavEnabled,
  compact,
}: Pick<
  SiteFooterProps,
  "settings" | "shopLabel" | "aboutLabel" | "shopNavEnabled" | "aboutNavEnabled" | "compact"
>) {
  if (!settings.showNavLinks) return null;

  const linkClass = compact
    ? "text-footer-link-fg hover:text-footer-brand-fg hover:underline"
    : "text-footer-link-fg underline-offset-4 hover:text-footer-brand-fg hover:underline";
  const navClass = compact
    ? "flex shrink-0 flex-wrap items-center gap-3 font-medium"
    : "flex flex-wrap items-center justify-center gap-4 text-sm font-medium sm:justify-end";

  return (
    <nav className={navClass} aria-label="Footer">
      {settings.showAboutLink && aboutNavEnabled ? (
        <Link href="/about" className={linkClass}>
          {aboutLabel}
        </Link>
      ) : null}
      {settings.showShopLink && shopNavEnabled ? (
        <Link href="/store" className={linkClass}>
          {shopLabel}
        </Link>
      ) : null}
      {!compact && settings.showAdminLink ? (
        <Link
          href="/settings/login"
          className="rounded border-2 border-palm/40 bg-sand px-3 py-1.5 text-palm hover:border-palm hover:bg-surf"
        >
          Admin
        </Link>
      ) : null}
    </nav>
  );
}

function BuilderCredit({
  settings,
  builderUrl,
  compact,
  align,
}: {
  settings: SiteFooterSettings;
  builderUrl: string;
  compact: boolean;
  align: { text: string };
}) {
  if (!settings.showBuilderCredit) return null;
  const prefix = settings.builderCreditPrefix.trim() || "Website by";
  const linkClass = compact
    ? "font-semibold text-footer-link-fg hover:text-footer-brand-fg hover:underline"
    : `font-semibold text-footer-link-fg underline-offset-4 hover:text-footer-brand-fg hover:underline`;

  if (compact) {
    if (!settings.showBuilderCreditLink || !builderUrl) return null;
    return (
      <a href={builderUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
        7th Leg
      </a>
    );
  }

  return (
    <p className={`text-xs text-footer-fg/70 ${align.text}`}>
      {prefix}{" "}
      {builderUrl ? (
        <a href={builderUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
          7th Leg
        </a>
      ) : (
        <span className="font-semibold text-footer-fg/85">7th Leg</span>
      )}
    </p>
  );
}

export function SiteFooter({
  settings,
  companyName,
  shopLabel,
  aboutLabel,
  shopNavEnabled,
  aboutNavEnabled,
  builderUrl,
  compact = false,
}: SiteFooterProps) {
  if (!settings.enabled) return null;

  const year = new Date().getFullYear();
  const align = footerAlignmentClasses(settings.alignment);
  const taglineHtml = applyFooterPlaceholders(settings.taglineHtml, { year, companyName });
  const copyrightHtml = applyFooterPlaceholders(settings.copyrightHtml, { year, companyName });

  if (compact) {
    const copyrightPlain = settings.showCopyright
      ? `© ${year} ${companyName}`
      : null;
    return (
      <footer className="site-footer-chrome shrink-0 py-1.5">
        <div
          className={`storefront-content-width flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 ${align.text}`}
        >
          {copyrightPlain ? (
            <p className="truncate text-[10px] font-medium leading-tight text-footer-fg/75 sm:text-[11px]">
              {copyrightPlain}
            </p>
          ) : (
            <span />
          )}
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <FooterNavLinks
              settings={settings}
              shopLabel={shopLabel}
              aboutLabel={aboutLabel}
              shopNavEnabled={shopNavEnabled}
              aboutNavEnabled={aboutNavEnabled}
              compact
            />
            <BuilderCredit settings={settings} builderUrl={builderUrl} compact align={align} />
          </div>
        </div>
      </footer>
    );
  }

  const isSplit = settings.layout === "split";

  return (
    <footer className="site-footer-chrome py-8">
      <div
        className={`storefront-content-width flex flex-col gap-4 px-4 ${align.container} ${align.text}`}
      >
        {settings.showTagline ? (
          <FooterRichBlock
            html={taglineHtml}
            className="text-base font-bold text-footer-brand-fg sm:text-lg [&_a]:text-footer-link-fg [&_a]:underline"
          />
        ) : null}

        {settings.showCopyright ? (
          <FooterRichBlock html={copyrightHtml} className="text-xs text-footer-fg/75" />
        ) : null}

        {settings.showBuilderCredit || settings.showNavLinks ? (
          <div
            className={`mt-2 flex w-full gap-4 border-t border-footer-brand-fg/20 pt-4 ${
              isSplit
                ? `flex-col sm:flex-row sm:items-start ${
                    settings.alignment === "right"
                      ? "sm:flex-row-reverse sm:justify-end"
                      : settings.alignment === "left"
                        ? "sm:justify-start"
                        : "sm:justify-between"
                  }`
                : `flex-col ${align.container}`
            }`}
          >
            <div className={isSplit ? `order-2 sm:order-1 ${align.text}` : align.text}>
              <BuilderCredit settings={settings} builderUrl={builderUrl} compact={false} align={align} />
            </div>
            <div className={isSplit ? "order-1 sm:order-2" : ""}>
              <FooterNavLinks
                settings={settings}
                shopLabel={shopLabel}
                aboutLabel={aboutLabel}
                shopNavEnabled={shopNavEnabled}
                aboutNavEnabled={aboutNavEnabled}
                compact={false}
              />
            </div>
          </div>
        ) : null}
      </div>
    </footer>
  );
}
