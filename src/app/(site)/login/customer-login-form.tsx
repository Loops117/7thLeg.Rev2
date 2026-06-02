"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { btnMainLg } from "@/lib/btn-theme-classes";

export function CustomerLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams?.get("callbackUrl") ?? "/";
  const resetOk = searchParams?.get("reset") === "1";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const res = await signIn("customer-credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        setError("Invalid email or password.");
        setPending(false);
        return;
      }
      const safe =
        callbackUrl.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/";
      router.push(safe);
      router.refresh();
    } catch {
      setError("Something went wrong.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 flex max-w-md flex-col gap-4">
      {resetOk ? (
        <p className="rounded border-2 border-lagoon/40 bg-lagoon/10 px-3 py-2 text-sm text-ink">
          Your password was updated. Sign in with your new password.
        </p>
      ) : null}
      <label className="block text-sm font-bold text-ink">
        Email
        <input
          type="email"
          name="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1 w-full border-2 border-palm-mid bg-white px-3 py-2 text-base text-ink outline-none focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
        />
      </label>
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-bold text-ink">Password</span>
          <Link
            href="/forgot-password"
            className="text-sm font-bold text-lagoon-dark underline"
          >
            Forgot password?
          </Link>
        </div>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mt-1 w-full border-2 border-palm-mid bg-white px-3 py-2 text-base text-ink outline-none focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
        />
      </div>
      {error ? <p className="text-sm font-medium text-coral">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className={`w-full ${btnMainLg}`}
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-sm text-ink/75">
        No account?{" "}
        <Link href="/register" className="font-bold text-lagoon-dark underline">
          Create one
        </Link>
      </p>
    </form>
  );
}
