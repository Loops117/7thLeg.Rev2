-- Urgent home-page modal (dismiss to continue) + revision for re-showing after edits
ALTER TABLE "site_config" ADD COLUMN IF NOT EXISTS "homeUrgentNotificationEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "site_config" ADD COLUMN IF NOT EXISTS "homeUrgentNotificationTitle" TEXT NOT NULL DEFAULT '';
ALTER TABLE "site_config" ADD COLUMN IF NOT EXISTS "homeUrgentNotificationBody" TEXT NOT NULL DEFAULT '';
ALTER TABLE "site_config" ADD COLUMN IF NOT EXISTS "homeUrgentNotificationRevision" INTEGER NOT NULL DEFAULT 0;
