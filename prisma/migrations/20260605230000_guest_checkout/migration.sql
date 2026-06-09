-- AlterTable
ALTER TABLE "site_config" ADD COLUMN "guest_checkout_enabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "guest_session_id" TEXT;
ALTER TABLE "orders" ADD COLUMN "guest_email" TEXT;
ALTER TABLE "orders" ADD COLUMN "guest_display_name" TEXT;
ALTER TABLE "orders" ADD COLUMN "guest_address_line1" TEXT;
ALTER TABLE "orders" ADD COLUMN "guest_address_line2" TEXT;
ALTER TABLE "orders" ADD COLUMN "guest_city" TEXT;
ALTER TABLE "orders" ADD COLUMN "guest_state_region" TEXT;
ALTER TABLE "orders" ADD COLUMN "guest_postal_code" TEXT;
ALTER TABLE "orders" ADD COLUMN "guest_country" TEXT;
ALTER TABLE "orders" ADD COLUMN "loyalty_earn_awarded_at" TIMESTAMP(3);

CREATE INDEX "orders_guest_email_idx" ON "orders"("guest_email");
