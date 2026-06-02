-- CreateEnum
CREATE TYPE "SupportMessageSender" AS ENUM ('CUSTOMER', 'ADMIN');

-- AlterEnum
ALTER TYPE "PaneType" ADD VALUE 'SOCIAL_LINKS';

-- CreateTable
CREATE TABLE "support_threads" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "adminLastReadAt" TIMESTAMP(3),
    "customerLastReadAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_messages" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "sender" "SupportMessageSender" NOT NULL,
    "body" TEXT NOT NULL,
    "readByAdminAt" TIMESTAMP(3),
    "readByCustomerAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "support_threads_customerId_key" ON "support_threads"("customerId");

-- CreateIndex
CREATE INDEX "support_messages_threadId_createdAt_idx" ON "support_messages"("threadId", "createdAt");

-- AddForeignKey
ALTER TABLE "support_threads" ADD CONSTRAINT "support_threads_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "support_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
