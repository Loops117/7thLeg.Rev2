"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveGuestCheckoutContactAction } from "@/app/actions/guest-checkout";
import type { GuestCheckoutContact } from "@/lib/guest-checkout-contact";

type Props = {
  initialContact: GuestCheckoutContact | null;
  guestMode?: boolean;
  /** When set, email is shown read-only (signed-in customer). */
  accountEmail?: string | null;
  /** Server-known: shipping cookie already saved and complete. */
  contactSaved?: boolean;
};

const inputClass =
  "mt-1 w-full border-2 border-palm-mid bg-white px-3 py-2 text-base text-ink outline-none focus:border-lagoon focus:ring-2 focus:ring-lagoon/30";

export function GuestCheckoutContactPanel({
  initialContact,
  guestMode = false,
  accountEmail = null,
  contactSaved = false,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(contactSaved);
  const [contact, setContact] = useState<GuestCheckoutContact | null>(
    contactSaved ? initialContact : null,
  );

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await saveGuestCheckoutContactAction(fd);
      if (!res.ok) {
        setError(res.error);
        setSaved(false);
        return;
      }
      setContact(res.contact);
      setSaved(true);
      router.refresh();
    });
  }

  const emailValue = accountEmail?.trim() || contact?.email || initialContact?.email || "";

  return (
    <div className="cart-panel">
      <h2 className="cart-panel__heading">Shipping address</h2>
      <p className="cart-panel__text">
        Confirm where we should send this order. You must save these details before checkout.
        {guestMode ? (
          <>
            {" "}
            <Link href="/register" className="font-bold text-lagoon-dark underline">
              Create an account
            </Link>{" "}
            to earn loyalty points.
          </>
        ) : (
          <> Changes here apply to this order only — update your profile under Account if you want them saved permanently.</>
        )}
      </p>
      {saved && contact ? (
        <p className="mt-3 rounded border border-lagoon/35 bg-lagoon/10 px-3 py-3 text-sm text-ink/90">
          <span className="font-bold text-lagoon-dark">Saved for checkout</span> — shipping to{" "}
          <strong>{contact.displayName}</strong>
          {guestMode ? <> ({contact.email})</> : null}
          <br />
          {contact.addressLine1}
          {contact.addressLine2 ? `, ${contact.addressLine2}` : ""}, {contact.city}, {contact.stateRegion}{" "}
          {contact.postalCode}
          {contact.country && contact.country !== "US" ? `, ${contact.country}` : ""}
        </p>
      ) : null}
      {error ? <p className="mt-2 text-sm font-medium text-coral">{error}</p> : null}
      <form onSubmit={onSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
        {guestMode ? (
          <label className="block text-sm font-bold text-ink sm:col-span-2">
            Email
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              defaultValue={emailValue}
              className={inputClass}
            />
          </label>
        ) : (
          <div className="sm:col-span-2">
            <p className="text-sm font-bold text-ink">Email</p>
            <p className="mt-1 font-mono text-sm text-ink/85">{emailValue}</p>
          </div>
        )}
        <label className="block text-sm font-bold text-ink sm:col-span-2">
          Full name
          <input
            type="text"
            name="displayName"
            required
            autoComplete="name"
            defaultValue={contact?.displayName ?? initialContact?.displayName ?? ""}
            className={inputClass}
          />
        </label>
        <label className="block text-sm font-bold text-ink sm:col-span-2">
          Address line 1
          <input
            type="text"
            name="addressLine1"
            required
            autoComplete="address-line1"
            defaultValue={contact?.addressLine1 ?? initialContact?.addressLine1 ?? ""}
            className={inputClass}
          />
        </label>
        <label className="block text-sm font-bold text-ink sm:col-span-2">
          Address line 2 <span className="font-normal text-ink/55">(optional)</span>
          <input
            type="text"
            name="addressLine2"
            autoComplete="address-line2"
            defaultValue={contact?.addressLine2 ?? initialContact?.addressLine2 ?? ""}
            className={inputClass}
          />
        </label>
        <label className="block text-sm font-bold text-ink">
          City
          <input
            type="text"
            name="city"
            required
            autoComplete="address-level2"
            defaultValue={contact?.city ?? initialContact?.city ?? ""}
            className={inputClass}
          />
        </label>
        <label className="block text-sm font-bold text-ink">
          State / region
          <input
            type="text"
            name="stateRegion"
            required
            autoComplete="address-level1"
            defaultValue={contact?.stateRegion ?? initialContact?.stateRegion ?? ""}
            className={inputClass}
          />
        </label>
        <label className="block text-sm font-bold text-ink">
          Postal code
          <input
            type="text"
            name="postalCode"
            required
            autoComplete="postal-code"
            defaultValue={contact?.postalCode ?? initialContact?.postalCode ?? ""}
            className={inputClass}
          />
        </label>
        <label className="block text-sm font-bold text-ink">
          Country
          <input
            type="text"
            name="country"
            autoComplete="country-name"
            defaultValue={contact?.country ?? initialContact?.country ?? "US"}
            className={inputClass}
          />
        </label>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="border-2 border-palm bg-palm px-4 py-2 text-sm font-bold text-white hover:bg-palm-mid disabled:opacity-50"
          >
            {pending ? "Saving…" : saved ? "Update shipping address" : "Save shipping address"}
          </button>
        </div>
      </form>
    </div>
  );
}
