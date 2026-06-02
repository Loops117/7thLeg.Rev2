"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { confirmCustomerPasswordReset } from "@/app/actions/password-reset";
import { btnMainLg } from "@/lib/btn-theme-classes";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    fd.set("token", token);
    startTransition(async () => {
      const res = await confirmCustomerPasswordReset(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/login?reset=1");
      router.refresh();
    });
  }

  if (!token) {
    return (
      <p className="mt-8 text-coral">
        Invalid link.{" "}
        <Link href="/forgot-password" className="font-bold underline">
          Request a new reset
        </Link>
        .
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 flex max-w-md flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <label className="block text-sm font-bold text-ink">
        New password (min 8 characters)
        <input
          type="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="mt-1 w-full border-2 border-palm-mid bg-white px-3 py-2 text-base text-ink outline-none focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
        />
      </label>
      <label className="block text-sm font-bold text-ink">
        Confirm password
        <input
          type="password"
          name="confirm"
          autoComplete="new-password"
          required
          minLength={8}
          className="mt-1 w-full border-2 border-palm-mid bg-white px-3 py-2 text-base text-ink outline-none focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
        />
      </label>
      {error ? <p className="text-sm font-medium text-coral">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className={`w-full ${btnMainLg}`}
      >
        {pending ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}
