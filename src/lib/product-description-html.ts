/** Normalize product description for storefront HTML rendering. */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Rich text from the admin editor is stored as HTML. Legacy plain text (no tags) is
 * turned into paragraphs so line breaks and blank lines are visible on the storefront.
 */
export function normalizeProductDescriptionHtml(raw: string | null | undefined): string {
  const s = raw?.trim() ?? "";
  if (!s) {
    return "";
  }
  if (/^\s*</.test(s)) {
    return s;
  }
  return s
    .split(/\r?\n/)
    .map((line) => `<p>${line.trim().length ? escapeHtml(line) : "<br />"}</p>`)
    .join("");
}

/** True when normalized HTML has visible text (not empty editor output). */
export function richTextHasVisibleContent(raw: string | null | undefined): boolean {
  const html = normalizeProductDescriptionHtml(raw);
  if (!html.trim()) return false;
  const text = html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .trim();
  return text.length > 0;
}
