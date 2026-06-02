ALTER TABLE "site_config" ADD COLUMN IF NOT EXISTS "store_watermark_name_gap_px" INTEGER NOT NULL DEFAULT 8;
