ALTER TABLE "site_config"
ADD COLUMN "watermark_placement" TEXT NOT NULL DEFAULT 'bottomRight',
ADD COLUMN "watermark_opacity_percent" INTEGER NOT NULL DEFAULT 38,
ADD COLUMN "product_diagonal_name_gap_px" INTEGER NOT NULL DEFAULT 8;
