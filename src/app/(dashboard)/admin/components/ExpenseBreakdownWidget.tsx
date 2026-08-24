"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { getExpenseBreakdownByMode } from "../actions/actions";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MODES = ["This Month", "Last Month", "This Year", "Last Year", "Lifetime"];

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

  const handlePrev = () => {
    const idx = MODES.indexOf(mode);
    if (idx > 0) setMode(MODES[idx - 1]);
  };

  const handleNext = () => {
    const idx = MODES.indexOf(mode);
    if (idx < MODES.length - 1) setMode(MODES[idx + 1]);
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Expense Breakdown</h2>
        <div className="flex items-center gap-2 text-gray-400 bg-white/5 border border-white/10 px-2 py-1.5 rounded-xl">
          <button onClick={handlePrev} disabled={mode === MODES[0]} className="hover:text-white transition-colors p-1 disabled:opacity-30">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-white font-medium text-sm w-[90px] text-center">{mode}</span>
          <button onClick={handleNext} disabled={mode === MODES[MODES.length - 1]} className="hover:text-white transition-colors p-1 disabled:opacity-30">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-[200px] flex-1">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-8 flex-1">No expenses recorded for this range.</p>
      ) : (
        <div className="flex flex-col xl:flex-row items-center justify-center gap-4 flex-1 mt-2">
          <div className="relative h-[220px] w-[220px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={75}
                  outerRadius={100}
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
                  itemStyle={{ color: '#fff', fontSize: '12px' }}
                  formatter={(value: any) => formatLKR(value)}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Total</span>
              <span className="text-sm font-bold text-white">
                {formatLKR(total)}
              </span>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-2 scrollbar-thin shrink-0 min-w-[200px]">
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
                <div key={index} className="flex items-center justify-between text-xs gap-3">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-gray-300 font-medium truncate">{entry.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-gray-500 text-[10px] w-8 text-right">{entry.percentage}%</span>
                    <span className="text-white font-semibold w-[85px] text-right">{formatLKR(entry.value)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
