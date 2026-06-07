"use server";

const UMAMI_URL = process.env.UMAMI_URL;
const UMAMI_KEY = process.env.UMAMI_API_KEY;
const WEBSITE_ID = process.env.UMAMI_WEBSITE_ID;

const headers = {
  Accept: "application/json",
  "x-umami-api-key": UMAMI_KEY!,
};

function getDateRange(range: string): { startAt: number; endAt: number } {
  const now = Date.now();
  const day = 86400000;
  const ranges: Record<string, number> = {
    "today":        new Date().setHours(0, 0, 0, 0),
    "24 hours":     1  * day,
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
    case "24 hours":   return "hour";
    case "one month":  return "day";
    case "three months":
    case "6 months":   return "week";
    case "this year":
    case "all time":   return "month";
    default:           return "month";
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
  const base = `${UMAMI_URL}/v1/websites/${WEBSITE_ID}`;

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
    fetch(`${base}/metrics?${params}&type=url&limit=10`,      { headers, cache: "no-store" }),
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
    name: formatChartLabel(pv.x, unit),
    pageviews: pv.y,
    visitors: pageviews.sessions?.[i]?.y ?? 0,
  }));

  function toList(arr: any[], labelKey = "x", valueKey = "y") {
    const total = (arr ?? []).reduce((s: number, r: any) => s + r[valueKey], 0);
    return (arr ?? []).map((r: any) => ({
      label: r[labelKey] || "Direct",
      value: r[valueKey],
      pct: total ? Math.round((r[valueKey] / total) * 100) : 0,
    }));
  }
  const totalCountryVisitors = (countries ?? []).reduce((s: number, c: any) => s + c.y, 0);
  const countryData = (countries ?? []).map((c: any) => ({
    label: c.x,
    value: c.y,
    _code: c.x,
    pct: totalCountryVisitors ? Math.round((c.y / totalCountryVisitors) * 100) : 0,
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

    countries: toList(countries),
    regions:   toList(regions),
    cities:    toList(cities),
  };
}

export async function getActiveVisitors(): Promise<number> {
  try {
    const res = await fetch(
      `${UMAMI_URL}/v1/websites/${WEBSITE_ID}/active`,
      { headers, cache: "no-store" }
    );
    if (!res.ok) return 0;
    const data = await res.json();
    return data.visitors ?? 0;
  } catch {
    return 0;
  }
}
