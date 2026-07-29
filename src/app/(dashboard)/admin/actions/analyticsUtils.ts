// ISO 3166-2 region code → human name
// Covers top regions worldwide. Add more as needed.
const regionMap: Record<string, string> = {
  // Sri Lanka
  "LK-1": "Western Province",    "LK-2": "Central Province",
  "LK-3": "Southern Province",   "LK-4": "Northern Province",
  "LK-5": "Eastern Province",    "LK-6": "North Western Province",
  "LK-7": "North Central Province","LK-8": "Uva Province",
  "LK-9": "Sabaragamuwa Province",
  // USA
  "US-CA": "California",  "US-NY": "New York",    "US-TX": "Texas",
  "US-FL": "Florida",     "US-IL": "Illinois",    "US-WA": "Washington",
  "US-MA": "Massachusetts","US-GA": "Georgia",    "US-NC": "North Carolina",
  "US-VA": "Virginia",    "US-OH": "Ohio",        "US-PA": "Pennsylvania",
  "US-AZ": "Arizona",     "US-CO": "Colorado",    "US-MI": "Michigan",
  // UK
  "GB-ENG": "England",    "GB-SCT": "Scotland",   "GB-WLS": "Wales",
  "GB-NIR": "Northern Ireland",
  // India
  "IN-MH": "Maharashtra", "IN-KA": "Karnataka",  "IN-TN": "Tamil Nadu",
  "IN-DL": "Delhi",       "IN-GJ": "Gujarat",    "IN-WB": "West Bengal",
  "IN-RJ": "Rajasthan",   "IN-UP": "Uttar Pradesh","IN-KL": "Kerala",
  "IN-AP": "Andhra Pradesh","IN-TS": "Telangana", "IN-PB": "Punjab",
  // Australia
  "AU-NSW": "New South Wales","AU-VIC": "Victoria","AU-QLD": "Queensland",
  "AU-WA": "Western Australia","AU-SA": "South Australia",
  // Germany
  "DE-BY": "Bavaria",     "DE-BE": "Berlin",      "DE-NW": "North Rhine-Westphalia",
  "DE-HH": "Hamburg",     "DE-HE": "Hesse",
  // Canada
  "CA-ON": "Ontario",     "CA-QC": "Quebec",      "CA-BC": "British Columbia",
  "CA-AB": "Alberta",     "CA-MB": "Manitoba",
  // France
  "FR-IDF": "Île-de-France","FR-ARA": "Auvergne-Rhône-Alpes",
  // Singapore
  "SG-01": "Central Singapore",
  // Japan
  "JP-13": "Tokyo",       "JP-27": "Osaka",       "JP-23": "Aichi",
  // UAE
  "AE-DU": "Dubai",       "AE-AZ": "Abu Dhabi",   "AE-SH": "Sharjah",
};

export function decodeRegion(code: string): string {
  if (!code) return "Unknown";
  if (regionMap[code]) return regionMap[code];
  // Fallback: strip country prefix and return code part
  const parts = code.split("-");
  return parts.length > 1 ? parts.slice(1).join("-") : code;
}

// Country code from region code (e.g. "LK-1" → "LK")
export function regionToCountry(code: string): string {
  if (!code) return "";
  return code.split("-")[0];
}

// Browser SVG logos (Simple Icons CDN)
export function getBrowserLogo(name: string): string | null {
  const map: Record<string, string> = {
    chrome:  "https://cdn.simpleicons.org/googlechrome/4285F4",
    firefox: "https://cdn.simpleicons.org/firefox/FF7139",
    safari:  "https://cdn.simpleicons.org/safari/006CFF",
    edge:    "https://cdn.simpleicons.org/microsoftedge/0078D7",
    opera:   "https://cdn.simpleicons.org/opera/FF1B2D",
    brave:   "https://cdn.simpleicons.org/brave/FB542B",
    samsung: "https://cdn.simpleicons.org/samsung/1428A0",
    vivaldi: "https://cdn.simpleicons.org/vivaldi/EF3939",
    arc:     "https://cdn.simpleicons.org/arc/FCBFBD",
    duckduckgo: "https://cdn.simpleicons.org/duckduckgo/DE5833",
  };
  const key = name?.toLowerCase().replace(/\s+/g, "");
  return map[key] ?? null;
}

// OS SVG logos
export function getOsLogo(name: string): string | null {
  const map: Record<string, string> = {
    windows:    "https://cdn.simpleicons.org/windows/0078D4",
    "windows 10":"https://cdn.simpleicons.org/windows/0078D4",
    "windows 11":"https://cdn.simpleicons.org/windows/0078D4",
    macos:      "https://cdn.simpleicons.org/apple/ffffff",
    "mac os":   "https://cdn.simpleicons.org/apple/ffffff",
    ios:        "https://cdn.simpleicons.org/apple/ffffff",
    android:    "https://cdn.simpleicons.org/android/3DDC84",
    linux:      "https://cdn.simpleicons.org/linux/ffffff",
    ubuntu:     "https://cdn.simpleicons.org/ubuntu/E95420",
    chromeos:   "https://cdn.simpleicons.org/googlechrome/4285F4",
  };
  const key = name?.toLowerCase().replace(/\s+/g, " ").trim();
  // try exact, then partial match
  if (map[key]) return map[key];
  for (const [k, v] of Object.entries(map)) {
    if (key?.includes(k) || k.includes(key ?? "")) return v;
  }
  return null;
}


