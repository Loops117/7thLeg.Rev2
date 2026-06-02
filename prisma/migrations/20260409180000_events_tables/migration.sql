-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_on_product_types" (
    "eventId" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,

    CONSTRAINT "event_on_product_types_pkey" PRIMARY KEY ("eventId","typeId")
);

-- CreateTable
CREATE TABLE "event_on_products" (
    "eventId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "event_on_products_pkey" PRIMARY KEY ("eventId","productId")
);

-- AddForeignKey
ALTER TABLE "event_on_product_types" ADD CONSTRAINT "event_on_product_types_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_on_product_types" ADD CONSTRAINT "event_on_product_types_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "product_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_on_products" ADD CONSTRAINT "event_on_products_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_on_products" ADD CONSTRAINT "event_on_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
