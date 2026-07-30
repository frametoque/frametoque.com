"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, DollarSign, Percent, Download, FileText, Calendar, Users, BookOpen, Search } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getReports, getClients } from "../actions/actions";
import { useAdminDateRange } from "../context/AdminDateRangeContext";
import WheelDatePicker from "../components/WheelDatePicker";

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
  const { dateRange, startDate, endDate, setStartDate, setEndDate, setDateRange } = useAdminDateRange();
  const [activeTab, setActiveTab] = useState<"overview" | "profit_loss" | "trial_balance" | "general_ledger">("overview");

  const [searchTerm, setSearchTerm] = useState("");
  const [journalFilter, setJournalFilter] = useState("all");
  const [activePicker, setActivePicker] = useState<"trial_date" | null>(null);

  const formatDateFriendly = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const year = parts[0];
    const monthIdx = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    return `${monthNames[monthIdx]} ${day}, ${year}`;
  };


  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [res, cls] = await Promise.all([
          getReports(startDate, endDate),
          getClients(),
        ]);
        if (!cancelled) {
          setData(res);
          setClients(cls);
        }
      } catch (e) {
        console.error("Failed to load reports", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [startDate, endDate]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("reports:tab-change", { detail: activeTab }));
    if (activeTab === "trial_balance" && endDate === "2099-12-31") {
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      setEndDate(todayStr);
      setStartDate("1970-01-01");
    }
  }, [activeTab, endDate, setEndDate, setStartDate]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("reports:formatted-date", { detail: formatDateFriendly(endDate) }));
  }, [endDate]);

  useEffect(() => {
    const handleToggle = () => {
      setActivePicker(prev => prev === "trial_date" ? null : "trial_date");
    };
    window.addEventListener("reports:toggle-datepicker", handleToggle);
    return () => {
      window.removeEventListener("reports:toggle-datepicker", handleToggle);
    };
  }, []);



  if (loading || !data) {
    return (
      <div className="space-y-6">
        {/* Four Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
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

        {/* Tab Buttons */}
        <div className="flex flex-wrap gap-2 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-white/5 border border-white/10 rounded-full w-32" />
          ))}
        </div>
        
        {/* Two side-by-side charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
            <div className="h-6 bg-white/10 rounded-full w-40" />
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-4 bg-white/5 rounded-full w-20" />
                  <div className="h-8 bg-white/10 rounded-2xl flex-1" />
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
            <div className="h-6 bg-white/10 rounded-full w-40" />
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-4 bg-white/5 rounded-full w-20" />
                  <div className="h-8 bg-white/10 rounded-2xl flex-1" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Client Revenue Chart */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 animate-pulse space-y-6">
          <div className="h-6 bg-white/10 rounded-full w-48" />
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-4 bg-white/5 rounded-full w-20" />
                <div className="h-8 bg-white/10 rounded-2xl flex-1" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
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
    <div className="space-y-6 print:p-0 print:m-0">
      {/* Stats Cards - Displayed on all tabs */}
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

      {/* Tabs Row - Pill styled like expenses page categories */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 print:hidden">
        <div className="flex flex-wrap gap-2">
          {[
            { id: "overview", label: "Overview Dashboard" },
            { id: "general_ledger", label: "General Ledger" },
            { id: "profit_loss", label: "Profit & Loss" },
            { id: "trial_balance", label: "Trial Balance" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-white text-black border-white shadow-md font-bold"
                  : "bg-white/5 text-gray-400 border-white/10 hover:text-white hover:bg-white/10"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Datepicker dropdown for trial balance (anchored here) */}
        {activePicker === "trial_date" && (
          <div className="relative">
            <div className="absolute right-0 top-2 z-50 w-[310px]">
              <WheelDatePicker
                value={endDate}
                onChange={(date) => {
                  setEndDate(date);
                  setStartDate("1970-01-01");
                }}
                onClose={() => setActivePicker(null)}
                label="As of Date"
              />
            </div>
          </div>
        )}
      </div>

      {activeTab === "overview" && (
        <>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Income Chart */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
              <h2 className="text-xl font-semibold mb-6">Income by Service</h2>
              <div style={{ height: Math.max(300, (data.incomeByService?.length || 0) * 45) }} className="w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.incomeByService} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis type="number" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `LKR ${value / 1000}k`} />
                    <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} width={150} />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{ backgroundColor: 'rgba(10,10,15,0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value: any) => [formatLKR(value), 'Income']}
                    />
                    <Bar dataKey="value" fill="#4ade80" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Expenses Chart */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
              <h2 className="text-xl font-semibold mb-6">Expenses Breakdown</h2>
              <div style={{ height: Math.max(300, (data.expensesBreakdown?.length || 0) * 45) }} className="w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.expensesBreakdown} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis type="number" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `LKR ${value / 1000}k`} />
                    <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} width={150} />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{ backgroundColor: 'rgba(10,10,15,0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value: any) => [formatLKR(value), 'Expense']}
                    />
                    <Bar dataKey="value" fill="#f87171" radius={[0, 4, 4, 0]} barSize={20} />
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
        </>
      )}

      {activeTab === "general_ledger" && (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-xl font-semibold text-white">General Ledger</h2>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 h-10 items-center">
                {["all", "income", "expense"].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setJournalFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                      journalFilter === filter
                        ? "bg-white text-black"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
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
      )}

      {activeTab === "profit_loss" && (
        <div className="space-y-6">
          {/* Income vs Expenses Cards */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-around gap-8 text-center">
            <div className="flex flex-col">
              <span className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Income</span>
              <span className="text-2xl font-bold text-green-400">{formatLKR(data.annualRevenue)}</span>
            </div>
            <div className="hidden md:block text-2xl text-gray-500 font-light">—</div>
            <div className="flex flex-col">
              <span className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Expenses</span>
              <span className="text-2xl font-bold text-red-400">{formatLKR(data.annualExpenses)}</span>
            </div>
            <div className="hidden md:block text-2xl text-gray-500 font-light">=</div>
            <div className="flex flex-col">
              <span className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Net Profit</span>
              <span className={`text-2xl font-bold ${data.netProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
                {data.netProfit < 0 ? "-" : ""}{formatLKR(Math.abs(data.netProfit))}
              </span>
            </div>
          </div>

          {/* Accounts Breakdown Table */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Accounts</h3>
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                {dateRange === "lifetime"
                  ? "Lifetime"
                  : `${new Date(startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} to ${new Date(endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
              </span>
            </div>

            <div className="space-y-6">
              {/* Income */}
              <div>
                <h4 className="text-sm font-bold text-white mb-3">Income</h4>
                <div className="divide-y divide-white/5 pl-4">
                  {data.incomeByService.map((row: any, i: number) => (
                    <div key={i} className="flex justify-between py-3.5 text-sm">
                      <span className="text-gray-300">{row.name}</span>
                      <span className="text-white font-semibold">{formatLKR(row.value)}</span>
                    </div>
                  ))}
                  {data.incomeByService.length === 0 && (
                    <div className="flex justify-between py-3.5 text-sm text-gray-500">
                      <span>No income recorded in this period</span>
                      <span>LKR 0.00</span>
                    </div>
                  )}
                  <div className="flex justify-between py-4 text-sm font-bold border-t border-white/10 mt-2">
                    <span className="text-white">Total Income</span>
                    <span className="text-white">{formatLKR(data.annualRevenue)}</span>
                  </div>
                </div>
              </div>

              {/* Expenses */}
              <div>
                <h4 className="text-sm font-bold text-white mb-3">Expenses</h4>
                <div className="divide-y divide-white/5 pl-4">
                  {data.expensesBreakdown.map((row: any, i: number) => (
                    <div key={i} className="flex justify-between py-3.5 text-sm">
                      <span className="text-gray-300">{row.name}</span>
                      <span className="text-white font-semibold">{formatLKR(row.value)}</span>
                    </div>
                  ))}
                  {data.expensesBreakdown.length === 0 && (
                    <div className="flex justify-between py-3.5 text-sm text-gray-500">
                      <span>No expenses recorded in this period</span>
                      <span>LKR 0.00</span>
                    </div>
                  )}
                  <div className="flex justify-between py-4 text-sm font-bold border-t border-white/10 mt-2">
                    <span className="text-white">Total Expenses</span>
                    <span className="text-white">{formatLKR(data.annualExpenses)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Margin */}
            <div className="bg-white/5 rounded-2xl p-5 flex justify-between items-center border border-white/5">
              <div>
                <div className="text-sm font-bold text-white">Net Profit</div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">As a percentage of Total Income</div>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold ${data.netProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {data.netProfit < 0 ? "-" : ""}{formatLKR(Math.abs(data.netProfit))}
                </div>
                <div className="text-xs text-gray-400 mt-1">{data.profitMargin}%</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "trial_balance" && (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Accounts</h3>
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">
              As of {new Date(endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4 w-1/2">Accounts</th>
                  <th className="py-3 px-4 text-right">Debit</th>
                  <th className="py-3 px-4 text-right">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {/* Assets Section */}
                <tr className="bg-white/5 font-bold">
                  <td colSpan={3} className="py-3 px-4 text-white text-xs uppercase tracking-wider">Assets</td>
                </tr>
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="py-3.5 px-6 text-gray-300 pl-8">Primary Bank Account</td>
                  <td className="py-3.5 px-4 text-right text-white font-medium">
                    {data.netProfit >= 0 ? formatLKR(data.netProfit) : "—"}
                  </td>
                  <td className="py-3.5 px-4 text-right text-gray-400 font-medium">
                    {data.netProfit < 0 ? formatLKR(Math.abs(data.netProfit)) : "—"}
                  </td>
                </tr>
                {/* Total Assets calculation */}
                <tr className="font-semibold text-gray-300">
                  <td className="py-3.5 px-6 pl-8">Total Assets</td>
                  <td className="py-3.5 px-4 text-right text-white font-bold">
                    {data.netProfit >= 0 ? formatLKR(data.netProfit) : "—"}
                  </td>
                  <td className="py-3.5 px-4 text-right text-white font-bold">
                    {data.netProfit < 0 ? formatLKR(Math.abs(data.netProfit)) : "—"}
                  </td>
                </tr>

                {/* Income Section */}
                <tr className="bg-white/5 font-bold">
                  <td colSpan={3} className="py-3 px-4 text-white text-xs uppercase tracking-wider">Income</td>
                </tr>
                {data.incomeByService.map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-6 text-gray-300 pl-8">{row.name}</td>
                    <td className="py-3.5 px-4 text-right text-gray-500 font-medium">—</td>
                    <td className="py-3.5 px-4 text-right text-white font-medium">{formatLKR(row.value)}</td>
                  </tr>
                ))}
                {data.incomeByService.length === 0 && (
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-6 text-gray-400 pl-8">No Income Category</td>
                    <td className="py-3.5 px-4 text-right text-gray-500 font-medium">—</td>
                    <td className="py-3.5 px-4 text-right text-gray-500 font-medium">—</td>
                  </tr>
                )}
                <tr className="font-semibold text-gray-300">
                  <td className="py-3.5 px-6 pl-8">Total Income</td>
                  <td className="py-3.5 px-4 text-right text-gray-500 font-medium">—</td>
                  <td className="py-3.5 px-4 text-right text-white font-bold">{formatLKR(data.annualRevenue)}</td>
                </tr>

                {/* Expenses Section */}
                <tr className="bg-white/5 font-bold">
                  <td colSpan={3} className="py-3 px-4 text-white text-xs uppercase tracking-wider">Expenses</td>
                </tr>
                {data.expensesBreakdown.map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-6 text-gray-300 pl-8">{row.name}</td>
                    <td className="py-3.5 px-4 text-right text-white font-medium">{formatLKR(row.value)}</td>
                    <td className="py-3.5 px-4 text-right text-gray-500 font-medium">—</td>
                  </tr>
                ))}
                {data.expensesBreakdown.length === 0 && (
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-6 text-gray-400 pl-8">No Expense Category</td>
                    <td className="py-3.5 px-4 text-right text-gray-500 font-medium">—</td>
                    <td className="py-3.5 px-4 text-right text-gray-500 font-medium">—</td>
                  </tr>
                )}
                <tr className="font-semibold text-gray-300">
                  <td className="py-3.5 px-6 pl-8">Total Expenses</td>
                  <td className="py-3.5 px-4 text-right text-white font-bold">{formatLKR(data.annualExpenses)}</td>
                  <td className="py-3.5 px-4 text-right text-gray-500 font-medium">—</td>
                </tr>

                {/* Grand Totals */}
                {(() => {
                  const grandTotalDebit = (data.netProfit >= 0 ? data.netProfit : 0) + data.annualExpenses;
                  const grandTotalCredit = (data.netProfit < 0 ? Math.abs(data.netProfit) : 0) + data.annualRevenue;
                  return (
                    <tr className="bg-white/10 font-bold border-t-2 border-white/20">
                      <td className="py-4 px-4 text-white uppercase tracking-wider">Total for all accounts</td>
                      <td className="py-4 px-4 text-right text-white text-base">{formatLKR(grandTotalDebit)}</td>
                      <td className="py-4 px-4 text-right text-white text-base">{formatLKR(grandTotalCredit)}</td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
