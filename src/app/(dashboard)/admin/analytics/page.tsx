"use client";
import useSWR from "swr";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  Users, Eye, MousePointerClick, Clock,
  Globe, Monitor, Smartphone, Tablet, Activity,
  ZoomIn, ZoomOut,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { getAnalyticsData, getActiveVisitors, getActiveVisitors30m, getChartData } from "../actions/analytics";
import { formatDuration } from "../actions/utils";
import {
  decodeRegion, regionToCountry,
  getBrowserLogo, getOsLogo, decodeCountry,
  getCityCountryCode
} from "@/app/(dashboard)/admin/actions/analyticsUtils";
import { useAnalyticsDateRange } from "../context/AnalyticsDateRangeContext";
import AnimatedNumber from "../components/AnimatedNumber";

// ── Helpers ───────────────────────────────────────────────────────────────────

const countryFlag = (code: string) => {
  if (!code || typeof code !== "string" || code.length !== 2) return null;
  return code.toUpperCase().replace(/./g, (c) =>
    String.fromCodePoint(127397 + c.charCodeAt(0))
  );
};
const gradients = [
  "from-brand-600 to-brand-400",
  "from-blue-600 to-blue-400",
  "from-blue-500 to-brand-400",
  "from-brand-600 to-brand-400",
  "from-sky-600 to-sky-400",
  "from-indigo-600 to-blue-400",
  "from-blue-700 to-blue-500",
  "from-brand-500 to-blue-400",
  "from-sky-500 to-brand-400",
  "from-indigo-500 to-brand-400",
];

const deviceIconMap: Record<string, any> = {
  desktop: Monitor, mobile: Smartphone, tablet: Tablet,
};
const deviceColorMap: Record<string, string> = {
  desktop: "text-brand-400", mobile: "text-green-400", tablet: "text-amber-400",
};

// Zoom levels for the Traffic chart's X-axis, mapped to the dateRange values
// already supported by getAnalyticsData. Changing zoom re-fetches data at a
// different time window AND server-side unit (hour/day/week/month), so the
// chart genuinely shows more/less granular data — not just a client-side
// re-grouping of the same points.
const CHART_ZOOM_LEVELS = [
  { key: "year",  label: "Year" },   // 1 point per calendar year
  { key: "month", label: "Month" },  // 1 point per calendar month
  { key: "day",   label: "Day" },    // 1 point per day
  { key: "time",  label: "Time" },   // 1 point per hour
] as const;



