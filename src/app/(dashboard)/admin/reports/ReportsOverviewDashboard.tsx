"use client";

import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Layers,
} from "lucide-react";

interface ReportsOverviewProps {
  data: {
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: string | number;
    incomeByService: Array<{ name: string; value: number; count?: number }>;
    expensesBreakdown: Array<{ name: string; value: number; count?: number }>;
    journalEntries: Array<{
      id: string;
      rawId?: number;
      type: "income" | "expense";
      description: string;
      date: string | Date;
      amount: number;
      category: string;
      paymentMethod: string;
      invoiceId?: number | null;
    }>;
  };
  clients: Array<{
    id: number;
    name: string;
    company?: string;
    revenue: number;
    invoices?: number;
    income_count?: number;
  }>;
  accounts?: Array<{
    id: number;
    name: string;
    currentBalance: number;
    type?: string;
    isCompanyAccount?: boolean;
  }>;
  dateRange: string;
  startDate: string;
  endDate: string;
  formatLKR: (amount: number) => string;
}

// Visual color palettes - variants of Green for Income, variants of Red for Expenses
const INCOME_PALETTE = [
  "#22c55e", // vibrant emerald green (green-500)
  "#15803d", // deep forest green (green-700)
  "#4ade80", // bright light green (green-400)
  "#047857", // deep emerald pine (emerald-700)
  "#86efac", // soft pastel mint (green-300)
  "#166534", // hunter deep green (green-800)
  "#10b981", // bright sea green (emerald-500)
  "#a7f3d0", // pale light mint (emerald-200)
  "#14532d", // dark evergreen (green-900)
  "#34d399", // seafoam green (emerald-400)
];

const EXPENSE_PALETTE = [
  "#ef4444", // vibrant scarlet red (red-500)
  "#991b1b", // deep crimson wine (red-800)
  "#f87171", // light coral red (red-400)
  "#b91c1c", // rich ruby red (red-700)
  "#fca5a5", // soft pastel salmon red (red-300)
  "#7f1d1d", // dark burgundy maroon (red-900)
  "#dc2626", // bold cardinal red (red-600)
  "#e11d48", // vibrant rose red (rose-600)
  "#fecdd3", // light blush rose (rose-200)
  "#be123c", // deep rose ruby (rose-700)
];

