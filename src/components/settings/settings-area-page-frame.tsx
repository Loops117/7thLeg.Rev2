"use client";

import { usePathname } from "next/navigation";
import { pathIsSettingsArea } from "@/components/settings-admin-sidebar";

/** Full width of the admin content column (Settings sidebar pages only). */
export const SETTINGS_AREA_MAX_WIDTH_CLASS = "w-full min-w-0";

export function SettingsAreaPageFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  if (!pathIsSettingsArea(pathname)) {
    return <>{children}</>;
  }
  return <div className={SETTINGS_AREA_MAX_WIDTH_CLASS}>{children}</div>;
}
