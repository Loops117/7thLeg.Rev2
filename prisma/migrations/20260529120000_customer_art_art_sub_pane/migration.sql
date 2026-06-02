-- AlterEnum
ALTER TYPE "PaneType" ADD VALUE 'ART_SUB';

-- CreateTable
CREATE TABLE "customer_art_submissions" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "art_group" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_art_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_art_submissions_art_group_created_at_idx" ON "customer_art_submissions"("art_group", "created_at" DESC);

-- CreateIndex
CREATE INDEX "customer_art_submissions_customer_id_created_at_idx" ON "customer_art_submissions"("customer_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "customer_art_submissions_approved_idx" ON "customer_art_submissions"("approved");

-- AddForeignKey
ALTER TABLE "customer_art_submissions" ADD CONSTRAINT "customer_art_submissions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
