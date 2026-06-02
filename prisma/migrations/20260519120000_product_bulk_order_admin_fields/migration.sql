-- Product bulk pricing tiers (same shape as label templates: [{ minQty, unitCents }]).
ALTER TABLE "products" ADD COLUMN "price_tiers_json" JSONB;

-- Admin sales archive + pick checklist (visual only).
ALTER TABLE "orders" ADD COLUMN "archived_at" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN "admin_pick_checks_json" JSONB NOT NULL DEFAULT '{}';

CREATE INDEX "orders_archived_at_idx" ON "orders"("archived_at");
