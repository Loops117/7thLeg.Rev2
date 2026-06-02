-- AlterTable
ALTER TABLE "site_config" ADD COLUMN IF NOT EXISTS "payment_stripe_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "site_config" ADD COLUMN IF NOT EXISTS "payment_square_enabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "square_payment_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "orders_square_payment_id_key" ON "orders"("square_payment_id");
