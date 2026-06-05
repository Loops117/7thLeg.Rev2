-- AlterTable: replace Resend with Microsoft 365 SMTP settings
ALTER TABLE "site_config" DROP COLUMN IF EXISTS "resend_api_key";
ALTER TABLE "site_config" ADD COLUMN "smtp_host" TEXT NOT NULL DEFAULT 'smtp.office365.com';
ALTER TABLE "site_config" ADD COLUMN "smtp_port" INTEGER NOT NULL DEFAULT 587;
ALTER TABLE "site_config" ADD COLUMN "smtp_user" TEXT NOT NULL DEFAULT '';
ALTER TABLE "site_config" ADD COLUMN "smtp_password" TEXT NOT NULL DEFAULT '';
