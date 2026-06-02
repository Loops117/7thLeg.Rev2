-- AlterTable
ALTER TABLE "site_config" ADD COLUMN "label_preview_watermark_kind" TEXT NOT NULL DEFAULT 'global';
ALTER TABLE "site_config" ADD COLUMN "label_preview_watermark_image_url" TEXT NOT NULL DEFAULT '';
ALTER TABLE "site_config" ADD COLUMN "label_preview_watermark_placement" TEXT NOT NULL DEFAULT 'bottomRight';
ALTER TABLE "site_config" ADD COLUMN "label_preview_watermark_opacity_percent" INTEGER NOT NULL DEFAULT 38;
ALTER TABLE "site_config" ADD COLUMN "label_preview_watermark_scale_percent" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "site_config" ADD COLUMN "label_preview_watermark_text" TEXT NOT NULL DEFAULT 'This is a preview';
