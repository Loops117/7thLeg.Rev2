-- Store-name anti-theft overlay font sizes (scattered vs continuous)
ALTER TABLE "site_config" ADD COLUMN IF NOT EXISTS "store_watermark_scattered_font_px" INTEGER NOT NULL DEFAULT 15;
ALTER TABLE "site_config" ADD COLUMN IF NOT EXISTS "store_watermark_continuous_font_px" INTEGER NOT NULL DEFAULT 15;
