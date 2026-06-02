-- Company branding and upload image normalization settings
ALTER TABLE "site_config" ADD COLUMN IF NOT EXISTS "companyLogoUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "site_config" ADD COLUMN IF NOT EXISTS "companyLogoPlacement" TEXT NOT NULL DEFAULT 'beside';
ALTER TABLE "site_config" ADD COLUMN IF NOT EXISTS "uploadImageMaxEdgePx" INTEGER NOT NULL DEFAULT 2400;
ALTER TABLE "site_config" ADD COLUMN IF NOT EXISTS "uploadImageJpegQuality" INTEGER NOT NULL DEFAULT 85;
