import Link from "next/link";
import { StorefrontNavHeaderPanel } from "@/components/settings/storefront-nav-header-panel";
import { StoreSettingsEditor } from "@/components/settings/store-settings-editor";
import { getStorefrontNavSettings } from "@/lib/storefront-nav-settings";
import { getStoreSettings } from "@/lib/store-settings";

export default async function SettingsStorePage() {
  const [store, nav] = await Promise.all([getStoreSettings(), getStorefrontNavSettings()]);

  return (
    <div>
      <StorefrontNavHeaderPanel linkId="shop" initial={nav.shop} />
      <h1 className="border-b-4 border-palm pb-3 text-2xl font-black text-palm">Store settings</h1>
      <p className="mt-4 text-ink/80">
        Banner, featured strip, product card hover, and footer are saved to <strong>site_config</strong> and show on the{" "}
        <Link href="/store" className="font-medium text-lagoon-dark underline">
          public store page
        </Link>{" "}
        when enabled.
      </p>
      <p className="mt-3 text-sm text-ink/70">
        Add inventory under{" "}
        <Link href="/settings/products" className="font-medium text-lagoon-dark underline">
          Products
        </Link>
        .
      </p>
      <div className="mt-6">
        <StoreSettingsEditor initial={store} />
      </div>
    </div>
  );
}
