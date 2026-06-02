-- New templates default to 20px non-editable margin (existing rows unchanged).
ALTER TABLE "label_templates" ALTER COLUMN "margin_px" SET DEFAULT 20;
