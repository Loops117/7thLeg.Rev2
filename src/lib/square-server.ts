import { SquareClient, SquareEnvironment } from "square";

/** Strip stray quotes sometimes pasted into Vercel env values. */
function sanitizeEnvScalar(s?: string): string {
  let t = (s ?? "").trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    t = t.slice(1, -1).trim();
  }
  return t;
}

/** Sandbox Web Payments IDs start with `sandbox-`; production IDs are typically `sq0id…`. */
export function getSquarePublicApplicationId(): string {
  return sanitizeEnvScalar(process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID);
}

export function isSquareSandbox(): boolean {
  const applicationId = getSquarePublicApplicationId();
  const envSandbox =
    process.env.SQUARE_ENV?.trim().toLowerCase() === "sandbox" ||
    process.env.SQUARE_USE_SANDBOX === "true";

  if (/^sandbox-/i.test(applicationId)) return true;
  // Non-sandbox-shaped app id ⇒ never load the sandbox Web Payments SDK.
  if (applicationId.length > 0 && /^sq0id/i.test(applicationId)) return false;

  return envSandbox;
}

export function isSquareEnvConfigured(): boolean {
  return !!(
    process.env.SQUARE_ACCESS_TOKEN?.trim() &&
    process.env.SQUARE_LOCATION_ID?.trim() &&
    getSquarePublicApplicationId()
  );
}

export function getSquareClient(): SquareClient {
  const token = process.env.SQUARE_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error("SQUARE_ACCESS_TOKEN is not set");
  }
  return new SquareClient({
    token,
    environment: isSquareSandbox() ? SquareEnvironment.Sandbox : SquareEnvironment.Production,
  });
}
