import Link from "next/link";
import { PublicImageGallery } from "@/components/gallery/public-image-gallery";
import { listAllApprovedArtForPublicGallery } from "@/lib/customer-art-gallery";
import { listHotspotsBySubmissionIds } from "@/lib/image-submission-hotspots";
import { getImageSubmissionPinAppearance } from "@/lib/image-submission-pin-appearance";
import { getSiteConfig } from "@/lib/site-config";

export default async function GalleryPage() {
  const [items, site, pinAppearance] = await Promise.all([
    listAllApprovedArtForPublicGallery(),
    getSiteConfig(),
    getImageSubmissionPinAppearance(),
  ]);
  const pinsBySubmissionId = await listHotspotsBySubmissionIds(items.map((i) => i.id));
  const pageTitle = site.navGalleryLabel.trim() || "Gallery";

  return (
    <div className="p-6 sm:p-10">
      <p className="text-sm font-medium text-lagoon-dark">
        <Link href="/" className="underline">
          ← Home
        </Link>
      </p>
      <h1 className="mt-4 border-b-4 border-palm pb-3 text-3xl font-black text-palm">{pageTitle}</h1>
      <p className="mt-3 max-w-2xl text-ink/80">
        Photos shared by our community. Approved submissions from customer upload sections on the site.
      </p>
      <div className="mt-8">
        <PublicImageGallery
          items={items}
          pageTitle={pageTitle}
          pinsBySubmissionId={pinsBySubmissionId}
          pinAppearance={pinAppearance}
        />
      </div>
    </div>
  );
}
