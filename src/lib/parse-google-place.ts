/** Maps Places `PlaceResult` to our address fields (best-effort by country). */
export function parseGooglePlaceAddress(place: google.maps.places.PlaceResult): {
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateRegion: string;
  postalCode: string;
  country: string;
} {
  const components = place.address_components ?? [];
  const get = (type: string, useShort = false) => {
    const comp = components.find((x) => x.types.includes(type));
    if (!comp) return "";
    return useShort ? comp.short_name : comp.long_name;
  };

  const streetNum = get("street_number");
  const route = get("route");
  const line1 = [streetNum, route].filter(Boolean).join(" ").trim();
  const sub = get("subpremise");
  const line2 = sub ? (sub.startsWith("#") || sub.startsWith("Unit") ? sub : `Unit ${sub}`) : "";

  const city =
    get("locality") ||
    get("sublocality") ||
    get("neighborhood") ||
    get("administrative_area_level_2");

  const state = get("administrative_area_level_1", true) || get("administrative_area_level_1");

  const postal = get("postal_code");
  const country = get("country");

  return {
    addressLine1: line1 || (place.formatted_address?.split(",")[0]?.trim() ?? ""),
    addressLine2: line2,
    city,
    stateRegion: state,
    postalCode: postal,
    country,
  };
}
