-- Product type display order (admin + storefront filters)
ALTER TABLE "product_types" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;

WITH ordered AS (
  SELECT id, (ROW_NUMBER() OVER (ORDER BY name ASC) - 1)::INTEGER AS rn
  FROM "product_types"
)
UPDATE "product_types" pt
SET "sort_order" = ordered.rn
FROM ordered
WHERE pt.id = ordered.id;

CREATE INDEX "product_types_sort_order_idx" ON "product_types"("sort_order");
