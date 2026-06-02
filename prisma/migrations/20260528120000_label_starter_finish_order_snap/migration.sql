-- AlterTable
ALTER TABLE "label_templates" ADD COLUMN "starter_document_json" JSONB;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "label_merchandise_cents_snap" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "label_finish_options" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group_name" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "price_delta_cents" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "label_finish_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "label_template_finish_options" (
    "template_id" TEXT NOT NULL,
    "finish_option_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "price_delta_cents" INTEGER,

    CONSTRAINT "label_template_finish_options_pkey" PRIMARY KEY ("template_id","finish_option_id")
);

-- CreateIndex
CREATE INDEX "label_finish_options_active_sort_order_idx" ON "label_finish_options"("active", "sort_order");

-- AddForeignKey
ALTER TABLE "label_template_finish_options" ADD CONSTRAINT "label_template_finish_options_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "label_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "label_template_finish_options" ADD CONSTRAINT "label_template_finish_options_finish_option_id_fkey" FOREIGN KEY ("finish_option_id") REFERENCES "label_finish_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;
