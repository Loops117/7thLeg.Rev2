"use client";

import { btnMainMd } from "@/lib/btn-theme-classes";

export default function SettingsEventsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="p-6 sm:p-10">
      <h1 className="border-b-4 border-coral/40 pb-3 text-2xl font-black text-coral">Events couldn’t load</h1>
      <p className="mt-4 max-w-2xl text-ink/85">
        This is usually a database schema mismatch after a deploy (new columns or enums). Production must run{" "}
        <code className="rounded bg-black/5 px-1 font-mono text-sm">prisma migrate deploy</code> against the same{" "}
        <code className="rounded bg-black/5 px-1 font-mono text-sm">DATABASE_URL</code> (for Supabase, prefer a direct
        connection — set <code className="font-mono text-sm">DIRECT_URL</code> for migrations if you use a pooler).
      </p>
      <p className="mt-3 max-w-2xl text-sm text-ink/70">
        The build on Vercel now runs migrations automatically; trigger a new deployment after env vars are correct. If
        this persists, check the server log (or Vercel function log) for the full error — the browser only shows a
        digest in production.
      </p>
      {error.digest ? (
        <p className="mt-4 font-mono text-xs text-ink/55">
          Digest: <span className="select-all">{error.digest}</span>
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => reset()}
        className={`mt-6 ${btnMainMd}`}
      >
        Try again
      </button>
    </div>
  );
}
