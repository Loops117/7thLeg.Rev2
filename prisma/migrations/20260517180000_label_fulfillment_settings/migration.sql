-- AlterTable
ALTER TABLE "site_config" ADD COLUMN "label_fulfillment_show_on_orders" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "site_config" ADD COLUMN "label_fulfillment_save_layouts" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "site_config" ADD COLUMN "label_fulfillment_allow_reorder" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "site_config" ADD COLUMN "label_fulfillment_export_pdf" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "site_config" ADD COLUMN "label_fulfillment_export_raster" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "site_config" ADD COLUMN "label_fulfillment_print_dpi" INTEGER NOT NULL DEFAULT 300;
ALTER TABLE "site_config" ADD COLUMN "label_fulfillment_sheet_format" TEXT NOT NULL DEFAULT 'letter';
ALTER TABLE "site_config" ADD COLUMN "label_fulfillment_sheet_margin_mm" DOUBLE PRECISION NOT NULL DEFAULT 12.7;
ALTER TABLE "site_config" ADD COLUMN "label_fulfillment_label_gap_mm" DOUBLE PRECISION NOT NULL DEFAULT 2;
