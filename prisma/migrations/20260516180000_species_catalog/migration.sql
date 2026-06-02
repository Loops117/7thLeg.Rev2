-- CreateTable
CREATE TABLE "species_catalog_entries" (
    "id" TEXT NOT NULL,
    "genus" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "common_name" TEXT NOT NULL DEFAULT '',
    "morph" TEXT NOT NULL DEFAULT '',
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "species_catalog_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "species_catalog_entries_genus_idx" ON "species_catalog_entries"("genus");

-- CreateIndex
CREATE INDEX "species_catalog_entries_species_idx" ON "species_catalog_entries"("species");

-- CreateIndex
CREATE INDEX "species_catalog_entries_approved_idx" ON "species_catalog_entries"("approved");

-- CreateIndex
CREATE INDEX "species_catalog_entries_created_at_idx" ON "species_catalog_entries"("created_at");
