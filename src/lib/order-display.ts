import type { TrackingCarrier } from "@/generated/prisma/client";

export function trackingCarrierLabel(c: TrackingCarrier): string {
  switch (c) {
    case "USPS":
      return "USPS";
    case "UPS":
      return "UPS";
    case "FEDEX":
      return "FedEx";
    case "DHL":
      return "DHL";
    case "OTHER":
      return "Carrier";
    default:
      return "";
  }
}
