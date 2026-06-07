"use client";

import { useEffect, useState } from "react";
import {
  Users, Eye, MousePointerClick, Clock,
  Globe, Monitor, Smartphone, Tablet, ArrowUpRight, ArrowDownRight,
  Activity
} from "lucide-react";
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

import { getAnalyticsData, getActiveVisitors } from "../actions/analytics";
import { formatDuration } from "../actions/utils";

// Country code → flag emoji
const countryFlag = (code: string) => {
  if (!code) return "🌍";
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
};

const sourceGradients = [
  "from-green-500 to-green-400",
  "from-brand-600 to-brand-400",
  "from-blue-600 to-blue-400",
  "from-amber-500 to-amber-400",
  "from-purple-500 to-purple-400",
];

const deviceIconMap: Record<string, any> = {
  desktop: Monitor,
  mobile:  Smartphone,
  tablet:  Tablet,
};
const deviceColorMap: Record<string, string> = {
  desktop: "text-brand-400",
  mobile:  "text-green-400",
  tablet:  "text-amber-400",
};

export default function AnalyticsPage() {
  const [data, setData]                 = useState<any>(null);
  const [loading, setLoading]           = useState(true);
  const [dateRange, setDateRange]       = useState("life time");
  const [activeVisitors, setActiveVisitors] = useState<number>(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await getAnalyticsData(dateRange);
        setData(res);
      } catch (e) {
        console.error("Failed to load analytics", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [dateRange]);

  // active visitors every 30 seconds
  useEffect(() => {
    async function fetchActive() {
      const count = await getActiveVisitors();
      setActiveVisitors(count);
    }
    fetchActive();
    const interval = setInterval(fetchActive, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !data) {
    return (
      <div className="p-8 text-center text-gray-400 animate-pulse">
        Loading analytics...
      </div>
    );
  }

  const stats = [
    {
      label: "Total Visitors",
      value: data.totalVisitors.toLocaleString(),
      icon: Users,
      color: "text-brand-400",
      bg: "bg-brand-400/10",
    },
    {
      label: "Total Pageviews",
      value: data.totalPageviews.toLocaleString(),
      icon: Eye,
      color: "text-green-400",
      bg: "bg-green-400/10",
    },
    {
      label: "Avg. Session Duration",
      value: formatDuration(data.avgSessionTime),
      icon: Clock,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
    },
    {
      label: "Bounce Rate",
      value: `${data.bounceRate}%`,
      icon: MousePointerClick,
      color: "text-amber-400",
      bg: "bg-amber-400/10",
    },
  ];

  const maxViews = data.topPages[0]?.views ?? 1;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Web Analytics</h1>
          <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-green-400/10 border border-green-400/20 text-green-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
            {activeVisitors} live now
          </span>
        </div>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-brand-500 transition-colors appearance-none cursor-pointer text-sm font-medium"
        >
          <option value="lifetime"      className="bg-black">Lifetime</option>
          <option value="this year"     className="bg-black">This Year</option>
          <option value="6 months"      className="bg-black">Last 6 Months</option>
          <option value="three months"  className="bg-black">Last 3 Months</option>
          <option value="one month"     className="bg-black">Last Month</option>
        </select>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex items-center gap-4 hover:bg-white/10 transition-colors"
          >
            <div className={`p-4 rounded-2xl ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-gray-400 text-sm">{stat.label}</p>
              <p className="text-2xl font-semibold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Traffic Chart */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
        <h2 className="text-xl font-semibold mb-6">Traffic Overview</h2>
        {data.chartData.length === 0 ? (
          <p className="text-gray-500 text-sm py-12 text-center">No traffic data for this period yet.</p>
        ) : (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                <Area type="monotone" dataKey="visitors"  name="Visitors"  stroke="#818cf8" strokeWidth={2} fill="url(#colorVisitors)"  dot={false} />
                <Area type="monotone" dataKey="pageviews" name="Pageviews" stroke="#4ade80" strokeWidth={2} fill="url(#colorPageviews)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Traffic Sources */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
          <h2 className="text-xl font-semibold mb-6">Traffic Sources</h2>
          {data.trafficSources.length === 0 ? (
            <p className="text-gray-500 text-sm">No referrer data yet.</p>
          ) : (
            <div className="space-y-4">
              {data.trafficSources.map((src: any, i: number) => (
                <div key={src.source}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-gray-200 truncate">{src.source}</span>
                    <span className="text-sm text-gray-400 ml-2">{src.pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${sourceGradients[i % sourceGradients.length]}`}
                      style={{ width: `${src.pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{src.visitors.toLocaleString()} visitors</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Devices + Active Pages */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
          <h2 className="text-xl font-semibold mb-6">Devices</h2>
          {data.deviceData.length === 0 ? (
            <p className="text-gray-500 text-sm">No device data yet.</p>
          ) : (
            <div className="space-y-4">
              {data.deviceData.map((d: any) => {
                const key = d.name?.toLowerCase() ?? "desktop";
                const Icon  = deviceIconMap[key]  ?? Monitor;
                const color = deviceColorMap[key] ?? "text-gray-400";
                return (
                  <div key={d.name} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                    <Icon className={`w-6 h-6 ${color}`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium capitalize">{d.name}</span>
                        <span className="text-sm font-semibold">{d.pct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-white/40" style={{ width: `${d.pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-green-400" />
              <h3 className="text-sm font-semibold text-gray-300">Active Right Now</h3>
            </div>
            <div className="flex items-center gap-2 p-3 bg-green-400/5 border border-green-400/10 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
              <span className="text-sm text-green-400 font-semibold">{activeVisitors}</span>
              <span className="text-sm text-gray-400">active visitor{activeVisitors !== 1 ? "s" : ""} on your site</span>
            </div>
          </div>
        </div>

        {/* Countries */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Globe className="w-5 h-5 text-gray-400" />
            <h2 className="text-xl font-semibold">Top Countries</h2>
          </div>
          {data.countries.length === 0 ? (
            <p className="text-gray-500 text-sm">No country data yet.</p>
          ) : (
            <div className="space-y-4">
              {data.countries.map((c: any) => (
                <div key={c.country} className="flex items-center gap-3">
                  <span className="text-xl">{countryFlag(c.country)}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{c.country}</span>
                      <span className="text-xs text-gray-400">{c.pct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400"
                        style={{ width: `${c.pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{c.visitors.toLocaleString()} visitors</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Pages Table */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold">Top Pages</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 text-sm">
                <th className="p-4 font-medium">Page</th>
                <th className="p-4 font-medium">Views</th>
                <th className="p-4 font-medium">Traffic</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.topPages.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-6 text-center text-gray-500">No page data yet.</td>
                </tr>
              ) : (
                data.topPages.map((page: any) => {
                  const pct = Math.round((page.views / maxViews) * 100);
                  return (
                    <tr key={page.path} className="hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <p className="font-medium text-sm text-white">{page.path}</p>
                      </td>
                      <td className="p-4 font-semibold text-sm">{page.views.toLocaleString()}</td>
                      <td className="p-4 w-40">
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}