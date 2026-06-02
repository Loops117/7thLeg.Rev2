"use client";

import { usePathname } from "next/navigation";
import { SiteFooter, type SiteFooterProps } from "@/components/site-footer";
import { isLabelEditorPath } from "@/lib/label-editor-path";

/** Compact footer on label editor routes; full footer elsewhere. */
export function SiteFooterWrapper(props: Omit<SiteFooterProps, "compact">) {
  const pathname = usePathname();
  const compact = isLabelEditorPath(pathname);
  return <SiteFooter {...props} compact={compact} />;
}
