import Link from "next/link";
import { Suspense } from "react";
import { SettingsLoginForm } from "./settings-login-form";

export default function SettingsLoginPage() {
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
        <Suspense fallback={<p className="mt-6 text-sm text-ink/60">Loading…</p>}>
          <SettingsLoginForm />
        </Suspense>
      </div>
    </div>
  );
}
