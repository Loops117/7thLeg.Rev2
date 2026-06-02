-- CreateTable
CREATE TABLE "label_sticker_assets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "label_sticker_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "label_sticker_assets_active_sort_order_idx" ON "label_sticker_assets"("active", "sort_order");
