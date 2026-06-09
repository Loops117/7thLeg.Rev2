ALTER TABLE "site_config"
ADD COLUMN "seo_indexing_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "google_site_verification" TEXT NOT NULL DEFAULT '',
ADD COLUMN "seo_store_meta_title" TEXT NOT NULL DEFAULT '',
ADD COLUMN "seo_store_meta_description" TEXT NOT NULL DEFAULT '';
