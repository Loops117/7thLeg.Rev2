-- AlterTable
ALTER TABLE "customers" ADD COLUMN "species_list_share_token" TEXT;
ALTER TABLE "customers" ADD COLUMN "species_list_public_enabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX "customers_species_list_share_token_key" ON "customers"("species_list_share_token");

-- CreateTable
CREATE TABLE "customer_species_entries" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "morph_name" TEXT NOT NULL DEFAULT '',
    "common_name" TEXT NOT NULL DEFAULT '',
    "date_obtained" DATE,
    "source" TEXT NOT NULL DEFAULT '',
    "price_cents" INTEGER,
    "acquisition_notes" TEXT NOT NULL DEFAULT '',
    "available" BOOLEAN NOT NULL DEFAULT false,
    "availability_notes" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_species_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_species_entries_customer_id_species_idx" ON "customer_species_entries"("customer_id", "species");

-- AddForeignKey
ALTER TABLE "customer_species_entries" ADD CONSTRAINT "customer_species_entries_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
