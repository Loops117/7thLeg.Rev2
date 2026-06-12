"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveGuestCheckoutContactAction } from "@/app/actions/guest-checkout";
import { btnMainMd } from "@/lib/btn-theme-classes";
import type { GuestCheckoutContact } from "@/lib/guest-checkout-contact";

type Props = {
  initialContact: GuestCheckoutContact | null;
  guestMode?: boolean;
  /** When set, email is shown read-only (signed-in customer). */
  accountEmail?: string | null;
  /** Server-known: shipping cookie already saved and complete. */
  contactSaved?: boolean;
};

const fieldClass = "cart-field mt-1 text-base";

function formatSavedAddress(contact: GuestCheckoutContact): string {
  const line2 = contact.addressLine2 ? `, ${contact.addressLine2}` : "";
  const country =
    contact.country && contact.country !== "US" ? `, ${contact.country}` : "";
  return `${contact.addressLine1}${line2}, ${contact.city}, ${contact.stateRegion} ${contact.postalCode}${country}`;
}

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
  const [editing, setEditing] = useState(!contactSaved);
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
        setEditing(true);
        return;
      }
      setContact(res.contact);
      setSaved(true);
      setEditing(false);
      router.refresh();
    });
  }

  const emailValue = accountEmail?.trim() || contact?.email || initialContact?.email || "";
  const displayContact = contact ?? initialContact;

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
      {error ? <p className="mt-2 text-sm font-medium text-coral">{error}</p> : null}
      {saved && displayContact && !editing ? (
        <div className="cart-panel__inset mt-3">
          <p className="text-sm font-bold text-lagoon-dark">Saved for checkout</p>
          <p className="cart-panel__text mt-2">
            <strong className="text-[var(--product-card-title)]">{displayContact.displayName}</strong>
            {guestMode ? <> · {displayContact.email}</> : null}
            <br />
            {formatSavedAddress(displayContact)}
          </p>
          {!guestMode && emailValue ? (
            <p className="cart-panel__muted mt-2">
              Email: <span className="font-mono">{emailValue}</span>
            </p>
          ) : null}
          <button
            type="button"
            disabled={pending}
            onClick={() => setEditing(true)}
            className={`${btnMainMd} mt-3`}
          >
            Edit address
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
          {guestMode ? (
            <label className="cart-panel__label block text-sm font-bold sm:col-span-2">
              Email
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                defaultValue={emailValue}
                className={fieldClass}
              />
            </label>
          ) : (
            <div className="sm:col-span-2">
              <p className="cart-panel__label text-sm font-bold">Email</p>
              <p className="cart-panel__text mt-1 font-mono text-sm">{emailValue}</p>
            </div>
          )}
          <label className="cart-panel__label block text-sm font-bold sm:col-span-2">
            Full name
            <input
              type="text"
              name="displayName"
              required
              autoComplete="name"
              defaultValue={displayContact?.displayName ?? ""}
              className={fieldClass}
            />
          </label>
          <label className="cart-panel__label block text-sm font-bold sm:col-span-2">
            Address line 1
            <input
              type="text"
              name="addressLine1"
              required
              autoComplete="address-line1"
              defaultValue={displayContact?.addressLine1 ?? ""}
              className={fieldClass}
            />
          </label>
          <label className="cart-panel__label block text-sm font-bold sm:col-span-2">
            Address line 2 <span className="font-normal cart-panel__muted">(optional)</span>
            <input
              type="text"
              name="addressLine2"
              autoComplete="address-line2"
              defaultValue={displayContact?.addressLine2 ?? ""}
              className={fieldClass}
            />
          </label>
          <label className="cart-panel__label block text-sm font-bold">
            City
            <input
              type="text"
              name="city"
              required
              autoComplete="address-level2"
              defaultValue={displayContact?.city ?? ""}
              className={fieldClass}
            />
          </label>
          <label className="cart-panel__label block text-sm font-bold">
            State / region
            <input
              type="text"
              name="stateRegion"
              required
              autoComplete="address-level1"
              defaultValue={displayContact?.stateRegion ?? ""}
              className={fieldClass}
            />
          </label>
          <label className="cart-panel__label block text-sm font-bold">
            Postal code
            <input
              type="text"
              name="postalCode"
              required
              autoComplete="postal-code"
              defaultValue={displayContact?.postalCode ?? ""}
              className={fieldClass}
            />
          </label>
          <label className="cart-panel__label block text-sm font-bold">
            Country
            <input
              type="text"
              name="country"
              autoComplete="country-name"
              defaultValue={displayContact?.country ?? "US"}
              className={fieldClass}
            />
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={pending}
              className={btnMainMd}
            >
              {pending ? "Saving…" : saved ? "Update shipping address" : "Save shipping address"}
            </button>
            {saved && displayContact ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setEditing(false);
                  setError("");
                }}
                className="border-2 border-[color-mix(in_srgb,var(--product-card-border)_55%,transparent)] bg-transparent px-4 py-2 text-sm font-bold text-[var(--product-card-title)] hover:bg-[color-mix(in_srgb,var(--product-card-title)_8%,var(--product-card-bg)_92%)] disabled:opacity-50"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      )}
    </div>
  );
}
