import type { QrRedirectTarget } from "@/generated/prisma/enums";

const TARGET_PATH: Record<Exclude<QrRedirectTarget, "CUSTOM">, string> = {
  HOME: "/",
  STORE: "/store",
  FEATURED: "/featured",
  ABOUT: "/about",
  CART: "/cart",
  ACCOUNT: "/account",
};

/**
 * Resolves the browser destination for a QR redirect row.
 * Non-empty `customUrl` overrides the dropdown target (full URL or site-relative path).
 * `origin` must be the public site origin (no trailing slash), e.g. from `getPublicAppOrigin()`.
 */
export function resolveQrRedirectDestinationUrl(
  target: QrRedirectTarget,
  customUrl: string,
  origin: string,
): URL {
  const base = `${origin.replace(/\/+$/, "")}/`;
  const trimmed = customUrl.trim();
  if (trimmed) {
    if (/^https?:\/\//i.test(trimmed)) return new URL(trimmed);
    const rel = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return new URL(rel, base);
  }
  if (target === "CUSTOM") {
    return new URL("/", base);
  }
  return new URL(TARGET_PATH[target], base);
}

export function qrTargetLabel(target: QrRedirectTarget): string {
  switch (target) {
    case "HOME":
      return "Home page";
    case "STORE":
      return "Store";
    case "FEATURED":
      return "Featured";
    case "ABOUT":
      return "About";
    case "CART":
      return "Cart";
    case "ACCOUNT":
      return "Account";
    case "CUSTOM":
      return "Custom URL";
    default:
      return target;
  }
}
