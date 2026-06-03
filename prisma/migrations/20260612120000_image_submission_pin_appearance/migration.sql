ALTER TABLE "site_config" ADD COLUMN "image_submission_pin_size_px" INTEGER NOT NULL DEFAULT 20;
ALTER TABLE "site_config" ADD COLUMN "image_submission_pin_fill_color" TEXT NOT NULL DEFAULT '#2d6a4f';
ALTER TABLE "site_config" ADD COLUMN "image_submission_pin_border_width_px" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "site_config" ADD COLUMN "image_submission_pin_border_color" TEXT NOT NULL DEFAULT '#000000';
ALTER TABLE "site_config" ADD COLUMN "image_submission_pin_custom_image_url" TEXT NOT NULL DEFAULT '';
