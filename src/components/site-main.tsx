"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { isLabelEditorPath } from "@/lib/label-editor-path";

const mainClass = "storefront-content-width storefront-main-column flex-1";

/** Label editor fills remaining viewport without page scroll. */
export function SiteMain({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLabelEditor = isLabelEditorPath(pathname);

  if (isLabelEditor) {
    return (
      <main className="mx-auto flex min-h-0 w-full max-w-none flex-1 flex-col overflow-hidden bg-sand/95 dark:bg-zinc-950">
        {children}
      </main>
    );
  }

  return <main className={mainClass}>{children}</main>;
}
