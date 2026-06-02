"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/** Records storefront page impressions and daily unique visits. */
export function SiteAnalyticsBeacon() {
  const pathname = usePathname() || "/";
  const lastRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/settings")) return;
    if (lastRef.current === pathname) return;
    lastRef.current = pathname;

    const body = JSON.stringify({ path: pathname });
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/analytics/collect", blob);
      return;
    }
    void fetch("/api/analytics/collect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  }, [pathname]);

  return null;
}
