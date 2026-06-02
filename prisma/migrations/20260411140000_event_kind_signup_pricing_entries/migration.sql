-- CreateEnum
CREATE TYPE "EventKind" AS ENUM ('TIMED', 'SIGNUP');

-- CreateEnum
CREATE TYPE "EventSaleDiscountMode" AS ENUM ('NONE', 'PERCENT', 'FIXED_CENTS');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "kind" "EventKind" NOT NULL DEFAULT 'TIMED',
ADD COLUMN     "pointsPerDollarOverride" INTEGER,
ADD COLUMN     "saleDiscountCents" INTEGER,
ADD COLUMN     "saleDiscountMode" "EventSaleDiscountMode" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "saleDiscountPercent" INTEGER,
ADD COLUMN     "signupButtonLabel" TEXT NOT NULL DEFAULT 'Sign up',
ALTER COLUMN "details" SET DEFAULT '';

-- CreateTable
CREATE TABLE "event_entries" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "customerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_entries_eventId_createdAt_idx" ON "event_entries"("eventId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "event_entries_eventId_email_key" ON "event_entries"("eventId", "email");

-- AddForeignKey
ALTER TABLE "event_entries" ADD CONSTRAINT "event_entries_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_entries" ADD CONSTRAINT "event_entries_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
