/** Site origin for Stripe redirects and absolute URLs (no trailing slash). */
export function getPublicAppOrigin(): string {
  const fromEnv = process.env.AUTH_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/+$/, "")}`;
  return "http://localhost:3000";
}
