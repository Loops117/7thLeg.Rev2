import Link from "next/link";
import { auth as readAuthSession } from "@/auth";
import { listMyCustomerArtUploads } from "@/app/actions/customer-art";
import { CustomerMyUploadsGallery } from "@/components/account/customer-my-uploads-gallery";

export default async function AccountUploadsPage() {
  const session = await readAuthSession().catch(() => null);

  if (!session?.user) {
    return (
      <div className="p-6 sm:p-10">
        <h1 className="border-b-4 border-palm pb-4 text-2xl font-black text-palm">My Uploads</h1>
        <p className="mt-6 max-w-xl text-ink/85">
          <Link href="/login?callbackUrl=/account/uploads" className="font-bold text-lagoon-dark underline">
            Log in
          </Link>{" "}
          to view your artwork uploads.
        </p>
      </div>
    );
  }

  if (session.user.role !== "customer" || !session.user.id) {
    return (
      <div className="p-6 sm:p-10">
        <h1 className="border-b-4 border-palm pb-4 text-2xl font-black text-palm">My Uploads</h1>
        <p className="mt-6 text-ink/80">Customer account required.</p>
      </div>
    );
  }

  const uploads = await listMyCustomerArtUploads();

  return (
    <div className="p-6 sm:p-10">
      <h1 className="border-b-4 border-palm pb-4 text-2xl font-black text-palm">My Uploads</h1>
      <p className="mt-4 max-w-2xl text-sm text-ink/75">
        Artwork you&apos;ve submitted through the site. Approved pieces may appear in community galleries on the home
        page.
      </p>
      <CustomerMyUploadsGallery initialUploads={uploads} />
    </div>
  );
}
