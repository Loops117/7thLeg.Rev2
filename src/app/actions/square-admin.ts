"use server";

import { auth } from "@/auth";
import { getSquareSetupStatus } from "@/lib/square-setup-status";
import { getSquareClient } from "@/lib/square-server";
import { SquareError } from "square";

export type VerifySquareConnectionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

/** Admin: ping Square API and confirm the configured location id exists. */
export async function verifySquareConnectionAction(): Promise<VerifySquareConnectionResult> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return { ok: false, error: "Admin sign-in required." };
  }

  const setup = getSquareSetupStatus();
  if (!setup.fullyConfigured) {
    return {
      ok: false,
      error: "Set SQUARE_ACCESS_TOKEN, SQUARE_LOCATION_ID, and NEXT_PUBLIC_SQUARE_APPLICATION_ID first.",
    };
  }

  const locationId = process.env.SQUARE_LOCATION_ID?.trim() ?? "";

  try {
    const client = getSquareClient();
    const response = await client.locations.list();
    const errs = response.errors ?? [];
    if (errs.length) {
      return { ok: false, error: errs[0]?.detail || errs[0]?.code || "Square returned an error." };
    }

    const locations = response.locations ?? [];
    const match = locations.find((loc) => loc.id === locationId);
    if (!match) {
      const names = locations
        .slice(0, 5)
        .map((l) => l.name || l.id)
        .filter(Boolean)
        .join(", ");
      return {
        ok: false,
        error: `SQUARE_LOCATION_ID does not match any location on this token.${names ? ` Found: ${names}` : ""}`,
      };
    }

    const mode = setup.sandbox ? "Sandbox" : "Production";
    return {
      ok: true,
      message: `${mode} API OK — location “${match.name ?? locationId}”.`,
    };
  } catch (e) {
    if (e instanceof SquareError) {
      const first = e.errors[0];
      return { ok: false, error: first?.detail || first?.code || "Square API request failed." };
    }
    console.error("verifySquareConnectionAction", e);
    return { ok: false, error: e instanceof Error ? e.message : "Square API request failed." };
  }
}
