-- Public label builder: nav + /labels when enabled (admin Settings → Labels).
ALTER TABLE "site_config" ADD COLUMN "label_builder_enabled" BOOLEAN NOT NULL DEFAULT false;
