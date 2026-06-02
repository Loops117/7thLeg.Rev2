import type { TrackingCarrier } from "@/generated/prisma/client";

/**
 * Builds a carrier tracking URL when possible (OTHER accepts full https URLs pasted as the tracking field).
 */
export function trackingUrlForCarrier(carrier: TrackingCarrier, trackingRaw: string): string | null {
  const tracking = trackingRaw.trim();
  if (!tracking || carrier === "NONE") return null;

  if (carrier === "OTHER") {
    return /^https?:\/\//i.test(tracking) ? tracking : null;
  }

  const enc = encodeURIComponent(tracking);
  switch (carrier) {
    case "USPS":
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${enc}`;
    case "UPS":
      return `https://www.ups.com/track?tracknum=${enc}`;
    case "FEDEX":
      return `https://www.fedex.com/fedextrack/?trknbr=${enc}`;
    case "DHL":
      return `https://www.dhl.com/en/express/tracking.html?AWB=${enc}`;
    default:
      return null;
  }
}
