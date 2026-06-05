-- AlterTable
ALTER TABLE "site_config" ADD COLUMN "resend_api_key" TEXT NOT NULL DEFAULT '';
ALTER TABLE "site_config" ADD COLUMN "email_from_address" TEXT NOT NULL DEFAULT '';
