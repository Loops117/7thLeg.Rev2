import Link from "next/link";
import { Suspense } from "react";
import { SettingsLoginForm } from "./settings-login-form";

function authEnvReady() {
  const secret =
    process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim() || "";
  const db = process.env.DATABASE_URL?.trim() || "";
  return { hasAuthSecret: secret.length >= 16, hasDatabaseUrl: db.length > 0 };
}

export default function SettingsLoginPage() {
  const { hasAuthSecret, hasDatabaseUrl } = authEnvReady();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <Link
        href="/"
        className="mb-6 text-sm font-medium text-lagoon-dark underline-offset-4 hover:text-palm hover:underline"
      >
        ← Back to storefront
      </Link>
      <div className="w-full max-w-md border-4 border-palm bg-white p-8 shadow-[8px_8px_0_0_#2d6a4f]">
        <h1 className="text-2xl font-black text-palm">Admin sign in</h1>
        <p className="mt-2 text-sm text-ink/70">
          Manage the landing page, store, and site settings. Use the account you created with{" "}
          <code className="rounded bg-[#eef5f3] px-1.5 py-0.5 text-xs text-palm">npm run db:seed</code>.
        </p>
        {!hasAuthSecret ? (
          <div
            className="mt-4 rounded border-2 border-coral/40 bg-coral/10 px-3 py-3 text-sm text-ink"
            role="alert"
          >
            <p className="font-bold text-coral">Auth is not configured on this server</p>
            <p className="mt-1">
              Set <code className="text-xs">AUTH_SECRET</code> in your environment (32+ random characters).
              On Vercel: Project → Settings → Environment Variables → add{" "}
              <code className="text-xs">AUTH_SECRET</code>, then redeploy. Generate locally:{" "}
              <code className="text-xs">openssl rand -base64 32</code>
            </p>
          </div>
        ) : null}
        {!hasDatabaseUrl ? (
          <div
            className="mt-4 rounded border-2 border-coral/40 bg-coral/10 px-3 py-3 text-sm text-ink"
            role="alert"
          >
            <p className="font-bold text-coral">Database URL is missing</p>
            <p className="mt-1">
              Set <code className="text-xs">DATABASE_URL</code> in <code className="text-xs">.env</code> (local) or
              Vercel environment variables.
            </p>
          </div>
        ) : null}
        <Suspense fallback={<p className="mt-6 text-sm text-ink/60">Loading…</p>}>
          <SettingsLoginForm authConfigured={hasAuthSecret && hasDatabaseUrl} />
        </Suspense>
      </div>
    </div>
  );
}
