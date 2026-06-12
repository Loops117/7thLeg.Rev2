-- Product species-list mapping (on purchase)
ALTER TABLE "products" ADD COLUMN "species_auto_add" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "products" ADD COLUMN "species_list_species" TEXT NOT NULL DEFAULT '';
ALTER TABLE "products" ADD COLUMN "species_list_insect_type" TEXT NOT NULL DEFAULT '';
ALTER TABLE "products" ADD COLUMN "species_list_morph_name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "products" ADD COLUMN "species_list_common_name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "products" ADD COLUMN "species_list_source" TEXT NOT NULL DEFAULT '7th Leg';

-- Cart / order checkout preference per line
ALTER TABLE "cart_items" ADD COLUMN "add_to_species_list" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "order_line_items" ADD COLUMN "add_to_species_list" BOOLEAN NOT NULL DEFAULT true;

-- Fulfillment idempotency for species auto-add
CREATE TABLE "order_line_item_species_grants" (
    "order_line_item_id" TEXT NOT NULL,
    "customer_species_entry_id" TEXT,
    "action" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_line_item_species_grants_pkey" PRIMARY KEY ("order_line_item_id")
);

ALTER TABLE "order_line_item_species_grants" ADD CONSTRAINT "order_line_item_species_grants_order_line_item_id_fkey" FOREIGN KEY ("order_line_item_id") REFERENCES "order_line_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_line_item_species_grants" ADD CONSTRAINT "order_line_item_species_grants_customer_species_entry_id_fkey" FOREIGN KEY ("customer_species_entry_id") REFERENCES "customer_species_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
