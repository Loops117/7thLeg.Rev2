-- Align label_templates with Prisma: unmapped fields use camelCase column names (see shipping_options).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'label_templates'
      AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE "label_templates" RENAME COLUMN "sort_order" TO "sortOrder";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'label_templates'
      AND column_name = 'created_at'
  ) THEN
    ALTER TABLE "label_templates" RENAME COLUMN "created_at" TO "createdAt";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'label_templates'
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE "label_templates" RENAME COLUMN "updated_at" TO "updatedAt";
  END IF;
END $$;
