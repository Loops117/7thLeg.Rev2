-- Floating tile opacity, independent of sand overlay (`bg_opacity_percent`).
ALTER TABLE "site_config" ADD COLUMN "bg_image_opacity_percent" INTEGER NOT NULL DEFAULT 85;
