"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { btnMainLg } from "@/lib/btn-theme-classes";
import { requestCustomerPasswordReset } from "@/app/actions/password-reset";

export function ForgotPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [devUrl, setDevUrl] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setDevUrl(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await requestCustomerPasswordReset(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone(true);
      if (res.devResetUrl) setDevUrl(res.devResetUrl);
    });
  }

  if (done) {
    return (
      <div className="mt-8 max-w-md space-y-4">
        <p className="text-ink/90">
          If an account exists for that email, we sent a link to reset your password. Check your inbox (and spam).
        </p>
        {devUrl ? (
          <div className="rounded border-2 border-mango/50 bg-mango/10 p-4 text-sm">
            <p className="font-bold text-palm">Development only</p>
            <p className="mt-2 break-all text-ink/80">Reset link: {devUrl}</p>
          </div>
        ) : null}
        <p>
          <Link href="/login" className="font-bold text-lagoon-dark underline">
            Back to login
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 flex max-w-md flex-col gap-4">
      <label className="block text-sm font-bold text-ink">
        Email
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          className="mt-1 w-full border-2 border-palm-mid bg-white px-3 py-2 text-base text-ink outline-none focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
        />
      </label>
      {error ? <p className="text-sm font-medium text-coral">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className={`w-full ${btnMainLg}`}
      >
        {pending ? "Sending…" : "Send reset link"}
      </button>
      <p className="text-sm text-ink/75">
        <Link href="/login" className="font-bold text-lagoon-dark underline">
          Back to login
        </Link>
      </p>
    </form>
  );
}
