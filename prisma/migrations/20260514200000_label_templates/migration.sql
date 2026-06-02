CREATE TABLE "label_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "width_mm" INTEGER NOT NULL,
    "height_mm" INTEGER NOT NULL,
    "canvas_width_px" INTEGER NOT NULL DEFAULT 1200,
    "grid_step_px" INTEGER NOT NULL DEFAULT 8,
    "max_elements" INTEGER NOT NULL DEFAULT 24,
    "price_tiers_json" JSONB NOT NULL,
    "base_layout_image_url" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "label_templates_pkey" PRIMARY KEY ("id")
);
