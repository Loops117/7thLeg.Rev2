-- Label template v2: margin, canvas height, base layout transforms, border JSON.
ALTER TABLE "label_templates" ADD COLUMN IF NOT EXISTS "margin_px" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "label_templates" ADD COLUMN IF NOT EXISTS "canvas_height_px" INTEGER;

UPDATE "label_templates"
SET "canvas_height_px" = GREATEST(
  1,
  ROUND("canvas_width_px"::numeric * "height_mm"::numeric / NULLIF("width_mm", 0))
)
WHERE "canvas_height_px" IS NULL;

UPDATE "label_templates" SET "canvas_height_px" = 591 WHERE "canvas_height_px" IS NULL;

ALTER TABLE "label_templates" ALTER COLUMN "canvas_height_px" SET NOT NULL;

ALTER TABLE "label_templates" ADD COLUMN IF NOT EXISTS "base_layout_scale_percent" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "label_templates" ADD COLUMN IF NOT EXISTS "base_layout_rotation_deg" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "label_templates" ADD COLUMN IF NOT EXISTS "base_layout_opacity_percent" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "label_templates" ADD COLUMN IF NOT EXISTS "border_config_json" JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Normalize canvas from mm @ 300 DPI (matches app `LABEL_TEMPLATE_DESIGN_DPI`).
UPDATE "label_templates"
SET
  "canvas_width_px" = GREATEST(1, ROUND("width_mm"::numeric / 25.4 * 300)),
  "canvas_height_px" = GREATEST(1, ROUND("height_mm"::numeric / 25.4 * 300));
