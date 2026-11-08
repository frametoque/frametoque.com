"use client";

import { useEffect, useState } from "react";
import useSWR from 'swr';
import { TrendingUp, TrendingDown, DollarSign, Percent, Download, FileText, Calendar, Users, BookOpen, Search, ArrowUpRight, ArrowDownRight, Link as LinkIcon, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getReports, getClients } from "../actions/actions";
import AnimatedNumber from "../components/AnimatedNumber";
import { useAdminDateRange } from "../context/AdminDateRangeContext";
import WheelDatePicker from "../components/WheelDatePicker";

const formatLKR = (amount: number) => {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
  }).format(amount || 0);
};

export default function ReportsPage() {
  const { dateRange, startDate, endDate, setStartDate, setEndDate, setDateRange } = useAdminDateRange();
  const [activeTab, setActiveTab] = useState<"overview" | "profit_loss" | "trial_balance" | "general_ledger" | "account_ledger">("overview");

  // Ledger specific state
  const [transactions, setTransactions] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

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
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${monthNames[monthIdx]} ${day}, ${year}`;
  };

  const [ledgerLoading, setLedgerLoading] = useState(true);

  const fetcher = async () => {
    const [res, cls, accs] = await Promise.all([
      getReports(startDate, endDate),
      getClients(),
      import("../actions/accounts").then(m => m.getAccounts(startDate, endDate))
    ]);
    return { data: res, clients: cls, accounts: accs };
  };

  const { data: swrData, isLoading: loading } = useSWR(['reports-main', startDate, endDate], fetcher);
  const { data, clients = [], accounts = [] } = swrData || {};

  useEffect(() => {
    let cancelled = false;
    async function loadLedger() {
      setLedgerLoading(true);
      try {
        const txs = await import("../actions/accounts").then(m => m.getLedger(activeTab === "account_ledger" ? selectedAccountId : null, startDate, endDate));
        if (!cancelled) {
          setTransactions(txs);
        }
      } catch (e) {
        console.error("Failed to load ledger", e);
      } finally {
        if (!cancelled) setLedgerLoading(false);
      }
    }
    loadLedger();
    return () => { cancelled = true; };
  }, [startDate, endDate, activeTab, selectedAccountId]);

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



  // Compute chronological running balance
  let runningBalance = 0;
  const journalEntriesWithBalance = [...(data?.journalEntries || [])]
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
    { label: "Total Income", value: formatLKR(data?.totalIncome || 0), icon: TrendingUp, color: "text-green-400", bg: "bg-green-400/10" },
    { label: "Total Expenses", value: formatLKR(data?.totalExpenses || 0), icon: TrendingDown, color: "text-red-400", bg: "bg-red-400/10" },
    { label: "Net Profit", value: formatLKR(data?.netProfit || 0), icon: DollarSign, color: "text-brand-400", bg: "bg-brand-400/10" },
    { label: "Profit Margin", value: `${data?.profitMargin || 0}%`, icon: Percent, color: "text-blue-400", bg: "bg-blue-400/10" },
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
              <p className="text-2xl font-semibold">
                <AnimatedNumber value={stat.value} />
              </p>
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
            { id: "account_ledger", label: "Account Ledgers" },
            { id: "profit_loss", label: "Profit & Loss" },
            { id: "trial_balance", label: "Trial Balance" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                if (tab.id === 'account_ledger' && accounts.length > 0 && !selectedAccountId) {
                  setSelectedAccountId(accounts[0].id);
                }
                if (tab.id === 'general_ledger') {
                  setSelectedAccountId(null);
                }
              }}
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

      {loading || !data ? (
        <div className="bg-white/5 border border-white/10 rounded-3xl p-16 flex justify-center items-center text-gray-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
          <span>Loading reports...</span>
        </div>
      ) : (
        <>
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

      {(activeTab === "general_ledger" || activeTab === "account_ledger") && (
        <div className="space-y-6">
          {activeTab === "account_ledger" && accounts.find(a => a.id === selectedAccountId) && (() => {
            const selectedAccount = accounts.find(a => a.id === selectedAccountId);
            const periodInflow = transactions.reduce((sum, t) => sum + t.debit, 0);
            const periodOutflow = transactions.reduce((sum, t) => sum + t.credit, 0);
            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/5 border border-white/10 p-6 rounded-3xl flex items-center gap-4">
                  <div className="p-4 bg-brand-500/10 text-brand-400 rounded-2xl"><BookOpen className="w-6 h-6"/></div>
                  <div><p className="text-sm text-gray-400">Account Book Balance</p><p className="text-2xl font-semibold">{formatLKR(selectedAccount.currentBalance)}</p></div>
                </div>
                <div className="bg-white/5 border border-white/10 p-6 rounded-3xl flex items-center gap-4">
                  <div className="p-4 bg-green-500/10 text-green-400 rounded-2xl"><ArrowUpRight className="w-6 h-6"/></div>
                  <div><p className="text-sm text-gray-400">Period Inflow (Debit)</p><p className="text-2xl font-semibold text-green-400">+{formatLKR(periodInflow)}</p></div>
                </div>
                <div className="bg-white/5 border border-white/10 p-6 rounded-3xl flex items-center gap-4">
                  <div className="p-4 bg-red-500/10 text-red-400 rounded-2xl"><ArrowDownRight className="w-6 h-6"/></div>
                  <div><p className="text-sm text-gray-400">Period Outflow (Credit)</p><p className="text-2xl font-semibold text-red-400">-{formatLKR(periodOutflow)}</p></div>
                </div>
              </div>
            );
          })()}

          <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
            <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                {activeTab === 'general_ledger' && (
                  <h2 className="text-lg font-semibold">Ledger: All Accounts</h2>
                )}
                {activeTab === 'account_ledger' && (
                  <select value={selectedAccountId || ""} onChange={e => setSelectedAccountId(parseInt(e.target.value))} className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none">
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.isCompanyAccount === false ? `${a.currentBalance < 0 ? 'Capital' : 'Debt'} ${a.name.replace(/Debts?\s*/i, '')}` : a.name} ({a.type.split(' ')[0]})</option>)}
                  </select>
                )}
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search descriptions..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-brand-500 transition-colors" />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-gray-400 uppercase tracking-wider">
                    <th className="p-4 font-medium">Date</th>
                    {activeTab === 'general_ledger' && <th className="p-4 font-medium">Account</th>}
                    <th className="p-4 font-medium">Description</th>
                    <th className="p-4 font-medium">Reference</th>
                    <th className="p-4 font-medium text-right">Debit (+)</th>
                    <th className="p-4 font-medium text-right">Credit (-)</th>
                    {activeTab === 'account_ledger' && <th className="p-4 font-medium text-right">Running Balance</th>}
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-white/5">
                  {ledgerLoading ? (
                    <tr><td colSpan={6} className="p-8 text-center text-gray-400">Loading ledger...</td></tr>
                  ) : transactions.filter(t => t.description.toLowerCase().includes(searchTerm.toLowerCase()) || t.referenceType.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-gray-400">No transactions found for this period.</td></tr>
                  ) : (
                    (() => {
                      let rb = activeTab === 'account_ledger' && selectedAccountId ? (accounts.find(a => a.id === selectedAccountId)?.initialBalance || 0) : 0;
                      
                      const filtered = transactions.filter(t => t.description.toLowerCase().includes(searchTerm.toLowerCase()) || t.referenceType.toLowerCase().includes(searchTerm.toLowerCase()));
                      
                      const withBalance = filtered.map(t => {
                        if (activeTab === 'account_ledger') {
                          rb += t.debit - t.credit;
                        }
                        return { ...t, rb };
                      });

                      return withBalance.reverse().map((t, i) => {
                        const accName = accounts.find(a => a.id === t.accountId)?.name || 'Unknown';
                        const relatedAccName = accounts.find(a => a.id === t.relatedAccountId)?.name || 'Unknown';
                        let displayAccount = accName;
                        if (activeTab === 'general_ledger' && t.referenceType === 'Transfer') {
                          displayAccount = `${accName} → ${relatedAccName}`;
                        }
                        return (
                          <tr key={i} className="hover:bg-white/5 transition-colors">
                            <td className="p-4 text-gray-300">{new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                            {activeTab === 'general_ledger' && <td className="p-4 text-gray-300 text-xs">{displayAccount}</td>}
                            <td className="p-4">{t.description || "-"}</td>
                            <td className="p-4">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${t.referenceType === 'Income' ? 'bg-green-500/10 text-green-400' : t.referenceType === 'Expense' ? 'bg-red-500/10 text-red-400' : 'bg-purple-500/10 text-purple-400'}`}>
                                {t.referenceType.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-4 text-right text-green-400">{t.debit > 0 ? `+${formatLKR(t.debit)}` : "-"}</td>
                            <td className="p-4 text-right text-red-400">{t.credit > 0 ? `-${formatLKR(t.credit)}` : "-"}</td>
                            {activeTab === 'account_ledger' && (
                              <td className={`p-4 text-right font-medium ${t.rb < 0 ? 'text-red-400' : 'text-green-400'}`}>
                                {formatLKR(t.rb)}
                              </td>
                            )}
                          </tr>
                        );
                      });
                    })()
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "profit_loss" && (
        <div className="space-y-6">
          {/* Income vs Expenses Cards */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-around gap-8 text-center">
            <div className="flex flex-col">
              <span className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Income</span>
              <span className="text-2xl font-bold text-green-400">{formatLKR(data.totalIncome)}</span>
            </div>
            <div className="hidden md:block text-2xl text-gray-500 font-light">—</div>
            <div className="flex flex-col">
              <span className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Expenses</span>
              <span className="text-2xl font-bold text-red-400">{formatLKR(data.totalExpenses)}</span>
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
                    <span className="text-white">{formatLKR(data.totalIncome)}</span>
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
                    <span className="text-white">{formatLKR(data.totalExpenses)}</span>
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
                  <td colSpan={3} className="py-3 px-4 text-white text-xs uppercase tracking-wider">Accounts (Assets & Liabilities)</td>
                </tr>
                {accounts.map(acc => {
                  if (acc.currentBalance === 0) return null;
                  return (
                    <tr key={acc.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-6 text-gray-300 pl-8">
                        {acc.isCompanyAccount === false 
                          ? `${acc.currentBalance < 0 ? 'Capital' : 'Debt'} ${acc.name.replace(/Debts?\s*/i, '')}` 
                          : acc.name}
                      </td>
                      <td className="py-3.5 px-4 text-right text-white font-medium">
                        {acc.currentBalance > 0 ? formatLKR(acc.currentBalance) : "—"}
                      </td>
                      <td className="py-3.5 px-4 text-right text-gray-400 font-medium">
                        {acc.currentBalance < 0 ? formatLKR(Math.abs(acc.currentBalance)) : "—"}
                      </td>
                    </tr>
                  );
                })}

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
                  <td className="py-3.5 px-4 text-right text-white font-bold">
                    {formatLKR(data.totalIncome)}
                  </td>
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
                  <td className="py-3.5 px-4 text-right text-white font-bold">
                    {formatLKR(data.totalExpenses)}
                  </td>
                  <td className="py-3.5 px-4 text-right text-gray-500 font-medium">—</td>
                </tr>

                {/* Initial Capital / Opening Balance */}
                {(() => {
                  const totalInit = accounts.reduce((sum, a) => sum + (a.initialBalance || 0), 0);
                  if (totalInit === 0) return null;
                  return (
                    <tr className="font-semibold text-gray-300">
                      <td className="py-3.5 px-6 pl-8">Net Opening Balance</td>
                      <td className="py-3.5 px-4 text-right text-white font-medium">
                        {totalInit < 0 ? formatLKR(Math.abs(totalInit)) : "—"}
                      </td>
                      <td className="py-3.5 px-4 text-right text-white font-medium">
                        {totalInit > 0 ? formatLKR(totalInit) : "—"}
                      </td>
                    </tr>
                  );
                })()}

                {/* Grand Totals */}
                {(() => {
                  const totalAccountsDebit = accounts.reduce((sum, a) => sum + (a.currentBalance > 0 ? a.currentBalance : 0), 0);
                  const totalAccountsCredit = accounts.reduce((sum, a) => sum + (a.currentBalance < 0 ? Math.abs(a.currentBalance) : 0), 0);
                  const totalInit = accounts.reduce((sum, a) => sum + (a.initialBalance || 0), 0);
                  
                  const grandTotalDebit = totalAccountsDebit + data.totalExpenses + (totalInit < 0 ? Math.abs(totalInit) : 0);
                  const grandTotalCredit = totalAccountsCredit + data.totalIncome + (totalInit > 0 ? totalInit : 0);
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
        </>
      )}
    </div>
  );
}
