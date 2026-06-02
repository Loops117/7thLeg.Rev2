-- Hierarchical product types (e.g. Live Inverts > Isopods > Cubaris sp.)
ALTER TABLE "product_types" ADD COLUMN "parent_id" TEXT;

ALTER TABLE "product_types"
  ADD CONSTRAINT "product_types_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "product_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "product_types_parent_id_idx" ON "product_types"("parent_id");
