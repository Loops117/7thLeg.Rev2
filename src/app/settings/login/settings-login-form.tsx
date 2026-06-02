"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { btnMainLg } from "@/lib/btn-theme-classes";
import { useState } from "react";

export function SettingsLoginForm({ authConfigured = true }: { authConfigured?: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams?.get("callbackUrl") ?? "/settings/sales";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const res = await signIn("admin-credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        if (res.error === "Configuration") {
          setError(
            "Auth configuration error. On Vercel, set AUTH_URL to this site URL (not localhost), ensure AUTH_SECRET is set, redeploy, then check /api/health.",
          );
        } else if (res.error === "CredentialsSignin") {
          setError("Invalid email or password.");
        } else {
          setError(`Sign-in failed (${res.error}). Check that this deployment has your admin user in admin_users.`);
        }
        setPending(false);
        return;
      }
      router.push(callbackUrl.startsWith("/settings") ? callbackUrl : "/settings/sales");
      router.refresh();
    } catch {
      setError("Something went wrong.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
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
      <label className="block text-sm font-bold text-ink">
        Password
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mt-1 w-full border-2 border-palm-mid bg-white px-3 py-2 text-base text-ink outline-none focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
        />
      </label>
      {error ? <p className="text-sm font-medium text-coral">{error}</p> : null}
      <button
        type="submit"
        disabled={pending || !authConfigured}
        className={btnMainLg}
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
