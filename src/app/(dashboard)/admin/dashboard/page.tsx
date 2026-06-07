"use client";

import { useEffect, useState } from "react";
import { Wallet, Receipt, TrendingUp, AlertCircle, ArrowUpRight, ArrowDownRight, FileText } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { getDashboardData } from "../actions/actions";

const formatLKR = (amount: number) => {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
  }).format(amount || 0);
};

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await getDashboardData();
        setData(res);
      } catch (e) {
        console.error("Failed to load dashboard data", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading || !data) {
    return <div className="p-8 text-center text-gray-400 animate-pulse">Loading dashboard...</div>;
  }

  const stats = [
    { label: "Total Income", value: formatLKR(data.totalIncome), icon: Wallet, color: "text-green-400", bg: "bg-green-400/10" },
    { label: "Total Expenses", value: formatLKR(data.totalExpenses), icon: Receipt, color: "text-red-400", bg: "bg-red-400/10" },
    { label: "Net Profit", value: formatLKR(data.netProfit), icon: TrendingUp, color: "text-brand-400", bg: "bg-brand-400/10" },
    { label: "Unpaid Invoices", value: data.unpaidCount.toString(), icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-400/10" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
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
