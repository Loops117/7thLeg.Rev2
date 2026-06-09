import Link from "next/link";
import { SeoSettingsEditor } from "@/components/settings/seo-settings-editor";
import { getPublicAppOrigin } from "@/lib/public-app-origin";
import { getSeoAuditSnapshot, getSeoSettingsForAdmin } from "@/lib/site-config";

export default async function SettingsSeoPage() {
  const [initial, audit] = await Promise.all([getSeoSettingsForAdmin(), getSeoAuditSnapshot()]);
  const origin = getPublicAppOrigin();

  return (
    <div>
      <h1 className="border-b-4 border-palm pb-3 text-2xl font-black text-palm">SEO</h1>
      <p className="mt-4 text-ink/80">
        Control how your storefront appears in Google and when links are shared. The site now publishes a{" "}
        <a href={`${origin}/sitemap.xml`} className="font-medium text-lagoon-dark underline" target="_blank" rel="noreferrer">
          sitemap
        </a>{" "}
        and per-product page titles. Favicons and share images stay under{" "}
        <Link href="/settings/global" className="font-medium text-lagoon-dark underline">
          Global
        </Link>
        .
      </p>

      <div className="mt-8">
        <SeoSettingsEditor initial={initial} audit={audit} siteOrigin={origin} />
      </div>
    </div>
  );
}
