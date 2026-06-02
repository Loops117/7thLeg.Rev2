-- CreateTable
CREATE TABLE "customer_label_designs" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "document_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_label_designs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_label_designs_customer_id_updated_at_idx" ON "customer_label_designs"("customer_id", "updated_at" DESC);

-- AddForeignKey
ALTER TABLE "customer_label_designs" ADD CONSTRAINT "customer_label_designs_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_label_designs" ADD CONSTRAINT "customer_label_designs_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "label_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
