"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { updateCustomerAddress } from "@/app/actions/customer-profile";
import { loadGoogleMapsScript } from "@/lib/google-maps-loader";
import { btnSecondaryMd } from "@/lib/btn-theme-classes";
import { parseGooglePlaceAddress } from "@/lib/parse-google-place";

type Props = {
  initial: {
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    stateRegion: string | null;
    postalCode: string | null;
    country: string | null;
  };
};

const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";

export function CustomerAddressForm({ initial }: Props) {
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
    if (!mapsKey || !line1Ref.current) return;

    let cancelled = false;
    loadGoogleMapsScript(mapsKey)
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
  }, [mapsKey]);

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
      {mapsKey ? (
        <p className="text-xs text-ink/65">
          Start typing your street address for suggestions; pick one to fill the rest, or enter everything manually.
        </p>
      ) : (
        <p className="text-xs text-ink/55">
          Add <code className="rounded bg-black/5 px-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to enable address
          autocomplete (Places API enabled for the key).
        </p>
      )}
      <label className="block text-sm font-bold text-ink">
        Street address
        <input
          ref={line1Ref}
          name="addressLine1"
          value={addressLine1}
          onChange={(e) => setAddressLine1(e.target.value)}
          autoComplete="address-line1"
          className="mt-1 w-full border-2 border-palm-mid bg-white px-3 py-2 text-base text-ink outline-none focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
        />
      </label>
      <label className="block text-sm font-bold text-ink">
        Apt, suite, unit (optional)
        <input
          name="addressLine2"
          value={addressLine2}
          onChange={(e) => setAddressLine2(e.target.value)}
          autoComplete="address-line2"
          className="mt-1 w-full border-2 border-palm-mid bg-white px-3 py-2 text-base text-ink outline-none focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-bold text-ink">
          City
          <input
            name="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            autoComplete="address-level2"
            className="mt-1 w-full border-2 border-palm-mid bg-white px-3 py-2 text-base text-ink outline-none focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
          />
        </label>
        <label className="block text-sm font-bold text-ink">
          State / province
          <input
            name="stateRegion"
            value={stateRegion}
            onChange={(e) => setStateRegion(e.target.value)}
            autoComplete="address-level1"
            className="mt-1 w-full border-2 border-palm-mid bg-white px-3 py-2 text-base text-ink outline-none focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
          />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-bold text-ink">
          ZIP / postal code
          <input
            name="postalCode"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            autoComplete="postal-code"
            className="mt-1 w-full border-2 border-palm-mid bg-white px-3 py-2 text-base text-ink outline-none focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
          />
        </label>
        <label className="block text-sm font-bold text-ink">
          Country
          <input
            name="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            autoComplete="country-name"
            placeholder="e.g. United States"
            className="mt-1 w-full border-2 border-palm-mid bg-white px-3 py-2 text-base text-ink outline-none focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
          />
        </label>
      </div>
      {error ? <p className="text-sm font-medium text-coral">{error}</p> : null}
      {saved ? <p className="text-sm font-medium text-palm">Address saved.</p> : null}
      <button
        type="submit"
        disabled={pending}
        className={btnSecondaryMd}
      >
        {pending ? "Saving…" : "Save address"}
      </button>
    </form>
  );
}
