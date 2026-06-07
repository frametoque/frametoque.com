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
    "one month":    30  * day,
    "three months": 90  * day,
    "6 months":     180 * day,
    "this year":    365 * day,
    "lifetime":     5 * 365 * day,
  };
  return {
    startAt: now - (ranges[range] ?? ranges["this year"]),
    endAt:   now,
  };
}

export async function getAnalyticsData(dateRange = "this year") {
  const { startAt, endAt } = getDateRange(dateRange);
  const params = `startAt=${startAt}&endAt=${endAt}`;
  const base = `${UMAMI_URL}/v1/websites/${WEBSITE_ID}`;

  console.log("UMAMI_URL:", UMAMI_URL);
  console.log("WEBSITE_ID:", WEBSITE_ID);
  console.log("Fetching:", `${base}/stats?${params}`);

  const [statsRes, pageviewsRes, countriesRes, devicesRes, referrersRes, topPagesRes] =
    await Promise.all([
      fetch(`${base}/stats?${params}`,                         { headers, cache: "no-store" }),
      fetch(`${base}/pageviews?${params}&unit=month`,          { headers, cache: "no-store" }),
      fetch(`${base}/metrics?${params}&type=country&limit=5`,  { headers, cache: "no-store" }),
      fetch(`${base}/metrics?${params}&type=device&limit=5`,   { headers, cache: "no-store" }),
      fetch(`${base}/metrics?${params}&type=referrer&limit=5`, { headers, cache: "no-store" }),
      fetch(`${base}/metrics?${params}&type=url&limit=10`,     { headers, cache: "no-store" }),
    ]);

  // Check for API errors
  if (!statsRes.ok) {
    throw new Error(`Umami API error: ${statsRes.status} ${statsRes.statusText}`);
  }

  const [stats, pageviews, countries, devices, referrers, topPages] =
    await Promise.all([
      statsRes.json(),
      pageviewsRes.json(),
      countriesRes.json(),
      devicesRes.json(),
      referrersRes.json(),
      topPagesRes.json(),
    ]);

  // Chart data — pageviews + sessions per month
  const chartData = (pageviews.pageviews ?? []).map((pv: any, i: number) => ({
    name: new Date(pv.x).toLocaleString("default", { month: "short" }),
    pageviews: pv.y,
    visitors: pageviews.sessions?.[i]?.y ?? 0,
  }));

  // Traffic sources — referrers
  const totalReferrers = (referrers ?? []).reduce((s: number, r: any) => s + r.y, 0);
  const trafficSources = (referrers ?? []).map((r: any) => ({
    source: r.x || "Direct",
    visitors: r.y,
    pct: totalReferrers ? Math.round((r.y / totalReferrers) * 100) : 0,
  }));

  // Devices with percentages
  const totalDevices = (devices ?? []).reduce((s: number, d: any) => s + d.y, 0);
  const deviceData = (devices ?? []).map((d: any) => ({
    name: d.x,
    value: d.y,
    pct: totalDevices ? Math.round((d.y / totalDevices) * 100) : 0,
  }));

  // Countries with percentages
  const totalCountryVisitors = (countries ?? []).reduce((s: number, c: any) => s + c.y, 0);
  const countryData = (countries ?? []).map((c: any) => ({
    country: c.x,
    visitors: c.y,
    pct: totalCountryVisitors ? Math.round((c.y / totalCountryVisitors) * 100) : 0,
  }));

  // Top pages
  const topPagesData = (topPages ?? []).map((p: any) => ({
    path: p.x,
    views: p.y,
  }));

  return {
    // Summary stats
    totalVisitors:  stats.visitors?.value  ?? 0,
    totalPageviews: stats.pageviews?.value ?? 0,
    avgSessionTime: stats.totalTime?.value ?? 0, // in seconds — use formatDuration()
    bounceRate:     stats.bounces?.value   ?? 0,

    // Charts & breakdowns
    chartData,
    trafficSources,
    deviceData,
    countries: countryData,
    topPages:  topPagesData,
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
    return data.x ?? 0;
  } catch {
    return 0;
  }
}