// ── Tab bar ───────────────────────────────────────────────────────────────────
function Tabs({ tabs, active, onChange }: {
  tabs: string[]; active: string; onChange: (t: string) => void;
}) {
  return (
    <div className="flex gap-1 mb-5 bg-white/5 rounded-xl p-1 w-fit flex-wrap">
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize
            ${active === t
              ? "bg-white/15 text-white"
              : "text-gray-400 hover:text-gray-200"}`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

// ── Metric list ───────────────────────────────────────────────────────────────
function MetricList({ items, icon }: {
  items: { label: string; value: number; pct: number }[];
  icon?: (label: string) => React.ReactNode;
}) {
  if (!items || items.length === 0)
    return <p className="text-gray-500 text-sm">No data for this period.</p>;

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={item.label + i}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 min-w-0">
              {icon?.(item.label)}
              <span className="text-sm font-medium text-gray-200 truncate">{item.label}</span>
            </div>
            <div className="flex items-center gap-3 ml-2 shrink-0">
              <span className="text-xs text-gray-500">{item.value.toLocaleString()}</span>
              <span className="text-xs text-gray-400 w-8 text-right">{item.pct}%</span>
            </div>
          </div>
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r ${gradients[i % gradients.length]}`}
              initial={{ width: 0 }}
              animate={{ width: `${item.pct}%` }}
              transition={{ delay: i * 0.04 + 0.1, duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Logo icon (browser / OS) ──────────────────────────────────────────────────
function LogoIcon({ src, fallback }: { src: string | null; fallback: React.ReactNode }) {
  if (!src) return <>{fallback}</>;
  return (
    <img
      src={src}
      alt=""
      className="w-4 h-4 object-contain shrink-0"
      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
    />
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { dateRange }             = useAnalyticsDateRange();

  const [pageTab,   setPageTab]   = useState("path");
  const [sourceTab, setSourceTab] = useState("referrers");
  const [envTab,    setEnvTab]    = useState("devices");
  const [locTab,    setLocTab]    = useState("countries");

  // Chart X-axis zoom level: index into CHART_ZOOM_LEVELS
  // 0 = year (most zoomed out) ... 4 = time (most zoomed in)
  const [chartZoomIndex, setChartZoomIndex] = useState(2); // default to "week"

  const { data, isLoading: loading } = useSWR(
    ['analytics', dateRange],
    async ([_, range]) => await getAnalyticsData(range),
    { keepPreviousData: true, revalidateOnFocus: false }
  );

  // Fetch chart-specific data whenever the zoom level changes. This is
  // independent of the page-wide `dateRange` selector so zooming the chart
  // doesn't affect the other widgets (stat cards, pages, sources, etc).
  const { data: chartDataRaw, isLoading: chartLoading } = useSWR(
    ['analytics-chart', CHART_ZOOM_LEVELS[chartZoomIndex].key],
    async ([_, key]) => await getChartData(key),
    { keepPreviousData: true, revalidateOnFocus: false }
  );

  const chartData = Array.isArray(chartDataRaw) ? chartDataRaw : [];

  const { data: activeVisitors = 0 } = useSWR(
    'active-visitors',
    async () => await getActiveVisitors(),
    { refreshInterval: 30000, keepPreviousData: true }
  );

  const chartZoomLevel = CHART_ZOOM_LEVELS[chartZoomIndex];

  const zoomOut = () => setChartZoomIndex((i) => Math.max(0, i - 1));
  const zoomIn  = () => setChartZoomIndex((i) => Math.min(CHART_ZOOM_LEVELS.length - 1, i + 1));

  if (loading || !data) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Four Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-6 flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-white/5 w-14 h-14" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-white/5 rounded-full w-24" />
                <div className="h-6 bg-white/10 rounded-full w-32" />
              </div>
            </div>
          ))}
        </div>

        {/* Traffic Overview Line Chart */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div className="h-6 bg-white/10 rounded-full w-40" />
            <div className="flex gap-2">
              <div className="h-8 bg-white/5 rounded-2xl w-16" />
              <div className="h-8 bg-white/5 rounded-2xl w-16" />
            </div>
          </div>
          <div className="h-[300px] bg-white/5 rounded-2xl" />
        </div>

        {/* Bottom Pages & Traffic Sources */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
            <div className="h-6 bg-white/10 rounded-full w-32" />
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between">
                    <div className="h-4 bg-white/10 rounded-full w-1/3" />
                    <div className="h-4 bg-white/5 rounded-full w-10" />
                  </div>
                  <div className="h-2 bg-white/5 rounded-full w-full" />
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
            <div className="h-6 bg-white/10 rounded-full w-32" />
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between">
                    <div className="h-4 bg-white/10 rounded-full w-1/3" />
                    <div className="h-4 bg-white/5 rounded-full w-10" />
                  </div>
                  <div className="h-2 bg-white/5 rounded-full w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const decodedRegions = (data.regions ?? []).map((r: any) => ({
    ...r,
    label: decodeRegion(r.label),
    _countryCode: regionToCountry(r.label),
  }));

  const decodedCountries = (data.countries ?? []).map((c: any) => ({
    ...c,
    _code: c._code ?? c.label,          
    label: decodeCountry(c.label),     
  }));

  const decodedCities = (data.cities ?? []).map((c: any) => {
    const code = getCityCountryCode(c.label, c.country ?? c.countryCode ?? c._countryCode);
    const flag = countryFlag(code);
    return {
      ...c,
      _countryCode: code,
      label: flag ? `${c.label} ${flag}` : c.label,
    };
  });

  const statCards = [
    { label: "Live Now",              value: activeVisitors,      raw: true,  icon: Activity,          color: "text-emerald-400", bg: "bg-emerald-400/10" },
    { label: "Total Visitors",        value: data.totalVisitors,  raw: true,  icon: Users,             color: "text-brand-400", bg: "bg-brand-400/10" },
    { label: "Total Pageviews",       value: data.totalPageviews, raw: true,  icon: Eye,               color: "text-green-400", bg: "bg-green-400/10" },
    { label: "Bounce Rate",           value: data.bounceRate,     raw: false, icon: MousePointerClick, color: "text-amber-400", bg: "bg-amber-400/10" },
  ];

  const pageData:   Record<string, any[]> = { path: data.urls, "entry page": data.entryPages, "exit page": data.exitPages };
  const sourceData: Record<string, any[]> = { referrers: data.referrers, channels: data.channels };
  const envData:    Record<string, any[]> = { devices: data.devices, browsers: data.browsers, os: data.os };
  const locData:    Record<string, any[]> = { countries: decodedCountries, regions: decodedRegions, cities: decodedCities };

  return (
    <div className="space-y-6">

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <div
            key={i}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex items-center gap-4 hover:bg-white/10 transition-colors"
          >
            <div className={`p-4 rounded-2xl ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-gray-400 text-sm">{stat.label}</p>
              <p className="text-2xl font-semibold">
                {stat.raw ? (
                  <AnimatedNumber value={stat.value} />
                ) : stat.label === "Bounce Rate" ? (
                  <><AnimatedNumber value={stat.value} />%</>
                ) : (
                  formatDuration(stat.value)
                )}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Traffic Chart */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <h2 className="text-xl font-semibold">Traffic Overview</h2>

          {/* Zoom controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={zoomOut}
              disabled={chartZoomIndex === 0}
              aria-label="Zoom out"
              title="Zoom out"
              className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <span className="text-xs font-medium text-gray-400 w-12 text-center select-none">
              {chartZoomLevel.label}
            </span>

            <button
              onClick={zoomIn}
              disabled={chartZoomIndex === CHART_ZOOM_LEVELS.length - 1}
              aria-label="Zoom in"
              title="Zoom in"
              className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>

        {chartLoading || !chartData ? (
          <div className="h-[300px] w-full flex items-center justify-center">
            <p className="text-gray-500 text-sm animate-pulse">Loading chart…</p>
          </div>
        ) : chartData.length === 0 ? (
          <p className="text-gray-500 text-sm py-12 text-center">No traffic data for this period yet.</p>
        ) : (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#818cf8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPageviews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#4ade80" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                  contentStyle={{ backgroundColor: "rgba(10,10,15,0.9)", borderColor: "rgba(255,255,255,0.1)", borderRadius: "16px" }}
                  itemStyle={{ color: "#fff" }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                <Area type="monotone" dataKey="visitors"  name="Visitors"  stroke="#818cf8" strokeWidth={2} fill="url(#colorVisitors)"  dot={false} isAnimationActive={true} animationDuration={800} animationEasing="ease-out" />
                <Area type="monotone" dataKey="pageviews" name="Pageviews" stroke="#4ade80" strokeWidth={2} fill="url(#colorPageviews)" dot={false} isAnimationActive={true} animationDuration={800} animationEasing="ease-out" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Row 1 — Pages & Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
          <h2 className="text-xl font-semibold mb-4">Pages</h2>
          <Tabs tabs={["path", "entry page", "exit page"]} active={pageTab} onChange={setPageTab} />
          <MetricList items={pageData[pageTab]} />
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
          <h2 className="text-xl font-semibold mb-4">Traffic Sources</h2>
          <Tabs tabs={["referrers", "channels"]} active={sourceTab} onChange={setSourceTab} />
          <MetricList
            items={sourceData[sourceTab]}
            icon={(label) => {
              if (sourceTab === "referrers") {
                if (!label || label === "Direct" || label === "(direct)") {
                  return <Globe className="w-4 h-4 text-gray-400 shrink-0" />;
                }
                let domain = label;
                try {
                  if (label.startsWith("http")) domain = new URL(label).hostname;
                } catch {}
                return (
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                    alt=""
                    className="w-4 h-4 object-contain shrink-0 rounded-sm"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                );
              }
            }}
          />
        </div>
      </div>

      {/* Row 2 — Environment & Locations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
          <h2 className="text-xl font-semibold mb-4">Environment</h2>
          <Tabs tabs={["devices", "browsers", "os"]} active={envTab} onChange={setEnvTab} />
          <MetricList
            items={envData[envTab]}
            icon={(label) => {
              if (envTab === "devices") {
                const key   = label?.toLowerCase();
                const Icon  = deviceIconMap[key]  ?? Monitor;
                const color = deviceColorMap[key] ?? "text-gray-400";
                return <Icon className={`w-4 h-4 ${color} shrink-0`} />;
              }
              if (envTab === "browsers") {
                return <LogoIcon src={getBrowserLogo(label)} fallback={<Globe className="w-4 h-4 text-gray-400" />} />;
              }
              if (envTab === "os") {
                return <LogoIcon src={getOsLogo(label)} fallback={<Monitor className="w-4 h-4 text-gray-400" />} />;
              }
            }}
          />
          {/* Active visitors */}
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-green-400" />
              <h3 className="text-sm font-semibold text-gray-300">Active Right Now</h3>
            </div>
            <div className="flex items-center gap-2 p-3 bg-green-400/5 border border-green-400/10 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
              <span className="text-sm text-green-400 font-semibold">
                <AnimatedNumber value={activeVisitors} />
              </span>
              <span className="text-sm text-gray-400">
                active visitor{activeVisitors !== 1 ? "s" : ""} on your site
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-gray-400" />
            <h2 className="text-xl font-semibold">Locations</h2>
          </div>
          <Tabs tabs={["countries", "regions", "cities"]} active={locTab} onChange={setLocTab} />
          <MetricList
            items={locData[locTab]}
            icon={(label) => {
              if (locTab === "countries") {
                const raw = decodedCountries.find((c: any) => c.label === label);
                const flag = countryFlag(raw?._code ?? label);
                if (!flag) return null;
                return (
                  <span className="text-base leading-none shrink-0">
                    {flag}
                  </span>
                );
              }
              if (locTab === "regions") {
                const raw = decodedRegions.find((r: any) => r.label === label);
                const flag = countryFlag(raw?._countryCode ?? "");
                if (!flag) return null;
                return (
                  <span className="text-base leading-none shrink-0">
                    {flag}
                  </span>
                );
              }
              if (locTab === "cities") {
                return null;
              }
            }}
          />
        </div>
      </div>

    </div>
  );
}