-- AlterTable
ALTER TABLE "customer_art_submissions" ADD COLUMN "customer_removed_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "customer_art_submissions_customer_removed_at_idx" ON "customer_art_submissions"("customer_removed_at");
