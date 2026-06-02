"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { btnMainLg } from "@/lib/btn-theme-classes";
import { registerCustomer } from "@/app/actions/customer-auth";

export function CustomerRegisterForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [emailTaken, setEmailTaken] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setEmailTaken(false);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const email = String(fd.get("email") ?? "")
        .trim()
        .toLowerCase();
      const password = String(fd.get("password") ?? "");
      const result = await registerCustomer(fd);
      if (!result.ok) {
        setError(result.error);
        if (result.emailExists) setEmailTaken(true);
        return;
      }
      const signed = await signIn("customer-credentials", { email, password, redirect: false });
      if (!signed?.error) {
        router.push("/account");
        router.refresh();
        return;
      }
      router.push("/login?registered=1");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 flex max-w-md flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-bold text-ink">
          First name <span className="font-normal text-ink/55">(optional)</span>
          <input
            type="text"
            name="firstName"
            autoComplete="given-name"
            maxLength={80}
            className="mt-1 w-full border-2 border-palm-mid bg-white px-3 py-2 text-base text-ink outline-none focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
          />
        </label>
        <label className="block text-sm font-bold text-ink">
          Last name <span className="font-normal text-ink/55">(optional)</span>
          <input
            type="text"
            name="lastName"
            autoComplete="family-name"
            maxLength={80}
            className="mt-1 w-full border-2 border-palm-mid bg-white px-3 py-2 text-base text-ink outline-none focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
          />
        </label>
      </div>
      <label className="block text-sm font-bold text-ink">
        Email
        <input
          type="email"
          name="email"
          autoComplete="username"
          required
          className="mt-1 w-full border-2 border-palm-mid bg-white px-3 py-2 text-base text-ink outline-none focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
        />
      </label>
      <label className="block text-sm font-bold text-ink">
        Password (min 8 characters)
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
      {emailTaken ? (
        <p className="text-sm text-ink/85">
          Try{" "}
          <Link href="/login" className="font-bold text-lagoon-dark underline">
            logging in
          </Link>{" "}
          or{" "}
          <Link href="/forgot-password" className="font-bold text-lagoon-dark underline">
            reset your password
          </Link>
          .
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className={`w-full ${btnMainLg}`}
      >
        {pending ? "Creating…" : "Create account"}
      </button>
      <p className="text-sm text-ink/75">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-lagoon-dark underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
