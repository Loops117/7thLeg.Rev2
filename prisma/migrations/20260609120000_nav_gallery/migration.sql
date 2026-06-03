-- Header nav: Gallery visibility and custom label
ALTER TABLE "site_config" ADD COLUMN "nav_gallery_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "site_config" ADD COLUMN "nav_gallery_label" TEXT NOT NULL DEFAULT 'Gallery';