// ISO 3166-1 alpha-2 → country name
const countryNameMap: Record<string, string> = {
  US: "United States", GB: "United Kingdom",
  IN: "India",       AU: "Australia",     DE: "Germany",
  CA: "Canada",      FR: "France",        SG: "Singapore",
  JP: "Japan",       AE: "UAE",           CN: "China",
  BR: "Brazil",      ZA: "South Africa",  NG: "Nigeria",
  PK: "Pakistan",    BD: "Bangladesh",    PH: "Philippines",
  ID: "Indonesia",   MY: "Malaysia",      TH: "Thailand",
  VN: "Vietnam",     KR: "South Korea",   NL: "Netherlands",
  ES: "Spain",       IT: "Italy",         PL: "Poland",
  SE: "Sweden",      NO: "Norway",        DK: "Denmark",
  FI: "Finland",     CH: "Switzerland",   AT: "Austria",
  BE: "Belgium",     PT: "Portugal",      IE: "Ireland",
  NZ: "New Zealand", MX: "Mexico",        AR: "Argentina",
  CL: "Chile",       CO: "Colombia",      PE: "Peru",
  EG: "Egypt",       KE: "Kenya",         GH: "Ghana",
  ET: "Ethiopia",    TZ: "Tanzania",      RU: "Russia",
  TR: "Turkey",      SA: "Saudi Arabia",  IL: "Israel",
  QA: "Qatar",       KW: "Kuwait",        OM: "Oman",
  BH: "Bahrain",     JO: "Jordan",        LB: "Lebanon",
  IQ: "Iraq",        IR: "Iran",          AF: "Afghanistan",
  MM: "Myanmar",     KH: "Cambodia",      LA: "Laos",
  NP: "Nepal",       LK: "Sri Lanka",     MV: "Maldives",
  HK: "Hong Kong",   TW: "Taiwan",        MO: "Macau",
};

export function decodeCountry(code: string): string {
  if (!code) return "Unknown";
  const upper = code.toUpperCase();
  return countryNameMap[upper] ?? code;
}

const cityCountryMap: Record<string, string> = {
  // Sri Lanka
  colombo: "LK", kandy: "LK", galle: "LK", jaffna: "LK", negombo: "LK",
  batticaloa: "LK", trincomalee: "LK", kurunegala: "LK", ratnapura: "LK",
  anuradhapura: "LK", badulla: "LK", matara: "LK", "nuwara eliya": "LK",
  gampaha: "LK", kalutara: "LK", moratuwa: "LK", dehiwala: "LK", maharagama: "LK",
  kotte: "LK", "sri jayawardenepura kotte": "LK",

  // United States
  "new york": "US", "los angeles": "US", chicago: "US", houston: "US",
  phoenix: "US", philadelphia: "US", "san antonio": "US", "san diego": "US",
  dallas: "US", "san jose": "US", austin: "US", seattle: "US",
  "san francisco": "US", washington: "US", boston: "US", atlanta: "US",
  miami: "US", denver: "US", "las vegas": "US", portland: "US",

  // United Kingdom
  london: "GB", manchester: "GB", birmingham: "GB", glasgow: "GB",
  edinburgh: "GB", liverpool: "GB", bristol: "GB", leeds: "GB",
  belfast: "GB", cardiff: "GB", cambridge: "GB", oxford: "GB",

  // India
  mumbai: "IN", delhi: "IN", bengaluru: "IN", bangalore: "IN",
  hyderabad: "IN", chennai: "IN", kolkata: "IN", ahmedabad: "IN",
  pune: "IN", jaipur: "IN", surat: "IN", lucknow: "IN",

  // Australia
  sydney: "AU", melbourne: "AU", brisbane: "AU", perth: "AU",
  adelaide: "AU", "gold coast": "AU", canberra: "AU",

  // Canada
  toronto: "CA", vancouver: "CA", montreal: "CA", calgary: "CA",
  ottawa: "CA", edmonton: "CA",

  // Germany
  berlin: "DE", munich: "DE", hamburg: "DE", frankfurt: "DE",
  cologne: "DE", stuttgart: "DE", düsseldorf: "DE", dusseldorf: "DE",

  // France
  paris: "FR", marseille: "FR", lyon: "FR", toulouse: "FR", nice: "FR",

  // Japan
  tokyo: "JP", osaka: "JP", kyoto: "JP", yokohama: "JP", nagoya: "JP",

  // UAE
  dubai: "AE", "abu dhabi": "AE", sharjah: "AE",

  // Singapore
  singapore: "SG",

  // Netherlands
  amsterdam: "NL", rotterdam: "NL",

  // Other common cities
  dublin: "IE", auckland: "NZ", seoul: "KR", bangkok: "TH",
  "kuala lumpur": "MY", jakarta: "ID", manila: "PH", dhaka: "BD",
  karachi: "PK", istanbul: "TR", cairo: "EG", riyadh: "SA",
};

export function getCityCountryCode(cityName: string, itemCountry?: string): string {
  if (itemCountry && typeof itemCountry === "string" && itemCountry.length === 2) {
    return itemCountry.toUpperCase();
  }
  if (!cityName) return "";
  const key = cityName.toLowerCase().trim();
  if (cityCountryMap[key]) return cityCountryMap[key];
  return "";
}