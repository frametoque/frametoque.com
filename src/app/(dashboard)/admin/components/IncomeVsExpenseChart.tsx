"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface IncomeVsExpenseChartProps {
  data: any[];
  chartYear: number;
  formatLKR: (amount: number) => string;
}

export default function IncomeVsExpenseChart({
  data,
  chartYear,
  formatLKR,
}: IncomeVsExpenseChartProps) {
  const filteredData = (data || []).filter((d: any) => d.year === chartYear);

  return (
    <div className="w-full flex flex-col">
      <div className="flex items-center justify-end gap-3 text-xs mb-3 px-1">
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-1 rounded-full bg-green-500 inline-block" />
          <span className="text-gray-400 font-medium">Income</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-1 rounded-full bg-rose-500 inline-block" />
          <span className="text-gray-400 font-medium">Expenses</span>
        </div>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="dashboardIncomeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="dashboardExpenseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis
              stroke="#9ca3af"
              fontSize={10}
              width={48}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) =>
                val >= 1000000
                  ? `${(val / 1000000).toFixed(1)}M`
                  : val >= 1000
                  ? `${Math.round(val / 1000)}k`
                  : `${val}`
              }
            />
            <Tooltip
              cursor={{ stroke: "rgba(255,255,255,0.15)", strokeWidth: 1 }}
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const inc = Number(payload.find((p) => p.dataKey === "income")?.value || 0);
                const exp = Number(payload.find((p) => p.dataKey === "expenses")?.value || 0);
                const profit = inc - exp;
                return (
                  <div className="bg-[#0a0a0f]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 shadow-2xl text-xs space-y-1.5 min-w-[190px]">
                    <p className="font-bold text-white text-sm border-b border-white/10 pb-1">
                      {label} {chartYear}
                    </p>
                    <div className="flex justify-between items-center gap-4 text-green-400">
                      <span className="flex items-center gap-1.5 font-medium">
                        <span className="w-2 h-2 rounded-full bg-green-400" />
                        INC
                      </span>
                      <span className="font-bold">{formatLKR(inc)}</span>
                    </div>
                    <div className="flex justify-between items-center gap-4 text-red-400">
                      <span className="flex items-center gap-1.5 font-medium">
                        <span className="w-2 h-2 rounded-full bg-red-400" />
                        EXP
                      </span>
                      <span className="font-bold">{formatLKR(exp)}</span>
                    </div>
                    <div className="flex justify-between items-center gap-4 pt-1 border-t border-white/10 text-white font-medium">
                      <span>Net Profit</span>
                      <span className={`font-bold ${profit >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {profit >= 0 ? "+" : ""}{formatLKR(profit)}
                      </span>
                    </div>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="income"
              name="Income"
              stroke="#22c55e"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#dashboardIncomeGrad)"
            />
            <Area
              type="monotone"
              dataKey="expenses"
              name="Expenses"
              stroke="#f43f5e"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#dashboardExpenseGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

