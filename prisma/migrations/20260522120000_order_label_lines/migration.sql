-- CreateTable
CREATE TABLE "order_label_lines" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
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
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "order_label_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_label_lines_order_id_idx" ON "order_label_lines"("order_id");

-- AddForeignKey
ALTER TABLE "order_label_lines" ADD CONSTRAINT "order_label_lines_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_label_lines" ADD CONSTRAINT "order_label_lines_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "label_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
