import { ProductReviewsAdmin } from "@/components/settings/product-reviews-admin";
import {
  getProductReviewsSettings,
  listProductReviewsForAdmin,
} from "@/app/actions/product-reviews-admin";

export default async function ProductReviewsSettingsPage() {
  const [rows, settings] = await Promise.all([listProductReviewsForAdmin(), getProductReviewsSettings()]);

  return (
    <div className="max-w-5xl">
      <h1 className="border-b-4 border-palm pb-3 text-2xl font-black text-palm">Reviews</h1>
      <p className="mt-4 max-w-2xl text-ink/80">
        Moderate customer reviews, import legacy testimonials, and configure the post-purchase review request email.
        Reviews can be tied to a product or left as general store feedback. Approved reviews appear on product pages
        (when linked) and in <strong>Reviews</strong> panes on the home and about pages.
      </p>
      <div className="mt-6">
        <ProductReviewsAdmin initialRows={rows} initialSettings={settings} />
      </div>
    </div>
  );
}
