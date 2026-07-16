"use client";

import { useEffect, useState } from "react";
import { Wallet, Receipt, TrendingUp, AlertCircle, ArrowUpRight, ArrowDownRight, FileText, Users, Eye } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";
import { getDashboardData } from "../actions/actions";
import { getAnalyticsData } from "../actions/analytics";
import DateRangeSelector from "../components/DateRangeSelector";

const formatLKR = (amount: number) => {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
  }).format(amount || 0);
};

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("lifetime");
  const [startDate, setStartDate] = useState("1970-01-01");
  const [endDate, setEndDate] = useState("2099-12-31");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [res, analyticsRes] = await Promise.all([
          getDashboardData(startDate, endDate),
          getAnalyticsData("all time").catch(() => null),
        ]);
        setData(res);
        setAnalytics(analyticsRes);
      } catch (e) {
        console.error("Failed to load dashboard data", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [startDate, endDate]);

  if (loading || !data) {
    return <div className="p-8 text-center text-gray-400 animate-pulse">Loading dashboard...</div>;
  }

  const stats = [
    { label: "Total Income", value: formatLKR(data.totalIncome), icon: Wallet, color: "text-green-400", bg: "bg-green-400/10" },
    { label: "Total Expenses", value: formatLKR(data.totalExpenses), icon: Receipt, color: "text-red-400", bg: "bg-red-400/10" },
    { label: "Net Profit", value: formatLKR(data.netProfit), icon: TrendingUp, color: "text-brand-400", bg: "bg-brand-400/10" },
    { label: "Unpaid Invoices", value: data.unpaidCount.toString(), icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-400/10" },
  ];

  const analyticsStats = analytics
    ? [
        { label: "Visitors (All Time)", value: (analytics.totalVisitors ?? 0).toLocaleString(), icon: Users, color: "text-indigo-400", bg: "bg-indigo-400/10" },
        { label: "Pageviews (All Time)", value: (analytics.totalPageviews ?? 0).toLocaleString(), icon: Eye, color: "text-brand-400", bg: "bg-brand-400/10" },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <DateRangeSelector
          dateRange={dateRange}
          startDate={startDate}
          endDate={endDate}
          onRangeChange={setDateRange}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex items-center gap-4 hover:bg-white/10 transition-colors">
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
                <p className="text-2xl font-semibold">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
          <h2 className="text-xl font-semibold mb-6">Income vs Expenses</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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

        {/* Recent Invoices */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Recent Invoices</h2>
          </div>
          <div className="space-y-4">
            {data.recentInvoices.map((invoice: any, i: number) => {
              let statusColor = "text-gray-400 bg-gray-400/10 border-gray-400/20";
              const statusStr = invoice.status?.toLowerCase() || '';
              if (statusStr === 'paid') statusColor = "text-green-400 bg-green-400/10 border-green-400/20";
              else if (statusStr === 'unpaid' || statusStr === 'pending') statusColor = "text-amber-400 bg-amber-400/10 border-amber-400/20";
              else if (statusStr === 'overdue') statusColor = "text-red-400 bg-red-400/10 border-red-400/20";

              return (
                <div key={i} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/5 rounded-xl">
                      <FileText className="w-5 h-5 text-gray-300" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{invoice.id}</p>
                      <p className="text-xs text-gray-400 truncate w-24">{invoice.client || 'Unknown'}</p>
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

      {/* Net Income & Expense Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Net Income comparison table */}
        <div className="lg:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
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
                            "Stock Purchase": "#1d4ed8", // Cobalt
                            "Marketing": "#0ea5e9",      // Sky
                            "Equipment": "#3b82f6",      // Bright Blue
                            "Software": "#2563eb",       // Royal Blue
                            "Freelancers": "#60a5fa",    // Light Blue
                            "Transport": "#1e40af",      // Dark Blue
                            "Other": "#1e3a8a",          // Navy
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

      {/* Recent Transactions */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
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
    </div>
  );
}