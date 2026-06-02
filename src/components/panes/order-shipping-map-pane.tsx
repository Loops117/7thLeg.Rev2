import { getShippedOrderMapStats } from "@/lib/order-shipping-map-stats";
import { OrderShippingMapPaneClient } from "./order-shipping-map-pane-client";

export async function OrderShippingMapPaneSection() {
  const stats = await getShippedOrderMapStats();
  return <OrderShippingMapPaneClient stats={stats} geoUrl="/maps/na-admin1-10m.geojson" />;
}
