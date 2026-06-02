import Link from "next/link";
import { SiteFooterSettingsEditor } from "@/components/settings/site-footer-settings-editor";
import { getSiteFooterSettings } from "@/lib/site-footer-settings";

export default async function SettingsSiteFooterPage() {
  const initial = await getSiteFooterSettings();

  return (
    <div className="max-w-3xl">
      <h1 className="border-b-4 border-palm pb-3 text-2xl font-black text-palm">Site Footer</h1>
      <p className="mt-4 text-ink/80">
        Edit the public footer at the bottom of customer-facing pages. Preview on{" "}
        <Link href="/" className="font-medium text-lagoon-dark underline">
          Home
        </Link>
        .
      </p>
      <div className="mt-8">
        <SiteFooterSettingsEditor initial={initial} />
      </div>
    </div>
  );
}
