-- AlterTable
ALTER TABLE "site_config" ADD COLUMN "site_link_preview_title" TEXT NOT NULL DEFAULT '';
ALTER TABLE "site_config" ADD COLUMN "site_link_preview_description" TEXT NOT NULL DEFAULT '';
