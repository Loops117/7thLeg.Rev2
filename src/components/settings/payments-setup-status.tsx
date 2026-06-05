"use client";

import { useState, useTransition } from "react";
import { verifySquareConnectionAction } from "@/app/actions/square-admin";
import { adminMutedPanelClass } from "@/lib/admin-surface-classes";
import { btnSecondaryMd } from "@/lib/btn-theme-classes";
import type { SquareSetupStatus } from "@/lib/square-setup-status";

function StatusRow({ ok, label, detail }: { ok: boolean; label: string; detail?: string | null }) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
      <span className={ok ? "font-bold text-palm" : "font-bold text-coral"}>{ok ? "✓" : "○"}</span>
      <span className="text-ink">{label}</span>
      {detail ? <span className="font-mono text-xs text-ink/60">{detail}</span> : null}
    </li>
  );
}

export function PaymentsSetupStatus({
  square,
  squareToggleEnabled,
  stripeSecretConfigured,
}: {
  square: SquareSetupStatus;
  squareToggleEnabled: boolean;
  stripeSecretConfigured: boolean;
}) {
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function testSquare() {
    setMessage("");
    startTransition(async () => {
      const r = await verifySquareConnectionAction();
      setMessage(r.ok ? r.message : r.error);
    });
  }

  const squareReady = square.fullyConfigured && squareToggleEnabled;

  return (
    <div className={`mt-8 ${adminMutedPanelClass}`}>
      <h3 className="text-sm font-black uppercase tracking-wide text-palm dark:text-emerald-300">Runtime status</h3>
      <p className="mt-2 max-w-xl text-xs text-ink/70">
        Checkout only shows a gateway when it is <strong>enabled below</strong> and the server has the required env vars.
        After adding vars in Vercel (or <code className="rounded bg-black/5 px-1">.env.local</code>), redeploy or restart{" "}
        <code className="rounded bg-black/5 px-1">npm run dev</code>.
      </p>

      <div className="mt-5 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-palm-mid">Stripe</p>
          <ul className="mt-2 space-y-1">
            <StatusRow ok={stripeSecretConfigured} label="STRIPE_SECRET_KEY" />
          </ul>
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-wide text-palm-mid">
            Square {square.sandbox ? "(sandbox)" : square.fullyConfigured ? "(production)" : ""}
          </p>
          <ul className="mt-2 space-y-1">
            <StatusRow ok={square.accessToken} label="SQUARE_ACCESS_TOKEN" />
            <StatusRow ok={square.locationId} label="SQUARE_LOCATION_ID" detail={square.locationIdHint} />
            <StatusRow
              ok={square.applicationId}
              label="NEXT_PUBLIC_SQUARE_APPLICATION_ID"
              detail={square.applicationIdHint}
            />
            <StatusRow ok={squareToggleEnabled} label="Enabled in checkout toggles" />
            <StatusRow ok={squareReady} label="Visible on cart" detail={squareReady ? "yes" : "no"} />
          </ul>
          {square.fullyConfigured ? (
            <>
              <button type="button" disabled={pending} onClick={testSquare} className={`mt-3 ${btnSecondaryMd}`}>
                {pending ? "Testing…" : "Test Square connection"}
              </button>
              {square.sandbox ? (
                <p className="mt-3 text-xs text-ink/65">
                  Sandbox is active. For live checkout on{" "}
                  <strong className="text-ink">www.7thleg.com</strong>, switch the dashboard toggle to{" "}
                  <strong className="text-ink">Production</strong>, copy production credentials into Vercel (
                  <code className="rounded bg-black/5 px-1">SQUARE_ACCESS_TOKEN</code>,{" "}
                  <code className="rounded bg-black/5 px-1">SQUARE_LOCATION_ID</code>,{" "}
                  <code className="rounded bg-black/5 px-1">NEXT_PUBLIC_SQUARE_APPLICATION_ID</code> with a{" "}
                  <code className="rounded bg-black/5 px-1">sq0id…</code> app id), remove{" "}
                  <code className="rounded bg-black/5 px-1">SQUARE_ENV=sandbox</code>, and redeploy.
                </p>
              ) : (
                <p className="mt-3 text-xs text-ink/65">
                  Production credentials detected. After updating Vercel env vars, redeploy so the live card SDK loads.
                </p>
              )}
            </>
          ) : (
            <p className="mt-3 text-xs text-ink/65">
              In the{" "}
              <a
                href="https://developer.squareup.com/apps"
                className="font-bold text-lagoon-dark underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Square Developer Dashboard
              </a>
              : open your app → toggle <strong>Sandbox</strong> or <strong>Production</strong> → Credentials → copy
              access token and Application ID → Locations → copy Location ID. Sandbox app ids start with{" "}
              <code className="rounded bg-black/5 px-1">sandbox-</code>; production uses{" "}
              <code className="rounded bg-black/5 px-1">sq0id…</code>.
            </p>
          )}
        </div>
      </div>

      {message ? <p className="mt-4 text-sm text-ink/85">{message}</p> : null}
    </div>
  );
}
