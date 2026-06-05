"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { updateCustomerAddress } from "@/app/actions/customer-profile";
import { loadGoogleMapsScript } from "@/lib/google-maps-loader";
import { btnSecondaryMd } from "@/lib/btn-theme-classes";
import { parseGooglePlaceAddress } from "@/lib/parse-google-place";

type Props = {
  mapsApiKey: string;
  initial: {
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    stateRegion: string | null;
    postalCode: string | null;
    country: string | null;
  };
};

export function CustomerAddressForm({ mapsApiKey, initial }: Props) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [addressLine1, setAddressLine1] = useState(initial.addressLine1 ?? "");
  const [addressLine2, setAddressLine2] = useState(initial.addressLine2 ?? "");
  const [city, setCity] = useState(initial.city ?? "");
  const [stateRegion, setStateRegion] = useState(initial.stateRegion ?? "");
  const [postalCode, setPostalCode] = useState(initial.postalCode ?? "");
  const [country, setCountry] = useState(initial.country ?? "");
  const line1Ref = useRef<HTMLInputElement>(null);
  const acInstanceRef = useRef<google.maps.places.Autocomplete | null>(null);
  const autocompleteEnabled = mapsApiKey.trim().length > 0;

  useEffect(() => {
    setAddressLine1(initial.addressLine1 ?? "");
    setAddressLine2(initial.addressLine2 ?? "");
    setCity(initial.city ?? "");
    setStateRegion(initial.stateRegion ?? "");
    setPostalCode(initial.postalCode ?? "");
    setCountry(initial.country ?? "");
  }, [
    initial.addressLine1,
    initial.addressLine2,
    initial.city,
    initial.stateRegion,
    initial.postalCode,
    initial.country,
  ]);

  useEffect(() => {
    if (!autocompleteEnabled || !line1Ref.current) return;

    let cancelled = false;
    loadGoogleMapsScript(mapsApiKey)
      .then(() => {
        if (cancelled || !line1Ref.current) return;
        const ac = new google.maps.places.Autocomplete(line1Ref.current, {
          types: ["address"],
          fields: ["address_components", "formatted_address"],
        });
        acInstanceRef.current = ac;
        ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          if (!place?.address_components?.length) return;
          const p = parseGooglePlaceAddress(place);
          setAddressLine1(p.addressLine1);
          setAddressLine2(p.addressLine2);
          setCity(p.city);
          setStateRegion(p.stateRegion);
          setPostalCode(p.postalCode);
          setCountry(p.country);
        });
      })
      .catch(() => {
        /* manual entry still works */
      });

    return () => {
      cancelled = true;
      if (acInstanceRef.current && typeof google !== "undefined") {
        google.maps.event.clearInstanceListeners(acInstanceRef.current);
        acInstanceRef.current = null;
      }
    };
  }, [autocompleteEnabled, mapsApiKey]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaved(false);
    const fd = new FormData();
    fd.set("addressLine1", addressLine1);
    fd.set("addressLine2", addressLine2);
    fd.set("city", city);
    fd.set("stateRegion", stateRegion);
    fd.set("postalCode", postalCode);
    fd.set("country", country);
    startTransition(async () => {
      const res = await updateCustomerAddress(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4">
      {autocompleteEnabled ? (
        <p className="account-panel__muted">
          Start typing your street address for suggestions; pick one to fill the rest, or enter everything manually.
        </p>
      ) : null}
      <label className="account-panel__label">
        Street address
        <input
          ref={line1Ref}
          name="addressLine1"
          value={addressLine1}
          onChange={(e) => setAddressLine1(e.target.value)}
          autoComplete="address-line1"
          className="account-field"
        />
      </label>
      <label className="account-panel__label">
        Apt, suite, unit (optional)
        <input
          name="addressLine2"
          value={addressLine2}
          onChange={(e) => setAddressLine2(e.target.value)}
          autoComplete="address-line2"
          className="account-field"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="account-panel__label">
          City
          <input
            name="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            autoComplete="address-level2"
            className="account-field"
          />
        </label>
        <label className="account-panel__label">
          State / province
          <input
            name="stateRegion"
            value={stateRegion}
            onChange={(e) => setStateRegion(e.target.value)}
            autoComplete="address-level1"
            className="account-field"
          />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="account-panel__label">
          ZIP / postal code
          <input
            name="postalCode"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            autoComplete="postal-code"
            className="account-field"
          />
        </label>
        <label className="account-panel__label">
          Country
          <input
            name="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            autoComplete="country-name"
            placeholder="e.g. United States"
            className="account-field"
          />
        </label>
      </div>
      {error ? <p className="text-sm font-medium text-coral">{error}</p> : null}
      {saved ? (
        <p className="text-sm font-bold" style={{ color: "var(--lagoon-dark)" }}>
          Address saved.
        </p>
      ) : null}
      <button type="submit" disabled={pending} className={btnSecondaryMd}>
        {pending ? "Saving…" : "Save address"}
      </button>
    </form>
  );
}
