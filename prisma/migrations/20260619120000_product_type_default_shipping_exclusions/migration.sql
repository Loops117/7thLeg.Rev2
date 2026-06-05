-- CreateTable
CREATE TABLE "product_type_default_shipping_exclusions" (
    "type_id" TEXT NOT NULL,
    "shipping_option_id" TEXT NOT NULL,

    CONSTRAINT "product_type_default_shipping_exclusions_pkey" PRIMARY KEY ("type_id","shipping_option_id")
);

-- AddForeignKey
ALTER TABLE "product_type_default_shipping_exclusions" ADD CONSTRAINT "product_type_default_shipping_exclusions_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "product_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_type_default_shipping_exclusions" ADD CONSTRAINT "product_type_default_shipping_exclusions_shipping_option_id_fkey" FOREIGN KEY ("shipping_option_id") REFERENCES "shipping_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;
