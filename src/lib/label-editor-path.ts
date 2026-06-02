/** Storefront label creator routes (`/labels`, `/labels/design/...`). */
export function isLabelEditorPath(pathname: string | null | undefined): boolean {
  return pathname === "/labels" || (pathname?.startsWith("/labels/") ?? false);
}
