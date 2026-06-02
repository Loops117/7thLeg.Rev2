-- CreateTable
CREATE TABLE "customer_label_design_folders" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_label_design_folders_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "customer_label_designs" ADD COLUMN "folder_id" TEXT;

-- CreateTable
CREATE TABLE "cart_label_items" (
    "id" TEXT NOT NULL,
    "cart_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "saved_design_id" TEXT,
    "display_name" TEXT NOT NULL,
    "document_json" JSONB NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_cents" INTEGER NOT NULL,
    "line_total_cents" INTEGER NOT NULL,
    "data_row_label" TEXT,
    "width_mm" DOUBLE PRECISION NOT NULL,
    "height_mm" DOUBLE PRECISION NOT NULL,
    "labels_per_sheet" INTEGER NOT NULL,
    "sheets_count" INTEGER NOT NULL,
    "sheet_format" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cart_label_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_label_design_folders_customer_id_sort_order_idx" ON "customer_label_design_folders"("customer_id", "sort_order");

-- CreateIndex
CREATE INDEX "customer_label_designs_customer_id_folder_id_idx" ON "customer_label_designs"("customer_id", "folder_id");

-- CreateIndex
CREATE INDEX "cart_label_items_cart_id_idx" ON "cart_label_items"("cart_id");

-- AddForeignKey
ALTER TABLE "customer_label_design_folders" ADD CONSTRAINT "customer_label_design_folders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_label_designs" ADD CONSTRAINT "customer_label_designs_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "customer_label_design_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_label_items" ADD CONSTRAINT "cart_label_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_label_items" ADD CONSTRAINT "cart_label_items_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "label_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_label_items" ADD CONSTRAINT "cart_label_items_saved_design_id_fkey" FOREIGN KEY ("saved_design_id") REFERENCES "customer_label_designs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
