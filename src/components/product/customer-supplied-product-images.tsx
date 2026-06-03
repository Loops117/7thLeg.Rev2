import Link from "next/link";
import type { CustomerSuppliedImageRow } from "@/lib/image-submission-hotspots";

export function CustomerSuppliedProductImages({ images }: { images: CustomerSuppliedImageRow[] }) {
  if (images.length === 0) return null;

  return (
    <section className="mt-10 border-t-2 border-palm/20 pt-8" aria-labelledby="customer-supplied-images-heading">
      <h2 id="customer-supplied-images-heading" className="text-lg font-black text-palm">
        Customer supplied product images
      </h2>
      <p className="mt-1 text-sm text-ink/75">Photos from our community that feature this product.</p>
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {images.map((img) => (
          <li key={img.submissionId}>
            <Link
              href="/gallery"
              className="block overflow-hidden rounded-lg border-2 border-palm/20 bg-zinc-100 shadow-sm transition hover:border-palm"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.imageUrl}
                alt={`Photo by ${img.artistName}`}
                className="aspect-[4/5] w-full object-contain p-1"
                loading="lazy"
              />
              <p className="truncate border-t border-palm/10 bg-white/90 px-2 py-1.5 text-center text-[10px] font-bold text-ink">
                {img.artistName}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
