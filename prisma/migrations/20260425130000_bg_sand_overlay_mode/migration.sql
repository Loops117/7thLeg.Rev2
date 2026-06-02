-- solid | diagonal — what the top "sand" layer draws (obscures stickers)
ALTER TABLE "site_config" ADD COLUMN IF NOT EXISTS "bg_sand_overlay_mode" TEXT NOT NULL DEFAULT 'diagonal';
