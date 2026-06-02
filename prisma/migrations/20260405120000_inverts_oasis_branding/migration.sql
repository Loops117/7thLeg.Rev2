-- Default for new rows; existing shops still seeded via prisma/seed.ts
ALTER TABLE "site_config" ALTER COLUMN "companyName" SET DEFAULT 'Inverts Oasis';

-- One-time rename if the only row still has the old placeholder
UPDATE "site_config" SET "companyName" = 'Inverts Oasis' WHERE "id" = 1 AND "companyName" = 'Lemons';
