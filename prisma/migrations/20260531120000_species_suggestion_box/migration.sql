-- AlterEnum
ALTER TYPE "PaneType" ADD VALUE 'SUGGESTION_BOX';

-- CreateEnum
CREATE TYPE "SpeciesSuggestionStatus" AS ENUM ('PENDING', 'APPROVED', 'REMOVED');

-- CreateTable
CREATE TABLE "species_suggestions" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "normalized_key" TEXT NOT NULL,
    "status" "SpeciesSuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "first_suggested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "suggestion_count" INTEGER NOT NULL DEFAULT 1,
    "approved_at" TIMESTAMP(3),
    "removed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "species_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "species_suggestion_votes" (
    "id" TEXT NOT NULL,
    "suggestion_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "species_suggestion_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "species_suggestions_normalized_key_key" ON "species_suggestions"("normalized_key");

-- CreateIndex
CREATE INDEX "species_suggestions_status_first_suggested_at_idx" ON "species_suggestions"("status", "first_suggested_at" DESC);

-- CreateIndex
CREATE INDEX "species_suggestions_status_approved_at_idx" ON "species_suggestions"("status", "approved_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "species_suggestion_votes_suggestion_id_customer_id_key" ON "species_suggestion_votes"("suggestion_id", "customer_id");

-- CreateIndex
CREATE INDEX "species_suggestion_votes_customer_id_idx" ON "species_suggestion_votes"("customer_id");

-- AddForeignKey
ALTER TABLE "species_suggestion_votes" ADD CONSTRAINT "species_suggestion_votes_suggestion_id_fkey" FOREIGN KEY ("suggestion_id") REFERENCES "species_suggestions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "species_suggestion_votes" ADD CONSTRAINT "species_suggestion_votes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
