"use client";
import useSWR from "swr";
import Link from "next/link";

import { useEffect, useState } from "react";
import { Landmark, Wallet, Receipt, TrendingUp, AlertCircle, ArrowUpRight, ArrowDownRight, ArrowDownLeft, FileText, Users, Eye, Calendar, Folder, MapPin, CheckSquare, Droplets, ChevronLeft, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";
import { getDashboardData } from "../actions/actions";
import { getAnalyticsData } from "../actions/analytics";
import { getCalendarEvents } from "../actions/workspace";
import ExpenseBreakdownWidget from "../components/ExpenseBreakdownWidget";
import TopClientsWidget from "../components/TopClientsWidget";
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
  const { startDate, endDate } = useAdminDateRange();
  const [chartYear, setChartYear] = useState<number>(new Date().getFullYear());

  const fetcher = async ([key, startDate, endDate]: [string, string, string]) => {
    const [res, analyticsRes, eventsRes, weatherRes] = await Promise.all([
      getDashboardData(startDate, endDate),
      getAnalyticsData("all time").catch(() => null),
      getCalendarEvents().catch(() => []),
      fetch("/api/admin/weather").then(r => r.ok ? r.json() : null).catch(() => null),
    ]);

    const now = new Date();
    const upcoming = (eventsRes || [])
      .filter((e: any) => {
        if (e.type !== 'booking' || e.status === 'cancelled') return false;
        const eventDateTime = new Date(`${e.date}T${e.time || '00:00'}:00`);
        if (e.time) return eventDateTime >= now;
        const endOfDay = new Date(`${e.date}T23:59:59`);
        return endOfDay >= now;
      })
      .sort((a: any, b: any) => {
        const dateA = `${a.date}T${a.time || '00:00'}:00`;
        const dateB = `${b.date}T${b.time || '00:00'}:00`;
        return dateA.localeCompare(dateB);
      })
      .slice(0, 5);

    return {
      data: res,
      analytics: analyticsRes,
      upcomingEvents: upcoming,
      bookingForecasts: weatherRes?.bookingForecasts || []
    };
  };

  const { data: swrData, isLoading: loading } = useSWR(
    ['dashboard', startDate, endDate],
    fetcher,
    { keepPreviousData: true, revalidateOnFocus: false }
  );

  const { data, analytics, upcomingEvents, bookingForecasts } = swrData || {};

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
    { label: "Available Funds", value: formatLKR(data.totalAssets || 0), subtext: (data.totalAfterDebts !== undefined && data.totalAfterDebts > data.totalAssets) ? `After Debts: ${formatLKR(data.totalAfterDebts)}` : (data.totalCapital > 0 ? `Total Capital: ${formatLKR(data.totalCapital)}` : undefined), icon: Landmark, color: "text-blue-400", bg: "bg-blue-400/10", href: "/admin/accounts" },
    { label: "Total Income", value: formatLKR(data.totalIncome), icon: Wallet, color: "text-green-400", bg: "bg-green-400/10", href: "/admin/income" },
    { label: "Total Expenses", value: formatLKR(data.totalExpenses), icon: Receipt, color: "text-red-400", bg: "bg-red-400/10", href: "/admin/expenses" },
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
      
      {/* Pending Domain Cloudflare Purchases Notification */}
      {data?.pendingDomainPurchases && data.pendingDomainPurchases.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 rounded-3xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg backdrop-blur-xl">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 shrink-0">
              <AlertCircle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Action Required: {data.pendingDomainPurchases.length} Domain Payment Received
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  Manual Cloudflare Purchase
                </span>
              </div>
              <p className="text-xs text-gray-300 mt-1">
                Client paid for{" "}
                <span className="font-semibold text-white">
                  {data.pendingDomainPurchases.map((p: any) => p.domain_name).join(", ")}
                </span>
                . Please register on Cloudflare Registrar, then click Sync to activate live DNS.
              </p>
            </div>
          </div>
          <a
            href="/admin/web-services"
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-colors flex items-center gap-2 shrink-0 cursor-pointer shadow-md"
          >
            <span>Open Domains &amp; Sync</span>
            <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {stats.map((stat, i) => {
          const cardInner = (
            <>
              <div className={`p-4 rounded-2xl ${stat.bg} group-hover:scale-105 transition-transform shrink-0`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-gray-400 text-sm group-hover:text-gray-300 transition-colors">{stat.label}</p>
                <p className="text-2xl font-semibold">
                  <AnimatedNumber value={stat.value} />
                </p>
                {stat.subtext && <p className="text-xs text-gray-500 mt-1">{stat.subtext}</p>}
              </div>
            </>
          );

          if (stat.href) {
            return (
              <Link
                key={i}
                href={stat.href}
                className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex items-center gap-4 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer"
              >
                {cardInner}
              </Link>
            );
          }

          return (
            <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex items-center gap-4 hover:bg-white/10 transition-colors">
              {cardInner}
            </div>
          );
        })}
        {/* Unpaid Invoices */}
        <div className="group relative bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 rounded-3xl p-6 transition-all hover:z-50 flex items-center justify-between">
          <Link
            href="/admin/invoices"
            className="flex items-center gap-4 flex-1 cursor-pointer"
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-400/10 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <span className="text-xl font-bold text-amber-400">
                <AnimatedNumber value={data.unpaidCount || 0} />
              </span>
            </div>
            <div>
              <p className="text-gray-400 text-sm group-hover:text-gray-300 transition-colors">Unpaid Invoices</p>
              <p className="text-2xl font-semibold text-amber-400">
                <AnimatedNumber value={formatLKR(data.unpaidAmount || 0)} />
              </p>
            </div>
          </Link>
          {data.clientDueAmounts && data.clientDueAmounts.length > 0 && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-[#0c0c0e] border border-white/10 rounded-2xl p-4 shadow-2xl opacity-0 invisible scale-95 group-hover:opacity-100 group-hover:visible group-hover:scale-100 transition-all duration-200 z-50 pointer-events-auto before:absolute before:-top-2 before:left-0 before:right-0 before:h-2">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Due by Client</p>
                <Link
                  href="/admin/invoices?status=Unpaid"
                  className="text-[11px] text-amber-400 hover:text-amber-300 cursor-pointer transition-colors"
                >
                  View All &rarr;
                </Link>
              </div>
              <div className="space-y-1 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                {data.clientDueAmounts.map((c: any, idx: number) => (
                  <Link
                    key={idx}
                    href={`/admin/invoices?client=${encodeURIComponent(c.client)}`}
                    className="flex justify-between items-center text-sm py-1.5 px-2 rounded-xl hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors group/item cursor-pointer"
                  >
                    <span className="text-gray-300 group-hover/item:text-white truncate pr-3">{c.client}</span>
                    <span className="text-amber-400 font-semibold shrink-0">{formatLKR(c.due_amount)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>


      {/* This Month Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            label: "This Month Income",
            value: data.currentMonthStats?.income || 0,
            prevValue: data.currentMonthStats?.lastMonthIncome || 0,
            isCurrency: true,
          },
          {
            label: "This Month Expenses",
            value: data.currentMonthStats?.expenses || 0,
            prevValue: data.currentMonthStats?.lastMonthExpenses || 0,
            isCurrency: true,
            invertColors: true, 
          },
          {
            label: "This Month Profit",
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

        {/* Expense Breakdown Widget */}
        <ExpenseBreakdownWidget initialData={data.expenseBreakdown} />
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
                      <ArrowDownLeft className={`w-5 h-5 text-green-400`} />
                    ) : (
                      <ArrowUpRight className={`w-5 h-5 text-red-400`} />
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

        {/* Top Clients Widget */}
        <TopClientsWidget />
      </div>
    </div>
  );
}