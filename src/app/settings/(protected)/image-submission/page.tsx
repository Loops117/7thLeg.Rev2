import Link from "next/link";
import { getImageSubmissionSettingsForAdmin } from "@/app/actions/image-submission-settings";
import { ImageSubmissionAdmin } from "@/components/settings/image-submission-admin";
import { ImageSubmissionSettingsPanel } from "@/components/settings/image-submission-settings-panel";
import { StorefrontNavHeaderPanel } from "@/components/settings/storefront-nav-header-panel";
import {
  listCustomerArtSubmissionsForAdmin,
  listDistinctCustomerArtGroups,
} from "@/app/actions/customer-art";
import { btnMainMd } from "@/lib/btn-theme-classes";
import { getStorefrontNavSettings } from "@/lib/storefront-nav-settings";

export default async function ImageSubmissionSettingsPage() {
  const [rows, artGroups, nav, submissionSettings] = await Promise.all([
    listCustomerArtSubmissionsForAdmin(),
    listDistinctCustomerArtGroups(),
    getStorefrontNavSettings(),
    getImageSubmissionSettingsForAdmin(),
  ]);

  return (
    <div className="max-w-5xl">
      <StorefrontNavHeaderPanel linkId="gallery" initial={nav.gallery} collapsible />
      <ImageSubmissionSettingsPanel
        initialApprovalPoints={submissionSettings.approvalPoints}
        initialPinAppearance={submissionSettings.pinAppearance}
      />
      <h1 className="border-b-4 border-palm pb-3 text-2xl font-black text-palm">Image Submission</h1>
      <p className="mt-4 max-w-2xl text-ink/80">
        Review customer photos from <strong>Art Sub</strong> upload panes. Approved images appear on the public{" "}
        <strong>Gallery</strong> page. Place <strong>product pins</strong> on approved images to link variations shoppers
        can click from the gallery.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Link href="/gallery" className={btnMainMd}>
          View Gallery on the site
        </Link>
        <Link
          href="/settings/home"
          className="inline-flex items-center justify-center rounded border-2 border-lagoon-dark bg-surf px-4 py-3 text-center text-sm font-bold text-palm hover:bg-lagoon/20"
        >
          Home panes
        </Link>
      </div>
      <div className="mt-10">
        <h2 className="mb-4 text-lg font-black text-palm">Submissions</h2>
        <ImageSubmissionAdmin
          initialRows={rows}
          artGroups={artGroups}
          pinAppearance={submissionSettings.pinAppearance}
        />
      </div>
    </div>
  );
}
