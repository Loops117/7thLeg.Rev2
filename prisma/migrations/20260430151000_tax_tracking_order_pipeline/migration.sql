-- CreateEnum
CREATE TYPE "TrackingCarrier" AS ENUM ('NONE', 'USPS', 'UPS', 'FEDEX', 'DHL', 'OTHER');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "tracking_carrier" "TrackingCarrier" NOT NULL DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "site_config" ADD COLUMN "checkout_tax_rate_bps" INTEGER NOT NULL DEFAULT 0;

-- AlterEnum (PostgreSQL: new values appended; SAFE for concurrent readers)
ALTER TYPE "OrderStatus" ADD VALUE 'ACCEPTED';
ALTER TYPE "OrderStatus" ADD VALUE 'SHIPPED';
ALTER TYPE "OrderStatus" ADD VALUE 'COMPLETE';
