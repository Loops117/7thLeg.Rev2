-- AlterTable
ALTER TABLE "species_catalog_entries" ADD COLUMN "type" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "species_catalog_entries_type_idx" ON "species_catalog_entries"("type");
