-- Label editor in-app guide + tour copy (admin-editable JSON)
ALTER TABLE "site_config" ADD COLUMN IF NOT EXISTS "label_editor_help_json" TEXT;
