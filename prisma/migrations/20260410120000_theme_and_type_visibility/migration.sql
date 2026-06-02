-- AlterTable
ALTER TABLE "site_config" ADD COLUMN IF NOT EXISTS "themeConfig" JSONB;

-- AlterTable
ALTER TABLE "product_types" ADD COLUMN IF NOT EXISTS "storefrontVisible" BOOLEAN NOT NULL DEFAULT true;
