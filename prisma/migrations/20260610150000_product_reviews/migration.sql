-- CreateEnum
CREATE TYPE "ProductReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "PaneType" ADD VALUE 'REVIEWS';

-- AlterTable
ALTER TABLE "site_config"
ADD COLUMN "product_reviews_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "review_request_email_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "review_request_email_subject" TEXT NOT NULL DEFAULT 'How was your order?',
ADD COLUMN "review_request_email_body" TEXT NOT NULL DEFAULT 'Hi {{customerName}},

Thanks for your order! We''d love to hear what you think.

Leave a review: {{reviewUrl}}

— {{companyName}}';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "review_request_email_sent_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "product_reviews" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "author_display_name" TEXT NOT NULL DEFAULT '',
    "order_id" TEXT,
    "rating" INTEGER NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL,
    "status" "ProductReviewStatus" NOT NULL DEFAULT 'PENDING',
    "is_imported" BOOLEAN NOT NULL DEFAULT false,
    "approved_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_reviews_product_id_status_approved_at_idx" ON "product_reviews"("product_id", "status", "approved_at" DESC);

-- CreateIndex
CREATE INDEX "product_reviews_status_created_at_idx" ON "product_reviews"("status", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "product_reviews_product_id_customer_id_key" ON "product_reviews"("product_id", "customer_id");

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
