-- Loyalty redemption: value per point, cart selection, order snapshot + deduction on pay.

ALTER TABLE "site_config" ADD COLUMN "loyalty_redemption_cents_per_point" INTEGER NOT NULL DEFAULT 10;

ALTER TABLE "carts" ADD COLUMN "applied_loyalty_points" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "orders" ADD COLUMN "loyalty_points_redeemed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN "loyalty_redemption_discount_cents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN "loyalty_redemption_cents_per_point_snap" INTEGER NOT NULL DEFAULT 0;
