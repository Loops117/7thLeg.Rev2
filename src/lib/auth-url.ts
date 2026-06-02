/** Avoid localhost AUTH_URL on Vercel/production (breaks sign-in callbacks). */
export function ensureProductionAuthUrl(): void {
  const authUrl = process.env.AUTH_URL?.trim();
  if (!authUrl) return;

  const isLocal =
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(authUrl) ||
    authUrl.startsWith("http://localhost") ||
    authUrl.startsWith("https://localhost");

  if (!isLocal) return;

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    process.env.AUTH_URL = `https://${vercel}`;
    return;
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (site && !/localhost|127\.0\.0\.1/i.test(site)) {
    process.env.AUTH_URL = site;
  }
}

export function publicAuthBaseUrl(): string | null {
  const authUrl = process.env.AUTH_URL?.trim();
  if (authUrl) return authUrl.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return site ? site.replace(/\/$/, "") : null;
}
