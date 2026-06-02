"use client";

import { useEffect, useState, useTransition } from "react";
import { updateCustomerName } from "@/app/actions/customer-profile";
import { btnSecondaryMd } from "@/lib/btn-theme-classes";

type Props = {
  initial: {
    firstName: string | null;
    lastName: string | null;
  };
};

export function CustomerNameForm({ initial }: Props) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [firstName, setFirstName] = useState(initial.firstName ?? "");
  const [lastName, setLastName] = useState(initial.lastName ?? "");

  useEffect(() => {
    setFirstName(initial.firstName ?? "");
    setLastName(initial.lastName ?? "");
  }, [initial.firstName, initial.lastName]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaved(false);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateCustomerName(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-bold text-ink">
          First name
          <input
            name="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
            className="mt-1 w-full border-2 border-palm-mid bg-white px-3 py-2 text-base text-ink outline-none focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
          />
        </label>
        <label className="block text-sm font-bold text-ink">
          Last name
          <input
            name="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="family-name"
            className="mt-1 w-full border-2 border-palm-mid bg-white px-3 py-2 text-base text-ink outline-none focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
          />
        </label>
      </div>
      {error ? <p className="text-sm font-medium text-coral">{error}</p> : null}
      {saved ? <p className="text-sm font-medium text-palm">Name saved.</p> : null}
      <button
        type="submit"
        disabled={pending}
        className={btnSecondaryMd}
      >
        {pending ? "Saving…" : "Save name"}
      </button>
    </form>
  );
}
