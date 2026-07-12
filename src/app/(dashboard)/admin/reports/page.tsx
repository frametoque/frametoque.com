"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, DollarSign, Percent, Download, FileText, Calendar, Users, BookOpen, Search } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getReports, getClients } from "../actions/actions";

const formatLKR = (amount: number) => {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
  }).format(amount || 0);
};

export default function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("lifetime");

  const [searchTerm, setSearchTerm] = useState("");
  const [journalFilter, setJournalFilter] = useState("all");


  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [res, cls] = await Promise.all([
          getReports(dateRange),
          getClients(),
        ]);
        setData(res);
        setClients(cls);
      } catch (e) {
        console.error("Failed to load reports", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [dateRange]);

  if (loading || !data) {
    return <div className="p-8 text-center text-gray-400 animate-pulse">Loading financial reports...</div>;
  }

  // Compute chronological running balance
  let runningBalance = 0;
  const journalEntriesWithBalance = [...(data.journalEntries || [])]
    .reverse() // older transactions first to compute running balance
    .map((entry: any) => {
      if (entry.type === "income") {
        runningBalance += entry.amount;
      } else {
        runningBalance -= entry.amount;
      }
      return {
        ...entry,
        runningBalance
      };
    })
    .reverse(); // back to latest first for display

  // Filter journal entries
  const filteredJournal = journalEntriesWithBalance
    .filter((entry: any) => {
      const matchesSearch = 
        entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (journalFilter === "income") return matchesSearch && entry.type === "income";
      if (journalFilter === "expense") return matchesSearch && entry.type === "expense";
      return matchesSearch;
    });

  const stats = [
    { label: "Annual Revenue", value: formatLKR(data.annualRevenue), icon: TrendingUp, color: "text-green-400", bg: "bg-green-400/10" },
    { label: "Annual Expenses", value: formatLKR(data.annualExpenses), icon: TrendingDown, color: "text-red-400", bg: "bg-red-400/10" },
    { label: "Net Profit", value: formatLKR(data.netProfit), icon: DollarSign, color: "text-brand-400", bg: "bg-brand-400/10" },
    { label: "Profit Margin", value: `${data.profitMargin}%`, icon: Percent, color: "text-blue-400", bg: "bg-blue-400/10" },
  ];

  // Top 5 clients by revenue for the chart
  const topClientsChart = [...clients]
    .filter((c) => c.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map((c) => ({ name: c.name, revenue: c.revenue }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold">Financial Reports</h1>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-brand-500 transition-colors appearance-none cursor-pointer text-sm font-medium"
        >
          <option value="lifetime" className="bg-black">Lifetime</option>
          <option value="this year" className="bg-black">This Year</option>
          <option value="6 months" className="bg-black">Last 6 Months</option>
          <option value="three months" className="bg-black">Last 3 Months</option>
          <option value="one month" className="bg-black">Last Month</option>
        </select>
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

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Chart */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
          <h2 className="text-xl font-semibold mb-6">Income by Service</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.incomeByService} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `LKR ${value / 1000}k`} />
                <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} width={80} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: 'rgba(10,10,15,0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: any) => [formatLKR(value), 'Income']}
                />
                <Bar dataKey="value" fill="#4ade80" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expenses Chart */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
          <h2 className="text-xl font-semibold mb-6">Expenses Breakdown</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.expensesBreakdown} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `LKR ${value / 1000}k`} />
                <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} width={80} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: 'rgba(10,10,15,0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: any) => [formatLKR(value), 'Expense']}
                />
                <Bar dataKey="value" fill="#f87171" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Clients by Revenue Chart */}
      {topClientsChart.length > 0 && (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-brand-400/10 rounded-xl">
              <Users className="w-5 h-5 text-brand-400" />
            </div>
            <h2 className="text-xl font-semibold">Top Clients by Revenue</h2>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topClientsChart} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="#9ca3af"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `LKR ${value / 1000}k`}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#9ca3af"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={100}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: 'rgba(10,10,15,0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: any) => [formatLKR(value), 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#29B6F6" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Account Journal Ledger */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-xl">
              <BookOpen className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">General Ledger</h2>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* Filter Buttons */}
            <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 h-10 items-center">
              {["all", "income", "expense"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setJournalFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                    journalFilter === filter
                      ? "bg-brand-600 text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
            {/* Search Input */}
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search descriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 h-10 text-sm text-white placeholder-gray-500 outline-none focus:border-brand-500 transition-colors w-full"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 text-xs font-medium uppercase tracking-wider">
                <th className="p-4">Date</th>
                <th className="p-4">Description</th>
                <th className="p-4">Category</th>
                <th className="p-4 text-right">Debit (+)</th>
                <th className="p-4 text-right">Credit (-)</th>
                <th className="p-4 text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {filteredJournal.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    No transactions found in this period.
                  </td>
                </tr>
              ) : (
                filteredJournal.map((entry: any) => {
                  const isIncome = entry.type === "income";
                  const balIsPositive = entry.runningBalance >= 0;
                  const balText = entry.runningBalance >= 0
                    ? `LKR ${entry.runningBalance.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : `-LKR ${Math.abs(entry.runningBalance).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

                  return (
                    <tr key={entry.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 whitespace-nowrap text-gray-300">
                        {new Date(entry.date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="p-4 text-gray-300 max-w-xs truncate" title={entry.description}>
                        {entry.description || "Transaction"}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className="px-2.5 py-0.5 rounded-full text-xs bg-white/5 text-gray-400 border border-white/10">
                          {entry.category}
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap text-right font-bold text-green-400">
                        {isIncome ? `+LKR ${entry.amount.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-"}
                      </td>
                      <td className="p-4 whitespace-nowrap text-right font-bold text-red-400">
                        {!isIncome ? `-LKR ${entry.amount.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-"}
                      </td>
                      <td className={`p-4 whitespace-nowrap text-right font-bold ${balIsPositive ? "text-green-400" : "text-red-400"}`}>
                        {balText}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Row */}
      {/* <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Export Financial Data</h2>
          <p className="text-sm text-gray-400">Download your records for accounting or safekeeping.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-3xl text-sm font-medium transition-colors">
            <Calendar className="w-4 h-4" /> Custom date range
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-3xl text-sm font-medium transition-colors text-blue-400">
            <Download className="w-4 h-4" /> Export to CSV
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 rounded-3xl text-sm font-medium transition-colors text-white">
            <FileText className="w-4 h-4" /> Export to PDF
          </button>
        </div>
      </div> */}
    </div>
  );
}
