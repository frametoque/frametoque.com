"use client";

import { useEffect, useState } from "react";
import { Landmark, Wallet, Receipt, TrendingUp, AlertCircle, ArrowUpRight, ArrowDownRight, FileText, Users, Eye, Calendar, Folder, MapPin, CheckSquare, Droplets, ChevronLeft, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";
import { getDashboardData } from "../actions/actions";
import { getAnalyticsData } from "../actions/analytics";
import { getCalendarEvents } from "../actions/bookings";
import AnimatedNumber from "../components/AnimatedNumber";
import { useAdminDateRange } from "../context/AdminDateRangeContext";

const formatLKR = (amount: number) => {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
  }).format(amount || 0);
};

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [bookingForecasts, setBookingForecasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { startDate, endDate } = useAdminDateRange();
  const [chartYear, setChartYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [res, analyticsRes, eventsRes, weatherRes] = await Promise.all([
          getDashboardData(startDate, endDate),
          getAnalyticsData("all time").catch(() => null),
          getCalendarEvents().catch(() => []),
          fetch("/api/admin/weather").then(r => r.ok ? r.json() : null).catch(() => null),
        ]);
        if (cancelled) return;
        setData(res);
        setAnalytics(analyticsRes);
        if (weatherRes && weatherRes.bookingForecasts) {
          setBookingForecasts(weatherRes.bookingForecasts);
        }

        const now = new Date();
        const upcoming = eventsRes
          .filter((e: any) => {
            if (e.type !== 'booking' || e.status === 'cancelled') return false;
            // Parse event start date and time
            const eventDateTime = new Date(`${e.date}T${e.time || '00:00'}:00`);
            // If start_time was provided, filter out events whose start time has passed.
            // If no start_time, keep the event until the end of that day (23:59:59).
            if (e.time) {
              return eventDateTime >= now;
            }
            const endOfDay = new Date(`${e.date}T23:59:59`);
            return endOfDay >= now;
          })
          .sort((a: any, b: any) => {
            const dateA = `${a.date}T${a.time || '00:00'}:00`;
            const dateB = `${b.date}T${b.time || '00:00'}:00`;
            return dateA.localeCompare(dateB);
          })
          .slice(0, 5);
        setUpcomingEvents(upcoming);
      } catch (e) {
        console.error("Failed to load dashboard data", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [startDate, endDate]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        {/* Skeleton Stats Cards (Row 1) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-6 flex items-center gap-4 animate-pulse">
              <div className="p-4 rounded-2xl bg-white/5 w-14 h-14" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-white/5 rounded-full w-24" />
                <div className="h-6 bg-white/10 rounded-full w-32" />
              </div>
            </div>
          ))}
        </div>

        {/* Skeleton Stats Cards (Row 2) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-6 flex items-center gap-4 animate-pulse">
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-white/5 rounded-full w-32" />
                <div className="h-8 bg-white/10 rounded-full w-40" />
              </div>
            </div>
          ))}
        </div>

        {/* Skeleton Analytics Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-6 flex items-center gap-4 animate-pulse">
              <div className="p-4 rounded-2xl bg-white/5 w-14 h-14" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-white/5 rounded-full w-24" />
                <div className="h-6 bg-white/10 rounded-full w-32" />
              </div>
            </div>
          ))}
        </div>

        {/* Skeleton Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Skeleton Chart */}
          <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-6 animate-pulse space-y-6">
            <div className="h-6 bg-white/10 rounded-full w-40" />
            <div className="h-[280px] bg-white/5 rounded-2xl" />
          </div>
          {/* Skeleton Events */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 animate-pulse space-y-6">
            <div className="h-6 bg-white/10 rounded-full w-40" />
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-white/5 rounded-2xl border border-white/5" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    { label: "Total Assets", value: formatLKR(data.totalAssets || 0), icon: Landmark, color: "text-blue-400", bg: "bg-blue-400/10" },
    { label: "Total Income", value: formatLKR(data.totalIncome), icon: Wallet, color: "text-green-400", bg: "bg-green-400/10" },
    { label: "Total Expenses", value: formatLKR(data.totalExpenses), icon: Receipt, color: "text-red-400", bg: "bg-red-400/10" },
    { label: "Net Profit", value: formatLKR(data.netProfit), icon: TrendingUp, color: "text-brand-400", bg: "bg-brand-400/10" },
  ];

  const analyticsStats = analytics
    ? [
        { label: "Visitors (All Time)", value: (analytics.totalVisitors ?? 0).toLocaleString(), icon: Users, color: "text-indigo-400", bg: "bg-indigo-400/10" },
        { label: "Pageviews (All Time)", value: (analytics.totalPageviews ?? 0).toLocaleString(), icon: Eye, color: "text-brand-400", bg: "bg-brand-400/10" },
      ]
    : [];

  return (
    <div className="space-y-6">
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex items-center gap-4 hover:bg-white/10 transition-colors">
            <div className={`p-4 rounded-2xl ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-gray-400 text-sm">{stat.label}</p>
              <p className="text-2xl font-semibold">
                <AnimatedNumber value={stat.value} />
              </p>
            </div>
          </div>
        ))}
        {/* Unpaid Invoices */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex items-center gap-4 hover:bg-white/10 transition-colors">
          <div className="w-14 h-14 rounded-2xl bg-amber-400/10 flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-bold text-amber-400">
              <AnimatedNumber value={data.unpaidCount || 0} />
            </span>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Unpaid Invoices</p>
            <p className="text-2xl font-semibold text-amber-400">
              <AnimatedNumber value={formatLKR(data.unpaidAmount || 0)} />
            </p>
          </div>
        </div>
      </div>

      {/* Current Month Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            label: "Current Month Income",
            value: data.currentMonthStats?.income || 0,
            prevValue: data.currentMonthStats?.lastMonthIncome || 0,
            isCurrency: true,
          },
          {
            label: "Current Month Expenses",
            value: data.currentMonthStats?.expenses || 0,
            prevValue: data.currentMonthStats?.lastMonthExpenses || 0,
            isCurrency: true,
            invertColors: true, // For expenses, increase is bad (red)
          },
          {
            label: "Current Month Profit",
            value: (data.currentMonthStats?.income || 0) - (data.currentMonthStats?.expenses || 0),
            prevValue: (data.currentMonthStats?.lastMonthIncome || 0) - (data.currentMonthStats?.lastMonthExpenses || 0),
            isCurrency: true,
          },
          {
            label: "Year to Date Profit",
            value: data.netIncomeComparison?.currentNet || 0,
            prevValue: data.netIncomeComparison?.previousNet || 0,
            isCurrency: true,
          }
        ].map((stat, i) => {
          let pct = 0;
          if (stat.prevValue === 0) {
            pct = stat.value > 0 ? 100 : 0;
          } else {
            pct = ((stat.value - stat.prevValue) / Math.abs(stat.prevValue)) * 100;
          }
          const isPositive = pct >= 0;
          const displayPct = Math.abs(pct).toFixed(1);
          
          let pctColor = "text-gray-400";
          if (pct > 0) pctColor = stat.invertColors ? "text-red-400" : "text-green-400";
          else if (pct < 0) pctColor = stat.invertColors ? "text-green-400" : "text-red-400";

          return (
            <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 hover:bg-white/10 transition-colors flex flex-col justify-between">
              <p className="text-gray-400 text-sm mb-2">{stat.label}</p>
              <div className="flex items-end justify-between">
                <p className="text-2xl font-semibold">
                  <AnimatedNumber value={stat.isCurrency ? formatLKR(stat.value) : stat.value} />
                </p>
                <div className={`flex items-center gap-1 text-sm font-medium ${pctColor}`}>
                  {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  <span><AnimatedNumber value={displayPct + "%"} /></span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics Stats Cards */}
      {analyticsStats.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {analyticsStats.map((stat, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex items-center gap-4 hover:bg-white/10 transition-colors">
              <div className={`p-4 rounded-2xl ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-gray-400 text-sm">{stat.label}</p>
                <p className="text-2xl font-semibold">
                  <AnimatedNumber value={stat.value} />
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Income vs Expenses</h2>
            <div className="flex items-center gap-4 text-gray-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
              <button onClick={() => setChartYear(y => y - 1)} className="hover:text-white transition-colors p-1"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-white font-medium text-sm">{chartYear}</span>
              <button onClick={() => setChartYear(y => y + 1)} className="hover:text-white transition-colors p-1"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.chartData.filter((d: any) => d.year === chartYear)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `LKR ${value/1000}k`} />
                <Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  contentStyle={{ backgroundColor: 'rgba(10,10,15,0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: any) => formatLKR(value)}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}/>
                <Bar dataKey="income" name="Income" fill="#4ade80" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="expenses" name="Expenses" fill="#f87171" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
          <h2 className="text-xl font-semibold mb-6">Upcoming Events</h2>
          <div className="space-y-3">
            {upcomingEvents.map((ev: any) => {
              const isTask = ev.event_type === 'task_reminder';
              let iconColor = isTask ? "text-blue-400 bg-blue-400/10" : "text-brand-400 bg-brand-400/10";
              let Icon = isTask ? CheckSquare : Calendar;
              if (ev.type === 'project') {
                iconColor = "text-blue-400 bg-blue-400/10";
                Icon = Folder;
              } else if (ev.type === 'agreement') {
                iconColor = "text-emerald-400 bg-emerald-400/10";
                Icon = FileText;
              } else if (ev.type === 'invoice') {
                iconColor = "text-amber-400 bg-amber-400/10";
                Icon = FileText;
              }

              // Find matching weather forecast
              const matchForecast = ev.location ? bookingForecasts.find(
                (bf: any) => bf.title === ev.title && bf.location === ev.location
              ) : null;

              return (
                <div key={ev.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-colors">
                  <div className="min-w-0 flex-1 pr-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-white truncate max-w-[120px] sm:max-w-xs">{ev.title}</p>
                        {(() => {
                          const today = new Date();
                          today.setHours(0,0,0,0);
                          const eventDate = new Date(ev.date);
                          eventDate.setHours(0,0,0,0);
                          const diffTime = eventDate.getTime() - today.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          let pillStyle = "bg-brand-500/10 text-brand-400 border-brand-500/20";
                          let label = `${diffDays} days left`;
                          if (diffDays === 0) {
                            pillStyle = "bg-green-500/10 text-green-400 border-green-500/20";
                            label = "Today";
                          } else if (diffDays === 1) {
                            pillStyle = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                            label = "Tomorrow";
                          } else if (diffDays < 0) {
                            pillStyle = "bg-gray-500/10 text-gray-400 border-gray-500/20";
                            label = "Past";
                          }
                          return (
                            <>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border tracking-wide uppercase shrink-0 ${pillStyle}`}>
                                {label}
                              </span>
                              <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-gray-400 shrink-0">
                                {isTask ? 'reminder' : ev.type}
                              </span>
                            </>
                          );
                        })()}
                      </div>
                      
                      <div className="flex flex-col gap-1 mt-1.5 text-[11px] text-gray-300">
                        {ev.location && (
                          <div className="flex items-start gap-1.5">
                            <span className="font-medium text-brand-400 break-words flex-1 leading-normal">{ev.location}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-500">Date:</span>
                          <span className="font-medium text-white">{ev.date}</span>
                        </div>
                        {ev.time && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-500">Time:</span>
                            <span className="font-medium text-white">{ev.time}</span>
                          </div>
                        )}
                        
                      </div>
                  </div>

                  {/* Weather forecast info inside event card */}
                  {matchForecast && matchForecast.weather && (
                    <div className="flex items-center gap-2 shrink-0 border-l border-white/5 pl-4 ml-2">
                      <div className="text-right">
                        <div className="flex items-center gap-0.5 justify-end text-sm font-bold text-blue-400 mb-0.5">
                          <Droplets className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span>{matchForecast.weather.precipitation}</span>
                        </div>
                        <p className="text-[9px] font-semibold text-gray-400">{matchForecast.weather.tempMax}</p>
                      </div>
                      <img 
                        src={matchForecast.weather.iconUrl} 
                        alt={matchForecast.weather.condition} 
                        className="w-8 h-8 object-contain shrink-0" 
                        title={matchForecast.weather.condition}
                      />
                    </div>
                  )}
                </div>
              );
            })}
            {upcomingEvents.length === 0 && <p className="text-gray-500 text-sm">No upcoming events scheduled.</p>}
          </div>
        </div>
      </div>

      {/* Net Income & Recent Invoices Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Invoices */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Recent Invoices</h2>
            </div>
            <div className="space-y-4">
              {data.recentInvoices.map((invoice: any, i: number) => {
                let statusColor = "text-gray-400 bg-gray-400/10 border-gray-400/20";
                const statusStr = invoice.status?.toLowerCase() || '';
                if (statusStr === 'paid' || statusStr === 'fully paid') {
                  statusColor = "text-green-400 bg-green-400/10 border-green-400/20";
                } else if (statusStr === 'unpaid' || statusStr === 'pending') {
                  statusColor = "text-amber-400 bg-amber-400/10 border-amber-400/20";
                } else if (statusStr === 'overdue') {
                  statusColor = "text-red-400 bg-red-400/10 border-red-400/20";
                } else if (statusStr.includes('advance')) {
                  statusColor = "text-blue-400 bg-blue-400/10 border-blue-400/20";
                }

                return (
                  <div key={i} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-semibold text-sm">{invoice.service || 'Service'}</p>
                        <p className="text-xs text-gray-400">{invoice.client || 'Unknown'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{formatLKR(invoice.amount)}</p>
                      <span className={`inline-block mt-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>
                        {invoice.status}
                      </span>
                    </div>
                  </div>
                );
              })}
              {data.recentInvoices.length === 0 && <p className="text-gray-500 text-sm">No recent invoices.</p>}
            </div>
          </div>
        </div>

        {/* Recent Quotations */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Recent Quotations</h2>
            </div>
            <div className="space-y-4">
              {data.recentQuotations && data.recentQuotations.map((quotation: any, i: number) => {
                let statusColor = "text-gray-400 bg-gray-400/10 border-gray-400/20";
                const statusStr = quotation.status?.toLowerCase() || '';
                if (statusStr === 'accepted' || statusStr === 'approved') {
                  statusColor = "text-green-400 bg-green-400/10 border-green-400/20";
                } else if (statusStr === 'pending' || statusStr === 'sent') {
                  statusColor = "text-amber-400 bg-amber-400/10 border-amber-400/20";
                } else if (statusStr === 'rejected' || statusStr === 'declined') {
                  statusColor = "text-red-400 bg-red-400/10 border-red-400/20";
                } else if (statusStr === 'expired') {
                  statusColor = "text-gray-400 bg-gray-400/10 border-gray-400/20";
                }

                return (
                  <div key={i} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                      <div>
                        <p className="font-semibold text-sm">
                          {quotation.project && quotation.project.length > 26 
                            ? quotation.project.substring(0, 26) + '...' 
                            : quotation.project || 'Untitled'}
                        </p>
                        <p className="text-xs text-gray-400">{quotation.client || 'Unknown'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{formatLKR(quotation.amount)}</p>
                      <span className={`inline-block mt-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>
                        {quotation.status}
                      </span>
                    </div>
                  </div>
                );
              })}
              {!data.recentQuotations || data.recentQuotations.length === 0 && <p className="text-gray-500 text-sm">No recent quotations.</p>}
            </div>
          </div>
        </div>

        {/* Net Income comparison table */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-6">Net Income</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Fiscal Year</th>
                    <th className="py-3 px-4 text-right">Previous (2025)</th>
                    <th className="py-3 px-4 text-right">Current (2026)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4 text-gray-300 font-medium">Income</td>
                    <td className="py-4 px-4 text-right font-semibold text-green-400">
                      {formatLKR(data.netIncomeComparison.previousIncome)}
                    </td>
                    <td className="py-4 px-4 text-right font-semibold text-green-400">
                      {formatLKR(data.netIncomeComparison.currentIncome)}
                    </td>
                  </tr>
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4 text-gray-300 font-medium">Expense</td>
                    <td className="py-4 px-4 text-right font-semibold text-red-400">
                      {formatLKR(data.netIncomeComparison.previousExpense)}
                    </td>
                    <td className="py-4 px-4 text-right font-semibold text-red-400">
                      {formatLKR(data.netIncomeComparison.currentExpense)}
                    </td>
                  </tr>
                  <tr className="hover:bg-white/5 transition-colors bg-white/5 font-semibold">
                    <td className="py-4 px-4 text-white font-bold">Net Income</td>
                    <td className={`py-4 px-4 text-right font-bold ${data.netIncomeComparison.previousNet >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {data.netIncomeComparison.previousNet < 0 ? "-" : ""}{formatLKR(Math.abs(data.netIncomeComparison.previousNet))}
                    </td>
                    <td className={`py-4 px-4 text-right font-bold ${data.netIncomeComparison.currentNet >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {data.netIncomeComparison.currentNet < 0 ? "-" : ""}{formatLKR(Math.abs(data.netIncomeComparison.currentNet))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Transactions & Expense Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
          <h2 className="text-xl font-semibold mb-6">Recent Transactions</h2>
          <div className="space-y-3">
            {data.recentTransactions.map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${tx.type === 'income' ? 'bg-green-400/10' : 'bg-red-400/10'}`}>
                    {tx.type === 'income' ? (
                      <ArrowUpRight className={`w-5 h-5 text-green-400`} />
                    ) : (
                      <ArrowDownRight className={`w-5 h-5 text-red-400`} />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{tx.name}</p>
                    <p className="text-sm text-gray-400">{tx.date}</p>
                  </div>
                </div>
                <p className={`font-semibold ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatLKR(tx.amount)}
                </p>
              </div>
            ))}
            {data.recentTransactions.length === 0 && <p className="text-gray-500 text-sm">No recent transactions.</p>}
          </div>
        </div>

        {/* Expense Breakdown donut chart */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-6">Expense Breakdown</h2>
            
            {data.expenseBreakdown.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No expenses recorded for 2026.</p>
            ) : (
              <>
                <div className="relative h-[200px] w-full flex items-center justify-center mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.expenseBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {data.expenseBreakdown.map((entry: any, index: number) => {
                          const categoryColors: Record<string, string> = {
                            "Stock Purchase": "#1d4ed8",
                            "Marketing": "#0ea5e9",
                            "Equipment": "#3b82f6",
                            "Software": "#2563eb",
                            "Freelancers": "#60a5fa",
                            "Transport": "#1e40af",
                            "Other": "#1e3a8a",
                          };
                          const defaultColors = ["#2563eb", "#0ea5e9", "#3b82f6", "#1d4ed8", "#60a5fa", "#1e3a8a"];
                          const color = categoryColors[entry.name] || defaultColors[index % defaultColors.length];
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: 'rgba(10,10,15,0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px' }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(value: any) => formatLKR(value)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Total</span>
                    <span className="text-sm font-bold text-white">
                      {formatLKR(data.expenseBreakdown.reduce((sum: number, r: any) => sum + r.value, 0))}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {data.expenseBreakdown.map((entry: any, index: number) => {
                    const categoryColors: Record<string, string> = {
                      "Stock Purchase": "#1d4ed8",
                      "Marketing": "#0ea5e9",
                      "Equipment": "#3b82f6",
                      "Software": "#2563eb",
                      "Freelancers": "#60a5fa",
                      "Transport": "#1e40af",
                      "Other": "#1e3a8a",
                    };
                    const defaultColors = ["#2563eb", "#0ea5e9", "#3b82f6", "#1d4ed8", "#60a5fa", "#1e3a8a"];
                    const color = categoryColors[entry.name] || defaultColors[index % defaultColors.length];
                    return (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-3.5 h-3.5 rounded-full inline-block shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-gray-300 font-medium">{entry.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-gray-500 text-xs">{entry.percentage}%</span>
                          <span className="text-white font-semibold">{formatLKR(entry.value)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}