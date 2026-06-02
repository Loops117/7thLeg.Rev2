-- QR: module/frame shapes, center image options; site default center image.

CREATE TYPE "QrModuleShape" AS ENUM ('SQUARE', 'DOT', 'ROUNDED_SQUARE');

CREATE TYPE "QrFrameShape" AS ENUM ('SQUARE', 'CIRCLE');

ALTER TABLE "site_config" ADD COLUMN "qr_default_center_image_url" TEXT NOT NULL DEFAULT '';

ALTER TABLE "qr_redirects" ADD COLUMN "module_shape" "QrModuleShape" NOT NULL DEFAULT 'SQUARE';
ALTER TABLE "qr_redirects" ADD COLUMN "frame_shape" "QrFrameShape" NOT NULL DEFAULT 'SQUARE';
ALTER TABLE "qr_redirects" ADD COLUMN "center_use_color" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "qr_redirects" ADD COLUMN "center_image_url" TEXT NOT NULL DEFAULT '';
