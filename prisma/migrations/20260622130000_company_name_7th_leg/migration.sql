ALTER TABLE "site_config" ALTER COLUMN "companyName" SET DEFAULT '7th Leg';

UPDATE "site_config"
SET "companyName" = '7th Leg'
WHERE "companyName" IN ('Inverts Oasis', 'Lemons');
