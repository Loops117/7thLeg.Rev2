import {
  getSquarePublicApplicationId,
  isSquareEnvConfigured,
  isSquareSandbox,
} from "@/lib/square-server";

export type SquareSetupStatus = {
  accessToken: boolean;
  locationId: boolean;
  applicationId: boolean;
  sandbox: boolean;
  fullyConfigured: boolean;
  /** Short hint for admin (not secret). */
  applicationIdHint: string | null;
  locationIdHint: string | null;
};

function envHint(value: string, visible = 8): string | null {
  const t = value.trim();
  if (!t) return null;
  if (t.length <= visible) return t;
  return `${t.slice(0, visible)}…`;
}

export function getSquareSetupStatus(): SquareSetupStatus {
  const applicationId = getSquarePublicApplicationId();
  const locationId = process.env.SQUARE_LOCATION_ID?.trim() ?? "";
  const accessToken = !!process.env.SQUARE_ACCESS_TOKEN?.trim();

  return {
    accessToken,
    locationId: !!locationId,
    applicationId: !!applicationId,
    sandbox: isSquareSandbox(),
    fullyConfigured: isSquareEnvConfigured(),
    applicationIdHint: envHint(applicationId),
    locationIdHint: envHint(locationId),
  };
}
