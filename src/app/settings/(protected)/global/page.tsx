import Link from "next/link";
import { GlobalSettingsEditor } from "@/components/settings/global-settings-editor";
import { getGlobalSettingsForAdmin } from "@/lib/site-config";

export default async function SettingsGlobalPage() {
  const initial = await getGlobalSettingsForAdmin();

  return (
    <div>
      <h1 className="border-b-4 border-palm pb-3 text-2xl font-black text-palm">Global</h1>
      <p className="mt-4 text-ink/80">
        <strong>Company name</strong> appears in the public site header. <strong>Browser icon &amp; link previews</strong>{" "}
        sets favicons and share images; <strong>Link preview text</strong> sets the title and description in those cards.
        For loyalty program rules and member points, see{" "}
        <Link href="/settings/loyalty" className="font-medium text-lagoon-dark underline">
          Loyalty
        </Link>
        .
      </p>
      <p className="mt-2 text-sm text-ink/70">
        Open the storefront:{" "}
        <Link href="/" className="font-medium text-lagoon-dark underline">
          Home
        </Link>
      </p>

      <div className="mt-8">
        <GlobalSettingsEditor initial={initial} />
      </div>
    </div>
  );
}
