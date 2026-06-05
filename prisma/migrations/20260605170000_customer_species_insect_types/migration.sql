-- CreateTable
CREATE TABLE "customer_species_insect_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_species_insect_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_species_insect_types_name_key" ON "customer_species_insect_types"("name");

-- CreateIndex
CREATE INDEX "customer_species_insect_types_active_sort_order_idx" ON "customer_species_insect_types"("active", "sort_order");

-- Seed default insect types
INSERT INTO "customer_species_insect_types" ("id", "name", "sort_order", "active", "created_at", "updated_at") VALUES
    ('csit_beetle', 'Beetle', 10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('csit_butterfly_moth', 'Butterfly / Moth', 20, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('csit_stick', 'Stick insect', 30, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('csit_roach', 'Roach', 40, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('csit_other', 'Other', 100, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
