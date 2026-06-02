-- Position offset for base layout image (design px); draggable in admin preview.
ALTER TABLE "label_templates" ADD COLUMN "base_layout_offset_x_px" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "label_templates" ADD COLUMN "base_layout_offset_y_px" INTEGER NOT NULL DEFAULT 0;
