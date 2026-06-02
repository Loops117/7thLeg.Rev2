"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { enterEventGiveaway } from "@/app/actions/events-public";
import { btnMainMd } from "@/lib/btn-theme-classes";

export function EventGiveawayEntryForm({
  eventId,
  buttonLabel,
  loggedInEmail,
}: {
  eventId: string;
  buttonLabel: string;
  loggedInEmail: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    startTransition(async () => {
      const result = await enterEventGiveaway(eventId, loggedInEmail ? "" : email);
      if (!result.ok) {
        setErr(result.error);
        return;
      }
      setMsg("You’re signed up. Good luck!");
      setEmail("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3 text-center">
      {loggedInEmail ? (
        <p className="text-sm text-ink/80">
          Signed in as <span className="font-mono font-bold text-palm">{loggedInEmail}</span>
        </p>
      ) : (
        <label className="mx-auto block max-w-sm text-left text-sm font-bold text-ink">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </label>
      )}
      <button
        type="submit"
        disabled={pending}
        className={btnMainMd}
      >
        {pending ? "Submitting…" : buttonLabel || "Sign up"}
      </button>
      {msg ? <p className="text-sm font-medium text-lagoon-dark">{msg}</p> : null}
      {err ? <p className="text-sm font-medium text-coral">{err}</p> : null}
      {!loggedInEmail ? (
        <p className="text-xs text-ink/60">
          Have an account?{" "}
          <a href="/login" className="font-bold text-lagoon-dark underline">
            Log in
          </a>{" "}
          to use your account email automatically.
        </p>
      ) : null}
    </form>
  );
}
