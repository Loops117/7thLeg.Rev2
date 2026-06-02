-- CreateTable
CREATE TABLE "customer_label_uploads" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_label_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_label_uploads_customer_id_created_at_idx" ON "customer_label_uploads"("customer_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "customer_label_uploads" ADD CONSTRAINT "customer_label_uploads_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
