import Link from "next/link";
import { auth } from "@/auth";
import { PublicImageGallery } from "@/components/gallery/public-image-gallery";
import { listAllApprovedArtForPublicGallery } from "@/lib/customer-art-gallery";
import { listHotspotsBySubmissionIds } from "@/lib/image-submission-hotspots";
import { getImageSubmissionPinAppearance } from "@/lib/image-submission-pin-appearance";
import { getSiteConfig } from "@/lib/site-config";

export default async function GalleryPage() {
  const [items, site, pinAppearance, session] = await Promise.all([
    listAllApprovedArtForPublicGallery(),
    getSiteConfig(),
    getImageSubmissionPinAppearance(),
    auth(),
  ]);
  const isLoggedIn = session?.user?.role === "customer";
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
        Photos shared by our community. Upload your own or browse approved submissions from across the site.
      </p>
      <div className="mt-8">
        <PublicImageGallery
          items={items}
          pinsBySubmissionId={pinsBySubmissionId}
          pinAppearance={pinAppearance}
          isLoggedIn={isLoggedIn}
        />
      </div>
    </div>
  );
}
