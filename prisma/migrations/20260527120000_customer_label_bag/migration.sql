-- CreateTable
CREATE TABLE "customer_label_bags" (
    "customer_id" TEXT NOT NULL,
    "items_json" JSONB NOT NULL,
    "folders_json" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_label_bags_pkey" PRIMARY KEY ("customer_id")
);

-- AddForeignKey
ALTER TABLE "customer_label_bags" ADD CONSTRAINT "customer_label_bags_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
