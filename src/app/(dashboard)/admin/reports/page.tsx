"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, DollarSign, Percent, Download, FileText, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getReports } from "../actions/actions";

const formatLKR = (amount: number) => {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
  }).format(amount || 0);
};

export default function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("lifetime");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await getReports(dateRange);
        setData(res);
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

  const stats = [
    { label: "Annual Revenue", value: formatLKR(data.annualRevenue), icon: TrendingUp, color: "text-green-400", bg: "bg-green-400/10" },
    { label: "Annual Expenses", value: formatLKR(data.annualExpenses), icon: TrendingDown, color: "text-red-400", bg: "bg-red-400/10" },
    { label: "Net Profit", value: formatLKR(data.netProfit), icon: DollarSign, color: "text-brand-400", bg: "bg-brand-400/10" },
    { label: "Profit Margin", value: `${data.profitMargin}%`, icon: Percent, color: "text-blue-400", bg: "bg-blue-400/10" },
  ];

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
                <XAxis type="number" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `LKR ${value/1000}k`} />
                <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} width={80} />
                <Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
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
                <XAxis type="number" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `LKR ${value/1000}k`} />
                <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} width={80} />
                <Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
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

      {/* Export Row */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-wrap items-center justify-between gap-4">
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
      </div>
    </div>
  );
}
