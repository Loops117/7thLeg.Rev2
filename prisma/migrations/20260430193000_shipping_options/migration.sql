-- CreateTable
CREATE TABLE "shipping_options" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "priceCents" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_options_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "carts" ADD COLUMN "selectedShippingOptionId" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "shippingOptionId" TEXT,
ADD COLUMN "shippingLabelSnap" TEXT NOT NULL DEFAULT '';

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_selectedShippingOptionId_fkey" FOREIGN KEY ("selectedShippingOptionId") REFERENCES "shipping_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_shippingOptionId_fkey" FOREIGN KEY ("shippingOptionId") REFERENCES "shipping_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;
