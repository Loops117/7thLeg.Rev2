import Link from "next/link";
import { InBreedingSettingsEditor } from "@/components/settings/in-breeding-settings-editor";
import { StorefrontNavHeaderPanel } from "@/components/settings/storefront-nav-header-panel";
import { getInBreedingPageSettings } from "@/lib/in-breeding-settings";
import { getStorefrontNavSettings } from "@/lib/storefront-nav-settings";

export default async function SettingsInBreedingPage() {
  const [settings, nav] = await Promise.all([getInBreedingPageSettings(), getStorefrontNavSettings()]);

  return (
    <div>
      <StorefrontNavHeaderPanel linkId="inBreeding" initial={nav.inBreeding} />
      <h1 className="border-b-4 border-palm pb-3 text-2xl font-black text-palm">In Breeding</h1>
      <p className="mt-4 text-ink/80">
        Control the public{" "}
        <Link href="/in-breeding" className="font-medium text-lagoon-dark underline">
          in breeding page
        </Link>
        . Lists every active product with the <strong>In breeding</strong> flag from{" "}
        <Link href="/settings/products" className="font-medium text-lagoon-dark underline">
          Catalog
        </Link>
        .
      </p>
      <div className="mt-6">
        <InBreedingSettingsEditor initial={settings} />
      </div>
    </div>
  );
}
