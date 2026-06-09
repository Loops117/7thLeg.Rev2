export type SiteFooterAlignment = "left" | "center" | "right";
export type SiteFooterLayout = "stacked" | "split";

export type SiteFooterSettings = {
  enabled: boolean;
  alignment: SiteFooterAlignment;
  layout: SiteFooterLayout;
  taglineHtml: string;
  showTagline: boolean;
  copyrightHtml: string;
  showCopyright: boolean;
  showBuilderCredit: boolean;
  builderCreditPrefix: string;
  showNavLinks: boolean;
  showShopLink: boolean;
  showAboutLink: boolean;
  showBuilderCreditLink: boolean;
  showAdminLink: boolean;
};

export function applyFooterPlaceholders(
  html: string,
  ctx: { year: number; companyName: string },
): string {
  return html
    .replace(/\{year\}/g, String(ctx.year))
    .replace(/\{companyName\}/g, ctx.companyName);
}

export function footerAlignmentClasses(alignment: SiteFooterAlignment): {
  container: string;
  text: string;
} {
  switch (alignment) {
    case "left":
      return { container: "items-start", text: "text-left" };
    case "right":
      return { container: "items-end", text: "text-right" };
    default:
      return { container: "items-center", text: "text-center" };
  }
}

export const BUILTIN_SITE_FOOTER: SiteFooterSettings = {
  enabled: true,
  alignment: "center",
  layout: "split",
  taglineHtml: "<p>7th Leg — invertebrates &amp; supplies.</p>",
  showTagline: true,
  copyrightHtml:
    "<p>© {year} {companyName}. All artwork on this site is copyrighted unless otherwise indicated. All rights reserved.</p>",
  showCopyright: true,
  showBuilderCredit: true,
  builderCreditPrefix: "Website by",
  showNavLinks: true,
  showShopLink: true,
  showAboutLink: true,
  showBuilderCreditLink: true,
  showAdminLink: true,
};
