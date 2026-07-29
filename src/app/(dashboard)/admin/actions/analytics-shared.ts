const UMAMI_URL = process.env.UMAMI_URL;
const UMAMI_USERNAME = process.env.UMAMI_USERNAME;
const UMAMI_PASSWORD = process.env.UMAMI_PASSWORD;
const WEBSITE_ID = process.env.UMAMI_WEBSITE_ID;

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

async function getBearerToken(): Promise<string> {
  const now = Date.now();

  if (cachedToken && now < tokenExpiry) {
    return cachedToken;
  }

  const res = await fetch(`${UMAMI_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: UMAMI_USERNAME,
      password: UMAMI_PASSWORD,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Umami login failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  cachedToken = data.token;
  tokenExpiry = now + 23 * 60 * 60 * 1000;
  return cachedToken!;
}

async function getHeaders() {
  const token = await getBearerToken();
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function getDateRange(range: string): { startAt: number; endAt: number } {
  const now = Date.now();
  const day = 86400000;
  const ranges: Record<string, number> = {
    "today":        new Date().setHours(0, 0, 0, 0),
    "24 hours":     1   * day,
    "one month":    30  * day,
    "three months": 90  * day,
    "6 months":     180 * day,
    "this year":    365 * day,
    "all time":     5 * 365 * day,
  };

  if (range === "today") {
    return {
      startAt: new Date().setHours(0, 0, 0, 0),
      endAt:   now,
    };
  }

  return {
    startAt: now - (ranges[range] ?? ranges["all time"]),
    endAt:   now,
  };
}

function getChartUnit(range: string): string {
  switch (range) {
    case "today":
    case "24 hours":      return "hour";
    case "one month":     return "day";
    case "three months":
    case "6 months":      return "week";
    case "this year":
    case "all time":      return "month";
    default:              return "month";
  }
}

function formatChartLabel(dateStr: string, unit: string): string {
  const date = new Date(dateStr);
  switch (unit) {
    case "hour":  return date.toLocaleString("default", { hour: "numeric", hour12: true });
    case "day":   return date.toLocaleString("default", { month: "short", day: "numeric" });
    case "week":  return date.toLocaleString("default", { month: "short", day: "numeric" });
    case "month": return date.toLocaleString("default", { month: "short", year: "2-digit" });
    default:      return dateStr;
  }
}

export async function getAnalyticsData(dateRange = "all time") {
  const { startAt, endAt } = getDateRange(dateRange);
  const unit = getChartUnit(dateRange);
  const params = `startAt=${startAt}&endAt=${endAt}`;
  const base = `${UMAMI_URL}/api/websites/${WEBSITE_ID}`;

  const headers = await getHeaders();

  const [
    statsRes, pageviewsRes,
    countriesRes, regionsRes, citiesRes,
    devicesRes, browsersRes, osRes,
    referrersRes, channelsRes,
    urlsRes, entryRes, exitRes,
  ] = await Promise.all([
    fetch(`${base}/stats?${params}`,                          { headers, cache: "no-store" }),
    fetch(`${base}/pageviews?${params}&unit=${unit}`,         { headers, cache: "no-store" }),
    fetch(`${base}/metrics?${params}&type=country&limit=10`,  { headers, cache: "no-store" }),
    fetch(`${base}/metrics?${params}&type=region&limit=10`,   { headers, cache: "no-store" }),
    fetch(`${base}/metrics?${params}&type=city&limit=10`,     { headers, cache: "no-store" }),
    fetch(`${base}/metrics?${params}&type=device&limit=10`,   { headers, cache: "no-store" }),
    fetch(`${base}/metrics?${params}&type=browser&limit=10`,  { headers, cache: "no-store" }),
    fetch(`${base}/metrics?${params}&type=os&limit=10`,       { headers, cache: "no-store" }),
    fetch(`${base}/metrics?${params}&type=referrer&limit=10`, { headers, cache: "no-store" }),
    fetch(`${base}/metrics?${params}&type=channel&limit=10`,  { headers, cache: "no-store" }),
    fetch(`${base}/metrics?${params}&type=path&limit=10`,     { headers, cache: "no-store" }),
    fetch(`${base}/metrics?${params}&type=entry&limit=10`,    { headers, cache: "no-store" }),
    fetch(`${base}/metrics?${params}&type=exit&limit=10`,     { headers, cache: "no-store" }),
  ]);

  if (!statsRes.ok) {
    throw new Error(`Umami API error: ${statsRes.status} ${statsRes.statusText}`);
  }

  const [
    stats, pageviews,
    countries, regions, cities,
    devices, browsers, os,
    referrers, channels,
    urls, entryPages, exitPages,
  ] = await Promise.all([
    statsRes.json(), pageviewsRes.json(),
    countriesRes.json(), regionsRes.json(), citiesRes.json(),
    devicesRes.json(), browsersRes.json(), osRes.json(),
    referrersRes.json(), channelsRes.json(),
    urlsRes.json(), entryRes.json(), exitRes.json(),
  ]);

  const chartData = (pageviews.pageviews ?? []).map((pv: any, i: number) => ({
    name:      formatChartLabel(pv.x, unit),
    pageviews: pv.y,
    visitors:  pageviews.sessions?.[i]?.y ?? 0,
  }));

  function toList(arr: any, labelKey = "x", valueKey = "y") {
    const safeArr = Array.isArray(arr) ? arr : (arr?.data ?? arr?.items ?? []);
    const resolvedValueKey = safeArr.length > 0
      ? (safeArr[0][valueKey] !== undefined ? valueKey : "v")
      : valueKey;
    const total = safeArr.reduce((s: number, r: any) => s + (r[resolvedValueKey] ?? 0), 0);
    return safeArr.map((r: any) => ({
      ...r,
      label: r[labelKey] || r["x"] || "Direct",
      value: r[resolvedValueKey] ?? 0,
      pct:   total ? Math.round(((r[resolvedValueKey] ?? 0) / total) * 100) : 0,
      country: r.country ?? r.countryCode ?? r.country_code ?? r.c ?? null,
    }));
  }

  const safeCountries = Array.isArray(countries) ? countries : (countries?.data ?? countries?.items ?? []);
  const totalCountryVisitors = safeCountries.reduce((s: number, c: any) => s + c.y, 0);
  const countryData = safeCountries.map((c: any) => ({
    label: c.x,
    value: c.y,
    _code: c.x,
    pct:   totalCountryVisitors ? Math.round((c.y / totalCountryVisitors) * 100) : 0,
  }));

  return {
    totalVisitors:  stats.visitors  ?? 0,
    totalPageviews: stats.pageviews ?? 0,
    avgSessionTime: stats.totaltime ?? 0,
    bounceRate: stats.visits
      ? Math.round((stats.bounces / stats.visits) * 100)
      : 0,

    chartData,

    urls:       toList(urls),
    entryPages: toList(entryPages),
    exitPages:  toList(exitPages),

    referrers: toList(referrers),
    channels:  toList(channels),

    devices:  toList(devices),
    browsers: toList(browsers),
    os:       toList(os),

    countries: countryData,
    regions:   toList(regions),
    cities:    toList(cities),
  };
}

export async function getActiveVisitors(): Promise<number> {
  try {
    const headers = await getHeaders();
    const res = await fetch(
      `${UMAMI_URL}/api/websites/${WEBSITE_ID}/active`,
      { headers, cache: "no-store" }
    );
    if (!res.ok) return 0;
    const data = await res.json();
    return data.visitors ?? 0;
  } catch {
    return 0;
  }
}

export async function getActiveVisitors30m(): Promise<number> {
  try {
    const headers = await getHeaders();
    const endAt = Date.now();
    const startAt = endAt - 30 * 60 * 1000;
    const base = `${UMAMI_URL}/api/websites/${WEBSITE_ID}`;
    const res = await fetch(
      `${base}/stats?startAt=${startAt}&endAt=${endAt}`,
      { headers, cache: "no-store" }
    );
    if (!res.ok) return 0;
    const data = await res.json();
    return data.visitors ?? 0;
  } catch {
    return 0;
  }
}

const CHART_ZOOM_CONFIG: Record<string, { unit: string; spanMs: number }> = {
  year:  { unit: "year",  spanMs: 5 * 365 * 86400000 },
  month: { unit: "month", spanMs: 2 * 365 * 86400000 },
  day:   { unit: "day",   spanMs: 90 * 86400000 },
  time:  { unit: "hour",  spanMs: 48 * 3600000 },
};

function formatChartZoomLabel(dateStr: string, unit: string): string {
  const date = new Date(dateStr);
  switch (unit) {
    case "year":  return date.getFullYear().toString();
    case "month": return date.toLocaleString("default", { month: "short", year: "2-digit" });
    case "day":   return date.toLocaleString("default", { month: "short", day: "numeric" });
    case "hour":  return date.toLocaleString("default", { hour: "numeric", hour12: true });
    default:      return dateStr;
  }
}

export async function getChartData(zoomLevel: string) {
  const config = CHART_ZOOM_CONFIG[zoomLevel] ?? CHART_ZOOM_CONFIG.day;
  const now = Date.now();
  const startAt = now - config.spanMs;
  const endAt = now;

  const requestUnit = config.unit === "year" ? "month" : config.unit;

  const params = `startAt=${startAt}&endAt=${endAt}&unit=${requestUnit}`;
  const base = `${UMAMI_URL}/api/websites/${WEBSITE_ID}`;
  const headers = await getHeaders();

  const res = await fetch(`${base}/pageviews?${params}`, { headers, cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Umami pageviews error: ${res.status} ${res.statusText}`);
  }
  const pageviews = await res.json();

  const rawPoints = (pageviews.pageviews ?? []).map((pv: any, i: number) => ({
    date:      pv.x,
    pageviews: pv.y,
    visitors:  pageviews.sessions?.[i]?.y ?? 0,
  }));

  if (config.unit !== "year") {
    return rawPoints.map((p: any) => ({
      name: formatChartZoomLabel(p.date, config.unit),
      visitors: p.visitors,
      pageviews: p.pageviews,
    }));
  }

  const byYear = new Map<number, { visitors: number; pageviews: number }>();
  for (const p of rawPoints) {
    const year = new Date(p.date).getFullYear();
    const existing = byYear.get(year) ?? { visitors: 0, pageviews: 0 };
    existing.visitors += p.visitors;
    existing.pageviews += p.pageviews;
    byYear.set(year, existing);
  }

  return Array.from(byYear.entries())
    .sort(([a], [b]) => a - b)
    .map(([year, vals]) => ({
      name: year.toString(),
      visitors: vals.visitors,
      pageviews: vals.pageviews,
    }));
}
