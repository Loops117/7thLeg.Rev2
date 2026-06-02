-- Idempotent DDL (repair + fresh environments). Earlier migration slot was accidentally empty.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'EventKind' AND e.enumlabel = 'COUPON'
  ) THEN
    ALTER TYPE "EventKind" ADD VALUE 'COUPON';
  END IF;
END $$;

ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "couponCode" TEXT NOT NULL DEFAULT '';
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "couponPickerMeansIncluded" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "checkoutCouponCodeSnap" TEXT NOT NULL DEFAULT '';
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "checkoutCouponDiscountCents" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "carts" ADD COLUMN IF NOT EXISTS "appliedCouponEventId" TEXT;

ALTER TABLE "cart_items" ADD COLUMN IF NOT EXISTS "timedSaleEventId" TEXT;
ALTER TABLE "cart_items" ADD COLUMN IF NOT EXISTS "pricingScopeKey" TEXT NOT NULL DEFAULT '__none__';
UPDATE "cart_items" SET "pricingScopeKey" = '__none__' WHERE "pricingScopeKey" IS NULL OR trim("pricingScopeKey") = '';

DROP INDEX IF EXISTS "cart_items_cartId_productId_variantId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "cart_items_cartId_productId_variantId_pricingScopeKey_key" ON "cart_items"("cartId", "productId", "variantId", "pricingScopeKey");

DO $$ BEGIN
  ALTER TABLE "carts" ADD CONSTRAINT "carts_appliedCouponEventId_fkey" FOREIGN KEY ("appliedCouponEventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_timedSaleEventId_fkey" FOREIGN KEY ("timedSaleEventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "event_coupon_product_picks" (
    "eventId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    CONSTRAINT "event_coupon_product_picks_pkey" PRIMARY KEY ("eventId","productId")
);

DO $$ BEGIN
  ALTER TABLE "event_coupon_product_picks" ADD CONSTRAINT "event_coupon_product_picks_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "event_coupon_product_picks" ADD CONSTRAINT "event_coupon_product_picks_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
