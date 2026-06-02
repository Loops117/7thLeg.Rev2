/**
 * Map customer address (country + state/region) to Natural Earth `iso_3166_2`
 * admin-1 codes for US, Canada, and Mexico.
 */

const US_NAMES: Record<string, string> = {
  alabama: "US-AL",
  alaska: "US-AK",
  arizona: "US-AZ",
  arkansas: "US-AR",
  california: "US-CA",
  colorado: "US-CO",
  connecticut: "US-CT",
  delaware: "US-DE",
  "district of columbia": "US-DC",
  florida: "US-FL",
  georgia: "US-GA",
  hawaii: "US-HI",
  idaho: "US-ID",
  illinois: "US-IL",
  indiana: "US-IN",
  iowa: "US-IA",
  kansas: "US-KS",
  kentucky: "US-KY",
  louisiana: "US-LA",
  maine: "US-ME",
  maryland: "US-MD",
  massachusetts: "US-MA",
  michigan: "US-MI",
  minnesota: "US-MN",
  mississippi: "US-MS",
  missouri: "US-MO",
  montana: "US-MT",
  nebraska: "US-NE",
  nevada: "US-NV",
  "new hampshire": "US-NH",
  "new jersey": "US-NJ",
  "new mexico": "US-NM",
  "new york": "US-NY",
  "north carolina": "US-NC",
  "north dakota": "US-ND",
  ohio: "US-OH",
  oklahoma: "US-OK",
  oregon: "US-OR",
  pennsylvania: "US-PA",
  "rhode island": "US-RI",
  "south carolina": "US-SC",
  "south dakota": "US-SD",
  tennessee: "US-TN",
  texas: "US-TX",
  utah: "US-UT",
  vermont: "US-VT",
  virginia: "US-VA",
  washington: "US-WA",
  "west virginia": "US-WV",
  wisconsin: "US-WI",
  wyoming: "US-WY",
};

const US_ABB: Record<string, string> = {};
for (const [name, iso] of Object.entries(US_NAMES)) {
  const ab = iso.slice(3);
  US_ABB[ab.toLowerCase()] = iso;
  US_ABB[name] = iso;
}

const CA_PROVINCE_CODES = new Set([
  "AB",
  "BC",
  "MB",
  "NB",
  "NL",
  "NS",
  "NT",
  "NU",
  "ON",
  "PE",
  "QC",
  "SK",
  "YT",
]);

const CA_NAMES: Record<string, string> = {
  alberta: "CA-AB",
  "british columbia": "CA-BC",
  manitoba: "CA-MB",
  "new brunswick": "CA-NB",
  "newfoundland and labrador": "CA-NL",
  "northwest territories": "CA-NT",
  "nova scotia": "CA-NS",
  nunavut: "CA-NU",
  ontario: "CA-ON",
  "prince edward island": "CA-PE",
  quebec: "CA-QC",
  québec: "CA-QC",
  saskatchewan: "CA-SK",
  yukon: "CA-YT",
};

const MX_NAMES: Record<string, string> = {
  aguascalientes: "MX-AGU",
  "baja california": "MX-BCN",
  "baja california sur": "MX-BCS",
  campeche: "MX-CAM",
  chiapas: "MX-CHP",
  chihuahua: "MX-CHH",
  coahuila: "MX-COA",
  colima: "MX-COL",
  durango: "MX-DUR",
  guanajuato: "MX-GUA",
  guerrero: "MX-GRO",
  hidalgo: "MX-HID",
  jalisco: "MX-JAL",
  méxico: "MX-MEX",
  "estado de méxico": "MX-MEX",
  "estado de mexico": "MX-MEX",
  "mexico state": "MX-MEX",
  michoacán: "MX-MIC",
  michoacan: "MX-MIC",
  morelos: "MX-MOR",
  nayarit: "MX-NAY",
  "nuevo león": "MX-NLE",
  "nuevo leon": "MX-NLE",
  oaxaca: "MX-OAX",
  puebla: "MX-PUE",
  querétaro: "MX-QUE",
  queretaro: "MX-QUE",
  "quintana roo": "MX-ROO",
  "san luis potosí": "MX-SLP",
  "san luis potosi": "MX-SLP",
  sinaloa: "MX-SIN",
  sonora: "MX-SON",
  tabasco: "MX-TAB",
  tamaulipas: "MX-TAM",
  tlaxcala: "MX-TLA",
  veracruz: "MX-VER",
  yucatán: "MX-YUC",
  yucatan: "MX-YUC",
  zacatecas: "MX-ZAC",
  "ciudad de méxico": "MX-DIF",
  "ciudad de mexico": "MX-DIF",
  "mexico city": "MX-DIF",
  cdmx: "MX-DIF",
};

function normCountry(c: string | null | undefined): "US" | "CA" | "MX" | null {
  const t = (c ?? "").trim().toLowerCase();
  if (!t) return null;
  if (
    t === "us" ||
    t === "usa" ||
    t === "u.s." ||
    t === "u.s.a." ||
    t === "united states" ||
    t === "united states of america" ||
    t === "america"
  ) {
    return "US";
  }
  if (t === "ca" || t === "can" || t === "canada") return "CA";
  if (t === "mx" || t === "mex" || t === "mexico" || t === "méxico") return "MX";
  return null;
}

function cleanState(s: string | null | undefined): string {
  let t = (s ?? "").trim().replace(/\s+/g, " ");
  t = t.replace(/^(state|province|territory|estado)\s+of\s+/i, "");
  return t;
}

/** When country is missing, infer ISO 3166-2 from state/province alone (NA only). */
function regionIsoFromStateOnly(state: string): string | null {
  const st = cleanState(state);
  if (!st) return null;
  const low = st.toLowerCase();

  if (/^[a-z]{2}-[a-z]{2,3}$/i.test(st)) {
    const up = st.toUpperCase();
    if (up.startsWith("US-") || up.startsWith("CA-") || up.startsWith("MX-")) return up;
  }

  if (st.length === 2) {
    const up = st.toUpperCase();
    if (CA_PROVINCE_CODES.has(up)) return `CA-${up}`;
    const us = US_ABB[low];
    if (us) return us;
  }

  return US_NAMES[low] ?? CA_NAMES[low] ?? MX_NAMES[low] ?? null;
}

/** Returns ISO 3166-2 admin code (e.g. US-CA) or null if not mapped. */
export function shippingRegionIso3166_2(
  country: string | null | undefined,
  stateRegion: string | null | undefined,
): string | null {
  const st = cleanState(stateRegion);
  if (!st) return null;

  let cc = normCountry(country);
  if (!cc) {
    const inferred = regionIsoFromStateOnly(st);
    return inferred ? inferred.toUpperCase() : null;
  }

  const low = st.toLowerCase();

  if (/^[a-z]{2}-[a-z]{2,3}$/i.test(st)) {
    const up = st.toUpperCase();
    if (up.startsWith("US-") || up.startsWith("CA-") || up.startsWith("MX-")) return up;
  }

  let iso: string | null = null;
  if (cc === "US") {
    if (st.length === 2) iso = US_ABB[low] ?? null;
    else iso = US_NAMES[low] ?? US_ABB[low] ?? null;
  } else if (cc === "CA") {
    if (st.length === 2) {
      const k = `CA-${st.toUpperCase()}`;
      if (/^CA-[A-Z]{2}$/.test(k)) iso = k;
    } else iso = CA_NAMES[low] ?? null;
  } else {
    iso = MX_NAMES[low] ?? null;
  }

  return iso ? iso.toUpperCase() : null;
}
