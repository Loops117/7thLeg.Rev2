-- Split label builder route from public header nav (Settings → Labels → Storefront).
ALTER TABLE "site_config" ADD COLUMN "label_builder_nav_enabled" BOOLEAN NOT NULL DEFAULT true;
