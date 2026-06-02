-- CreateEnum
CREATE TYPE "QrRedirectTarget" AS ENUM ('HOME', 'STORE', 'FEATURED', 'ABOUT', 'CART', 'ACCOUNT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "QrStyle" AS ENUM ('CLASSIC', 'SOFT', 'INVERTED');

-- CreateTable
CREATE TABLE "qr_redirects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "publicCode" TEXT NOT NULL,
    "target" "QrRedirectTarget" NOT NULL,
    "customUrl" TEXT NOT NULL DEFAULT '',
    "visitCount" INTEGER NOT NULL DEFAULT 0,
    "style" "QrStyle" NOT NULL DEFAULT 'CLASSIC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qr_redirects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "qr_redirects_publicCode_key" ON "qr_redirects"("publicCode");
