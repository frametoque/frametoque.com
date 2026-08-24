"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { getExpenseBreakdownByMode } from "../actions/actions";

const formatLKR = (amount: number) => {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
  }).format(amount || 0);
};

export default function ExpenseBreakdownWidget({ initialData }: { initialData: any[] }) {
  const [mode, setMode] = useState<string>("Lifetime");
  const [data, setData] = useState<any[]>(initialData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Skip initial fetch since we have initialData for Lifetime
    if (mode === "Lifetime" && initialData.length > 0) {
      setData(initialData);
      return;
    }

    let active = true;
    setLoading(true);
    getExpenseBreakdownByMode(mode).then((res) => {
      if (active) {
        setData(res);
        setLoading(false);
      }
    }).catch(() => {
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, [mode, initialData]);

  const total = data.reduce((sum, r) => sum + r.value, 0);

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-col justify-between h-full min-h-[420px]">
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Expense Breakdown</h2>
          <select 
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-gray-300 outline-none focus:border-brand-500"
          >
            <option value="Current Month">Current Month</option>
            <option value="Last Month">Last Month</option>
            <option value="Current Year">Current Year</option>
            <option value="Last Year">Last Year</option>
            <option value="Lifetime">Lifetime</option>
          </select>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-[200px]">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">No expenses recorded for this range.</p>
        ) : (
          <>
            <div className="relative h-[200px] w-full flex items-center justify-center mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {data.map((entry: any, index: number) => {
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
                  {formatLKR(total)}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {data.map((entry: any, index: number) => {
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
  );
}