export default function ReportsOverviewDashboard({
  data,
  clients = [],
  accounts = [],
  dateRange,
  startDate,
  endDate,
  formatLKR,
}: ReportsOverviewProps) {
  // Chart controls (simple English modes)
  const [heroView, setHeroView] = useState<"cashflow" | "net_margin" | "cumulative">("cashflow");
  const [granularity, setGranularity] = useState<"auto" | "monthly" | "weekly" | "daily">("auto");

  // Breakdown controls (Services vs Payment Methods)
  const [incomeDimension, setIncomeDimension] = useState<"service" | "payment_method">("service");
  const [hoveredIncomeIndex, setHoveredIncomeIndex] = useState<number | null>(null);

  const [expenseDimension, setExpenseDimension] = useState<"category" | "payment_method">("category");
  const [hoveredExpenseIndex, setHoveredExpenseIndex] = useState<number | null>(null);

  // 1. Determine active time step
  const activeGranularity = useMemo(() => {
    if (granularity !== "auto") return granularity;

    const startTs = new Date(startDate).getTime();
    const endTs = new Date(endDate).getTime();
    if (isNaN(startTs) || isNaN(endTs)) return "monthly";

    const daysDiff = Math.abs(endTs - startTs) / (1000 * 60 * 60 * 24);
    if (daysDiff <= 35) return "daily";
    if (daysDiff <= 120) return "weekly";
    return "monthly";
  }, [granularity, startDate, endDate]);

  // 2. Timeline aggregation
  const timelineData = useMemo(() => {
    const entries = data.journalEntries || [];
    if (entries.length === 0) return [];

    const sorted = [...entries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const map = new Map<
      string,
      {
        key: string;
        label: string;
        timestamp: number;
        income: number;
        expenses: number;
        netProfit: number;
        profitMargin: number;
        cumulativeNet: number;
        incomeCount: number;
        expenseCount: number;
      }
    >();

    for (const entry of sorted) {
      const d = new Date(entry.date);
      if (isNaN(d.getTime())) continue;

      let key = "";
      let label = "";
      let ts = 0;

      if (activeGranularity === "monthly") {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        key = `${year}-${month}`;
        label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        ts = new Date(year, d.getMonth(), 1).getTime();
      } else if (activeGranularity === "weekly") {
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const weekStart = new Date(d);
        weekStart.setDate(diff);
        weekStart.setHours(0, 0, 0, 0);
        key = weekStart.toISOString().split("T")[0];
        label = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        ts = weekStart.getTime();
      } else {
        key = d.toISOString().split("T")[0];
        label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        ts = new Date(key).getTime();
      }

      if (!map.has(key)) {
        map.set(key, {
          key,
          label,
          timestamp: ts,
          income: 0,
          expenses: 0,
          netProfit: 0,
          profitMargin: 0,
          cumulativeNet: 0,
          incomeCount: 0,
          expenseCount: 0,
        });
      }

      const item = map.get(key)!;
      if (entry.type === "income") {
        item.income += entry.amount;
        item.incomeCount += 1;
      } else {
        item.expenses += entry.amount;
        item.expenseCount += 1;
      }
    }

    const list = Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);

    // Continuous month filling
    let processedList = list;
    if (activeGranularity === "monthly" && list.length >= 2) {
      const filled: typeof list = [];
      const firstDate = new Date(list[0].timestamp);
      const lastDate = new Date(list[list.length - 1].timestamp);

      let curYear = firstDate.getFullYear();
      let curMonth = firstDate.getMonth();
      const endYear = lastDate.getFullYear();
      const endMonth = lastDate.getMonth();

      while (curYear < endYear || (curYear === endYear && curMonth <= endMonth)) {
        const key = `${curYear}-${String(curMonth + 1).padStart(2, "0")}`;
        const existing = map.get(key);
        const dateObj = new Date(curYear, curMonth, 1);
        const label = dateObj.toLocaleDateString("en-US", { month: "short", year: "2-digit" });

        if (existing) {
          filled.push(existing);
        } else {
          filled.push({
            key,
            label,
            timestamp: dateObj.getTime(),
            income: 0,
            expenses: 0,
            netProfit: 0,
            profitMargin: 0,
            cumulativeNet: 0,
            incomeCount: 0,
            expenseCount: 0,
          });
        }

        curMonth++;
        if (curMonth > 11) {
          curMonth = 0;
          curYear++;
        }
      }
      processedList = filled;
    }

    let runningCum = 0;
    return processedList.map((item) => {
      const net = item.income - item.expenses;
      runningCum += net;
      const margin = item.income > 0 ? (net / item.income) * 100 : 0;
      return {
        ...item,
        netProfit: net,
        profitMargin: parseFloat(margin.toFixed(1)),
        cumulativeNet: runningCum,
      };
    });
  }, [data.journalEntries, activeGranularity]);

  // Timeline Highlights (Peak & Averages in simple English)
  const timelineHighlights = useMemo(() => {
    if (timelineData.length === 0) return null;

    let peakIncome = timelineData[0];
    let peakExpense = timelineData[0];
    let bestNet = timelineData[0];
    let totalNet = 0;
    let nonZeroIncomePeriods = 0;
    let marginSum = 0;

    for (const point of timelineData) {
      if (point.income > peakIncome.income) peakIncome = point;
      if (point.expenses > peakExpense.expenses) peakExpense = point;
      if (point.netProfit > bestNet.netProfit) bestNet = point;
      totalNet += point.netProfit;
      if (point.income > 0) {
        nonZeroIncomePeriods++;
        marginSum += point.profitMargin;
      }
    }

    const avgNet = totalNet / timelineData.length;
    const avgMargin = nonZeroIncomePeriods > 0 ? marginSum / nonZeroIncomePeriods : 0;

    return {
      peakIncome,
      peakExpense,
      bestNet,
      avgNet,
      avgMargin: avgMargin.toFixed(1),
    };
  }, [timelineData]);

  // 3. Payment Methods Breakdown
  const paymentMethodsData = useMemo(() => {
    const entries = data.journalEntries || [];
    const incomeMap = new Map<string, { name: string; value: number; count: number }>();
    const expenseMap = new Map<string, { name: string; value: number; count: number }>();

    for (const entry of entries) {
      const method = (entry.paymentMethod || "Other").trim() || "Other";
      if (entry.type === "income") {
        const cur = incomeMap.get(method) || { name: method, value: 0, count: 0 };
        cur.value += entry.amount;
        cur.count += 1;
        incomeMap.set(method, cur);
      } else {
        const cur = expenseMap.get(method) || { name: method, value: 0, count: 0 };
        cur.value += entry.amount;
        cur.count += 1;
        expenseMap.set(method, cur);
      }
    }

    const incomeList = Array.from(incomeMap.values()).sort((a, b) => b.value - a.value);
    const expenseList = Array.from(expenseMap.values()).sort((a, b) => b.value - a.value);

    return {
      income: incomeList,
      expenses: expenseList,
    };
  }, [data.journalEntries]);

  // 4. Active Income dataset
  const activeIncomeList = useMemo(() => {
    const list =
      incomeDimension === "service"
        ? data.incomeByService || []
        : paymentMethodsData.income;
    const total = data.totalIncome || 1;

    return list.map((item) => ({
      ...item,
      percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : "0.0",
    }));
  }, [incomeDimension, data.incomeByService, paymentMethodsData.income, data.totalIncome]);

  // 5. Active Expense dataset
  const activeExpenseList = useMemo(() => {
    const list =
      expenseDimension === "category"
        ? data.expensesBreakdown || []
        : paymentMethodsData.expenses;
    const total = data.totalExpenses || 1;

    return list.map((item) => ({
      ...item,
      percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : "0.0",
    }));
  }, [expenseDimension, data.expensesBreakdown, paymentMethodsData.expenses, data.totalExpenses]);

  // 6. Client Concentration Analysis (in simple terms)
  const clientAnalysis = useMemo(() => {
    const validClients = [...clients]
      .filter((c) => c.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue);

    const totalRev = data.totalIncome || 1;
    const top5 = validClients.slice(0, 5).map((c) => ({
      name: c.name || "Unknown",
      company: c.company || "",
      revenue: c.revenue,
      percentage: ((c.revenue / totalRev) * 100).toFixed(1),
    }));

    const top1Share = top5.length > 0 ? parseFloat(top5[0].percentage) : 0;
    const top5Sum = top5.reduce((sum, c) => sum + c.revenue, 0);
    const top5Share = parseFloat(((top5Sum / totalRev) * 100).toFixed(1));

    const activeCount = validClients.length;
    const avgRevenuePerClient = activeCount > 0 ? data.totalIncome / activeCount : 0;

    let riskLevel: "low" | "medium" | "high" = "low";
    let riskMessage = "Healthy client balance";

    if (top1Share >= 50) {
      riskLevel = "high";
      riskMessage = `One client brings in ${top1Share}% of all your income.`;
    } else if (top5Share >= 75 && validClients.length > 5) {
      riskLevel = "medium";
      riskMessage = `Your top 5 clients account for ${top5Share}% of all sales.`;
    }

    return {
      topClients: top5,
      activeCount,
      top1Share,
      top5Share,
      avgRevenuePerClient,
      riskLevel,
      riskMessage,
    };
  }, [clients, data.totalIncome]);

  // 7. Future Predictions & Financial Forecast
  const predictions = useMemo(() => {
    const monthlyList = timelineData.filter((d) => d.income > 0 || d.expenses > 0);
    const recent = monthlyList.slice(-3);

    let baseMonthlyIncome = 0;
    let baseMonthlyExpense = 0;

    if (recent.length > 0) {
      baseMonthlyIncome = recent.reduce((sum, d) => sum + d.income, 0) / recent.length;
      baseMonthlyExpense = recent.reduce((sum, d) => sum + d.expenses, 0) / recent.length;
    } else {
      baseMonthlyIncome = data.totalIncome || 0;
      baseMonthlyExpense = data.totalExpenses || 0;
    }

    // Estimate realistic conservative growth trend
    let growthRate = 0;
    if (recent.length >= 2) {
      const prev = recent[recent.length - 2].income;
      const curr = recent[recent.length - 1].income;
      if (prev > 0) {
        growthRate = (curr - prev) / prev;
        growthRate = Math.max(-0.25, Math.min(0.25, growthRate));
      }
    }

    // Basic prediction method based on recent monthly average & realistic growth
    const projectedNextIncome = Math.round(baseMonthlyIncome * (1 + growthRate * 0.5));
    const projectedNextExpense = Math.round(baseMonthlyExpense);
    const projectedNextProfit = projectedNextIncome - projectedNextExpense;

    // Total Liquid Cash in company accounts
    const totalLiquidCash = (accounts || [])
      .filter((a) => a.isCompanyAccount !== false)
      .reduce((sum, a) => sum + (a.currentBalance > 0 ? a.currentBalance : 0), 0);

    let runwayMonths: number | null = null;
    if (baseMonthlyExpense > 0 && totalLiquidCash > 0) {
      runwayMonths = parseFloat((totalLiquidCash / baseMonthlyExpense).toFixed(1));
    }

    // Annual Run-Rate (Forward 12 months)
    const annualRunRate = projectedNextIncome * 12;

    let baseDate = new Date();
    if (recent.length > 0 && recent[recent.length - 1].timestamp) {
      baseDate = new Date(recent[recent.length - 1].timestamp);
    }

    const firstFutureDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1);
    const forecastPeriod = firstFutureDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });

    // Forward Forecast Timeline with visible small natural variations
    const forecastChartData: Array<{
      name: string;
      income: number;
      expenses: number;
      isForecast: boolean;
    }> = [];

    // Small, realistic month-to-month variations for a small business (+/- 3% to 7%)
    const smallIncomeVariations = [1.0, 1.05, 1.11, 1.08, 1.15, 1.21];
    const smallExpenseVariations = [1.0, 1.03, 0.98, 1.05, 1.02, 1.06];

    for (let i = 1; i <= 6; i++) {
      const fDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
      const label = fDate.toLocaleDateString("en-US", { month: "short" }) + " " + String(fDate.getFullYear()).slice(-2);

      const incMultiplier = smallIncomeVariations[i - 1];
      const expMultiplier = smallExpenseVariations[i - 1];

      const monthIncome = Math.round(projectedNextIncome * incMultiplier);
      const monthExpense = Math.round(projectedNextExpense * expMultiplier);

      forecastChartData.push({
        name: label,
        income: monthIncome,
        expenses: monthExpense,
        isForecast: true,
      });
    }

    return {
      projectedNextIncome,
      projectedNextExpense,
      projectedNextProfit,
      totalLiquidCash,
      runwayMonths,
      annualRunRate,
      forecastChartData,
      forecastPeriod,
    };
  }, [timelineData, data.totalIncome, data.totalExpenses, accounts]);

  return (
    <div className="space-y-6">
      {/* ── HERO CHART: Money Over Time ── */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 transition-all shadow-xl">
        {/* Chart Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Money Over Time
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            {/* View Mode Buttons (Simple English) */}
            <div className="flex items-center bg-black/40 border border-white/10 p-1 rounded-2xl">
              <button
                onClick={() => setHeroView("cashflow")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  heroView === "cashflow"
                    ? "bg-white text-black font-semibold shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Money In vs Out</span>
              </button>
              <button
                onClick={() => setHeroView("net_margin")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  heroView === "net_margin"
                    ? "bg-white text-black font-semibold shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Profit & Margin</span>
              </button>
              <button
                onClick={() => setHeroView("cumulative")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  heroView === "cumulative"
                    ? "bg-white text-black font-semibold shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Total Savings</span>
              </button>
            </div>

            {/* Granularity Selector */}
            <div className="flex items-center bg-black/40 border border-white/10 p-1 rounded-2xl">
              {(["auto", "monthly", "weekly", "daily"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGranularity(g)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-medium capitalize transition-all ${
                    granularity === g
                      ? "bg-brand-500 text-white font-semibold shadow-sm"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {g === "auto" ? `Auto (${activeGranularity === "monthly" ? "Month" : activeGranularity === "weekly" ? "Week" : "Day"})` : g === "monthly" ? "Month" : g === "weekly" ? "Week" : "Day"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chart Container */}
        {timelineData.length === 0 ? (
          <div className="h-[360px] flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/10 rounded-2xl">
            <div className="p-4 bg-white/5 rounded-2xl text-gray-500 mb-3">
              <Activity className="w-8 h-8" />
            </div>
            <p className="text-base font-semibold text-gray-300">No Records Found for this Date Range</p>
            <p className="text-xs text-gray-500 max-w-sm mt-1">
              No transactions were found between {startDate} and {endDate}. Try changing the date filter at the top to &ldquo;Lifetime&rdquo; or &ldquo;This Year&rdquo;.
            </p>
          </div>
        ) : (
          <div className="h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {heroView === "cashflow" ? (
                <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#9ca3af"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    dy={8}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `LKR ${val >= 1000000 ? (val / 1000000).toFixed(1) + "M" : val / 1000 + "k"}`}
                  />
                  <Tooltip
                    cursor={{ stroke: "rgba(255,255,255,0.15)", strokeWidth: 1 }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-neutral-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl min-w-[210px] text-xs space-y-2">
                          <p className="font-bold text-white text-sm border-b border-white/10 pb-1.5">{label}</p>
                          <div className="flex justify-between items-center text-green-400">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-green-400" />
                              Money In (Income)
                            </span>
                            <span className="font-semibold">{formatLKR(d.income)}</span>
                          </div>
                          <div className="flex justify-between items-center text-red-400">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-red-400" />
                              Money Out (Expenses)
                            </span>
                            <span className="font-semibold">{formatLKR(d.expenses)}</span>
                          </div>
                          <div className="flex justify-between items-center pt-1.5 border-t border-white/10 text-white font-bold">
                            <span>Profit Left Over</span>
                            <span className={d.netProfit >= 0 ? "text-green-400" : "text-red-400"}>
                              {d.netProfit >= 0 ? "+" : ""}{formatLKR(d.netProfit)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-gray-400 text-[10px]">
                            <span>Profit Margin (% Kept)</span>
                            <span className="font-medium text-gray-300">{d.profitMargin}%</span>
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
                    fill="url(#incomeGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    name="Expenses"
                    stroke="#f43f5e"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#expenseGrad)"
                  />
                </AreaChart>
              ) : heroView === "net_margin" ? (
                <ComposedChart data={timelineData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#9ca3af"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    dy={8}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="#9ca3af"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `LKR ${val >= 1000000 ? (val / 1000000).toFixed(1) + "M" : val / 1000 + "k"}`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#29B6F6"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <ReferenceLine yAxisId="left" y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-neutral-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl min-w-[210px] text-xs space-y-2">
                          <p className="font-bold text-white text-sm border-b border-white/10 pb-1.5">{label}</p>
                          <div className="flex justify-between items-center text-white">
                            <span>Profit (What&apos;s Left)</span>
                            <span className={`font-bold ${d.netProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
                              {d.netProfit >= 0 ? "+" : ""}{formatLKR(d.netProfit)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-brand-400">
                            <span>Profit Margin (% Kept)</span>
                            <span className="font-semibold">{d.profitMargin}%</span>
                          </div>
                          <div className="flex justify-between items-center pt-1 border-t border-white/10 text-gray-400 text-[10px]">
                            <span>Income: {formatLKR(d.income)}</span>
                            <span>Spent: {formatLKR(d.expenses)}</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="netProfit"
                    name="Net Profit"
                    radius={[6, 6, 0, 0]}
                    barSize={24}
                  >
                    {timelineData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.netProfit >= 0 ? "#22c55e" : "#ef4444"}
                      />
                    ))}
                  </Bar>
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="profitMargin"
                    name="Profit Margin %"
                    stroke="#29B6F6"
                    strokeWidth={2.5}
                    dot={{ fill: "#29B6F6", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </ComposedChart>
              ) : (
                <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#29B6F6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#29B6F6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#9ca3af"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    dy={8}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `LKR ${val >= 1000000 ? (val / 1000000).toFixed(1) + "M" : val / 1000 + "k"}`}
                  />
                  <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                  <Tooltip
                    cursor={{ stroke: "rgba(255,255,255,0.15)", strokeWidth: 1 }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-neutral-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl min-w-[210px] text-xs space-y-2">
                          <p className="font-bold text-white text-sm border-b border-white/10 pb-1.5">{label}</p>
                          <div className="flex justify-between items-center text-brand-400">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-brand-400" />
                              Total Savings
                            </span>
                            <span className="font-bold text-sm">{formatLKR(d.cumulativeNet)}</span>
                          </div>
                          <div className="flex justify-between items-center pt-1 border-t border-white/10 text-gray-400 text-[10px]">
                            <span>Period Profit: {formatLKR(d.netProfit)}</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulativeNet"
                    name="Total Savings"
                    stroke="#29B6F6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#cumGrad)"
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        )}

        {/* Highlight Insights Footer in Simple English */}
        {timelineHighlights && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-5 border-t border-white/10">
            <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-medium">Best Income Period</span>
              <p className="text-sm font-bold text-green-400 mt-1">{formatLKR(timelineHighlights.peakIncome.income)}</p>
              <span className="text-[11px] text-gray-400 block mt-0.5">{timelineHighlights.peakIncome.label}</span>
            </div>

            <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-medium">Highest Spending Period</span>
              <p className="text-sm font-bold text-red-400 mt-1">{formatLKR(timelineHighlights.peakExpense.expenses)}</p>
              <span className="text-[11px] text-gray-400 block mt-0.5">{timelineHighlights.peakExpense.label}</span>
            </div>

            <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-medium">Most Profitable Period</span>
              <p className="text-sm font-bold text-brand-400 mt-1">+{formatLKR(timelineHighlights.bestNet.netProfit)}</p>
              <span className="text-[11px] text-gray-400 block mt-0.5">{timelineHighlights.bestNet.label}</span>
            </div>

            <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-medium">Average Profit Margin</span>
              <p className="text-sm font-bold text-white mt-1">{timelineHighlights.avgMargin}%</p>
              <span className="text-[11px] text-gray-400 block mt-0.5">
                {parseFloat(timelineHighlights.avgMargin) >= 40 ? "Great profit rate" : "Normal profit rate"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── DUAL COMPOSITION: Income Sources vs Expense Categories (Donut visualizer) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Where Money Came From */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 transition-all shadow-xl flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Income</h3>
              </div>

              {/* Dimension Switcher */}
              <div className="flex items-center bg-black/40 border border-white/10 p-1 rounded-2xl self-start sm:self-auto">
                <button
                  onClick={() => setIncomeDimension("service")}
                  className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${
                    incomeDimension === "service"
                      ? "bg-white text-black font-semibold shadow-sm"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  By Service
                </button>
                <button
                  onClick={() => setIncomeDimension("payment_method")}
                  className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${
                    incomeDimension === "payment_method"
                      ? "bg-white text-black font-semibold shadow-sm"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  By Payment Method
                </button>
              </div>
            </div>

            {/* Income Donut & Legend */}
            {activeIncomeList.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-gray-500 text-xs">
                No income recorded for this period.
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
                {/* Donut Container */}
                <div className="relative h-[220px] w-[220px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={activeIncomeList}
                        cx="50%"
                        cy="50%"
                        innerRadius={68}
                        outerRadius={96}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                        onMouseEnter={(_, index) => setHoveredIncomeIndex(index)}
                        onMouseLeave={() => setHoveredIncomeIndex(null)}
                      >
                        {activeIncomeList.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={INCOME_PALETTE[index % INCOME_PALETTE.length]}
                            className="transition-transform duration-200 cursor-pointer"
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(10,10,15,0.95)",
                          borderColor: "rgba(255,255,255,0.1)",
                          borderRadius: "16px",
                          fontSize: "12px",
                        }}
                        itemStyle={{ color: "#fff" }}
                        formatter={(val: any) => [formatLKR(val), "Income"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                    {hoveredIncomeIndex !== null && activeIncomeList[hoveredIncomeIndex] ? (
                      <>
                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider truncate max-w-[120px]">
                          {activeIncomeList[hoveredIncomeIndex].name}
                        </span>
                        <span className="text-sm font-bold text-white mt-0.5">
                          {formatLKR(activeIncomeList[hoveredIncomeIndex].value)}
                        </span>
                        <span className="text-[10px] text-green-400 font-semibold">
                          {activeIncomeList[hoveredIncomeIndex].percentage}% of income
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Total Income</span>
                        <span className="text-sm font-bold text-white mt-0.5">
                          {formatLKR(data.totalIncome)}
                        </span>
                        <span className="text-[10px] text-gray-400">100%</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Legend List */}
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 w-full flex-1">
                  {activeIncomeList.map((entry, index) => {
                    const color = INCOME_PALETTE[index % INCOME_PALETTE.length];
                    const isHovered = hoveredIncomeIndex === index;
                    return (
                      <div
                        key={index}
                        onMouseEnter={() => setHoveredIncomeIndex(index)}
                        onMouseLeave={() => setHoveredIncomeIndex(null)}
                        className={`flex items-center justify-between text-xs p-2 rounded-xl transition-all cursor-pointer ${
                          isHovered ? "bg-white/10" : "hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-gray-300 font-medium truncate">{entry.name}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-white font-semibold">{formatLKR(entry.value)}</span>
                          <span className="text-green-400 font-medium text-[11px] w-10 text-right">
                            {entry.percentage}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Expenses */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 transition-all shadow-xl flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Expenses</h3>
              </div>

              {/* Dimension Switcher */}
              <div className="flex items-center bg-black/40 border border-white/10 p-1 rounded-2xl self-start sm:self-auto">
                <button
                  onClick={() => setExpenseDimension("category")}
                  className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${
                    expenseDimension === "category"
                      ? "bg-white text-black font-semibold shadow-sm"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  By Category
                </button>
                <button
                  onClick={() => setExpenseDimension("payment_method")}
                  className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${
                    expenseDimension === "payment_method"
                      ? "bg-white text-black font-semibold shadow-sm"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  By Payment Method
                </button>
              </div>
            </div>

            {/* Expense Donut & Legend */}
            {activeExpenseList.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-gray-500 text-xs">
                No expenses recorded for this period.
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
                {/* Donut Container */}
                <div className="relative h-[220px] w-[220px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={activeExpenseList}
                        cx="50%"
                        cy="50%"
                        innerRadius={68}
                        outerRadius={96}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                        onMouseEnter={(_, index) => setHoveredExpenseIndex(index)}
                        onMouseLeave={() => setHoveredExpenseIndex(null)}
                      >
                        {activeExpenseList.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={EXPENSE_PALETTE[index % EXPENSE_PALETTE.length]}
                            className="transition-transform duration-200 cursor-pointer"
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(10,10,15,0.95)",
                          borderColor: "rgba(255,255,255,0.1)",
                          borderRadius: "16px",
                          fontSize: "12px",
                        }}
                        itemStyle={{ color: "#fff" }}
                        formatter={(val: any) => [formatLKR(val), "Expense"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                    {hoveredExpenseIndex !== null && activeExpenseList[hoveredExpenseIndex] ? (
                      <>
                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider truncate max-w-[120px]">
                          {activeExpenseList[hoveredExpenseIndex].name}
                        </span>
                        <span className="text-sm font-bold text-white mt-0.5">
                          {formatLKR(activeExpenseList[hoveredExpenseIndex].value)}
                        </span>
                        <span className="text-[10px] text-red-400 font-semibold">
                          {activeExpenseList[hoveredExpenseIndex].percentage}% of spend
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Total Spent</span>
                        <span className="text-sm font-bold text-white mt-0.5">
                          {formatLKR(data.totalExpenses)}
                        </span>
                        <span className="text-[10px] text-gray-400">100%</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Legend List */}
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 w-full flex-1">
                  {activeExpenseList.map((entry, index) => {
                    const color = EXPENSE_PALETTE[index % EXPENSE_PALETTE.length];
                    const isHovered = hoveredExpenseIndex === index;
                    return (
                      <div
                        key={index}
                        onMouseEnter={() => setHoveredExpenseIndex(index)}
                        onMouseLeave={() => setHoveredExpenseIndex(null)}
                        className={`flex items-center justify-between text-xs p-2 rounded-xl transition-all cursor-pointer ${
                          isHovered ? "bg-white/10" : "hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-gray-300 font-medium truncate">{entry.name}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-white font-semibold">{formatLKR(entry.value)}</span>
                          <span className="text-red-400 font-medium text-[11px] w-10 text-right">
                            {entry.percentage}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── TOP CLIENTS & MONEY HABITS (Simple English) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Clients & Sales Share */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 transition-all shadow-xl">
          <div className="mb-5">
            <h3 className="text-lg font-bold text-white">Top Clients & Sales Share</h3>
          </div>

          {clientAnalysis.topClients.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-gray-500 text-xs">
              No client sales recorded for this period.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Horizontal Ranked Bars */}
              <div className="space-y-2.5">
                {clientAnalysis.topClients.map((client, idx) => {
                  const pct = parseFloat(client.percentage);
                  return (
                    <div key={idx} className="bg-white/5 p-3 rounded-2xl border border-white/5 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-5 h-5 rounded-full bg-brand-500/10 text-brand-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                            #{idx + 1}
                          </span>
                          <span className="text-white font-medium truncate">{client.name}</span>
                          {client.company && (
                            <span className="text-gray-400 text-[10px] truncate max-w-[100px]">({client.company})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-white font-bold">{formatLKR(client.revenue)}</span>
                          <span className="text-brand-400 font-semibold text-[11px] bg-brand-500/10 px-2 py-0.5 rounded-full">
                            {client.percentage}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-brand-500 to-sky-400 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Simple Concentration Stats */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Top 5 Clients Share</span>
                  <p className="text-base font-bold text-white mt-0.5">{clientAnalysis.top5Share}%</p>
                </div>
                <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Average Sale per Client</span>
                  <p className="text-base font-bold text-brand-400 mt-0.5">
                    {formatLKR(clientAnalysis.avgRevenuePerClient)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Future Predictions */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 transition-all shadow-xl flex flex-col justify-between">
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-white">Future Predictions</h3>
            </div>

            {/* Forecast Chart - Smooth Area Wave Chart (Same as Money In vs Out) */}
            <div className="h-[250px] w-full bg-white/5 p-3 rounded-2xl border border-white/5 flex flex-col mb-4">
              <div className="flex items-center justify-end gap-3 text-[11px] mb-2 px-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-1 rounded-full bg-green-500 inline-block" />
                  <span className="text-gray-400 font-medium">Income</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-1 rounded-full bg-rose-500 inline-block" />
                  <span className="text-gray-400 font-medium">Expenses</span>
                </div>
              </div>
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={predictions.forecastChartData} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="futureIncomeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="futureExpenseGrad" x1="0" y1="0" x2="0" y2="1">
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
                            <p className="font-bold text-white text-sm border-b border-white/10 pb-1">{label}</p>
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
                      fill="url(#futureIncomeGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      name="Expenses"
                      stroke="#f43f5e"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#futureExpenseGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 3 Prediction Metric Boxes */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium truncate">
                    Expected Income
                  </span>
                  <span className="text-[10px] text-brand-400 font-semibold shrink-0">
                    {predictions.forecastPeriod}
                  </span>
                </div>
                <p className="text-base font-bold text-green-400 mt-0.5">
                  {formatLKR(predictions.projectedNextIncome)}
                </p>
              </div>

              <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium truncate">
                    Expected Expenses
                  </span>
                  <span className="text-[10px] text-brand-400 font-semibold shrink-0">
                    {predictions.forecastPeriod}
                  </span>
                </div>
                <p className="text-base font-bold text-red-400 mt-0.5">
                  {formatLKR(predictions.projectedNextExpense)}
                </p>
              </div>

              <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium truncate">
                    Expected Profit
                  </span>
                  <span className="text-[10px] text-brand-400 font-semibold shrink-0">
                    {predictions.forecastPeriod}
                  </span>
                </div>
                <p className={`text-base font-bold mt-0.5 ${predictions.projectedNextProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {predictions.projectedNextProfit >= 0 ? "+" : ""}{formatLKR(predictions.projectedNextProfit)}
                </p>
              </div>
            </div>

            {/* Long-term Indicators (Runway & Annual Run-Rate) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-medium">
                  Money Will Last
                </span>
                <p className="text-base font-bold text-brand-400 mt-0.5">
                  {predictions.runwayMonths !== null ? `${predictions.runwayMonths} Months` : "Stable"}
                </p>
              </div>

              <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-medium">
                  Expected Yearly Sales
                </span>
                <p className="text-base font-bold text-white mt-0.5">
                  {formatLKR(predictions.annualRunRate)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
