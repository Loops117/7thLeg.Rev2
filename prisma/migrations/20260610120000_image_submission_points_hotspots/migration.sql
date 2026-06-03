-- Image submission approval points, ledger link, product hotspots
ALTER TABLE "site_config" ADD COLUMN "image_submission_approval_points" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "customer_art_submissions" ADD COLUMN "approval_points_awarded_at" TIMESTAMP(3);

ALTER TABLE "points_ledger" ADD COLUMN "art_submission_id" TEXT;

CREATE TABLE "image_submission_hotspots" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "variant_id" TEXT,
    "x_percent" DOUBLE PRECISION NOT NULL,
    "y_percent" DOUBLE PRECISION NOT NULL,
    "width_percent" DOUBLE PRECISION NOT NULL,
    "height_percent" DOUBLE PRECISION NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "image_submission_hotspots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "image_submission_hotspots_submission_id_sort_order_idx" ON "image_submission_hotspots"("submission_id", "sort_order");
CREATE INDEX "image_submission_hotspots_product_id_idx" ON "image_submission_hotspots"("product_id");

ALTER TABLE "image_submission_hotspots" ADD CONSTRAINT "image_submission_hotspots_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "customer_art_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "image_submission_hotspots" ADD CONSTRAINT "image_submission_hotspots_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "image_submission_hotspots" ADD CONSTRAINT "image_submission_hotspots_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_art_submission_id_fkey" FOREIGN KEY ("art_submission_id") REFERENCES "customer_art_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "points_ledger_art_submission_id_idx" ON "points_ledger"("art_submission_id");
