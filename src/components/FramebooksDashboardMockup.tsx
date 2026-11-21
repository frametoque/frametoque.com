"use client";

import { useState, useEffect } from "react";
import { Check, TrendingUp, ArrowUpRight, ArrowDownLeft, User } from "lucide-react";

export default function FramebooksDashboardMockup() {
  const [currentDate, setCurrentDate] = useState<string>("Thu, Oct 8, 2026");

  useEffect(() => {
    setCurrentDate(
      new Date().toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    );
  }, []);

  const barData = [
    { month: "May", income: 55, expense: 25 },
    { month: "Jun", income: 75, expense: 38 },
    { month: "Jul", income: 50, expense: 30 },
    { month: "Aug", income: 88, expense: 40 },
    { month: "Sep", income: 68, expense: 32 },
    { month: "Oct", income: 82, expense: 36 },
  ];

  return (
    <div className="relative w-full max-w-2xl mx-auto select-none pt-4 pb-4 px-2 sm:pt-5 sm:pb-5 sm:px-4">
      {/* Floating Badge 1: Top-Left Paid Invoice */}
      <div className="absolute top-0 left-0 sm:top-1 sm:left-1 z-20 bg-slate-900/95 border border-emerald-500/40 rounded-2xl px-3.5 py-2 shadow-2xl backdrop-blur-md flex items-center gap-2.5 animate-bounce-subtle">
        <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
          <Check className="w-3.5 h-3.5 stroke-[3]" />
        </div>
        <div>
          <p className="text-[10px] text-slate-400 font-medium leading-none">Invoice #1042</p>
          <p className="text-xs font-bold text-white leading-tight mt-0.5">Paid in full</p>
        </div>
      </div>

      {/* Floating Badge 2: Bottom-Right Net Profit */}
      <div className="absolute bottom-0 right-0 sm:bottom-1 sm:right-1 z-20 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 rounded-2xl px-3.5 py-2 shadow-xl shadow-emerald-500/30 flex items-center gap-2 font-bold text-xs">
        <div className="w-5 h-5 rounded-full bg-slate-950/20 flex items-center justify-center">
          <TrendingUp className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wider font-semibold opacity-80 leading-none">Net Profit</p>
          <p className="text-xs font-black leading-tight mt-0.5">+124.5%</p>
        </div>
      </div>

      {/* Main Dashboard Window (Dark Mode) */}
      <div className="relative bg-[#0c111a] border border-white/10 rounded-3xl p-4 sm:p-6 shadow-2xl shadow-emerald-950/40 overflow-hidden backdrop-blur-xl">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white text-sm sm:text-base tracking-tight">Framebooks</span>
            <span className="text-slate-500 text-xs">|</span>
            <span className="text-slate-400 text-xs sm:text-sm font-medium">Dashboard</span>
          </div>

          <div className="flex items-center gap-3">
            <span suppressHydrationWarning className="text-[11px] sm:text-xs font-medium text-slate-400">{currentDate}</span>
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <User className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* 4 Metrics Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-4">
          {/* Card 1 */}
          <div className="bg-[#141b27] border border-white/5 rounded-2xl p-3">
            <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate mb-1">Available Funds</p>
            <p className="text-sm sm:text-base font-black text-white tracking-tight">7.145M <span className="text-[10px] text-slate-400 font-normal">LKR</span></p>
          </div>

          {/* Card 2 */}
          <div className="bg-[#141b27] border border-white/5 rounded-2xl p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">Total Income</p>
              <div className="w-4 h-4 rounded-md bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <ArrowDownLeft className="w-2.5 h-2.5" />
              </div>
            </div>
            <p className="text-sm sm:text-base font-black text-white tracking-tight">6.055M <span className="text-[10px] text-slate-400 font-normal">LKR</span></p>
          </div>

          {/* Card 3 */}
          <div className="bg-[#141b27] border border-white/5 rounded-2xl p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">Total Expenses</p>
              <div className="w-4 h-4 rounded-md bg-rose-500/20 flex items-center justify-center text-rose-400">
                <ArrowUpRight className="w-2.5 h-2.5" />
              </div>
            </div>
            <p className="text-sm sm:text-base font-black text-white tracking-tight">984.7K <span className="text-[10px] text-slate-400 font-normal">LKR</span></p>
          </div>

          {/* Card 4 */}
          <div className="bg-[#141b27] border border-white/5 rounded-2xl p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">Net Profit</p>
              <div className="w-4 h-4 rounded-md bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <TrendingUp className="w-2.5 h-2.5" />
              </div>
            </div>
            <p className="text-sm sm:text-base font-black text-emerald-400 tracking-tight">5.07M <span className="text-[10px] text-emerald-400/70 font-normal">LKR</span></p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Left Chart: Income vs Expenses */}
          <div className="sm:col-span-7 bg-[#141b27] border border-white/5 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-xs font-bold text-white">Income vs Expenses</h4>
              </div>
              <div className="flex items-center gap-2.5 text-[10px]">
                <div className="flex items-center gap-1 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Income</span>
                </div>
                <div className="flex items-center gap-1 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span>Expenses</span>
                </div>
              </div>
            </div>

            {/* Bar Chart Area */}
            <div className="relative pt-4 pb-1">
              {/* Grid Lines */}
              <div className="absolute inset-x-0 top-0 flex flex-col justify-between h-24 pointer-events-none opacity-20">
                <div className="border-b border-dashed border-white text-[8px] text-right text-slate-500 pr-1">1.8M</div>
                <div className="border-b border-dashed border-white text-[8px] text-right text-slate-500 pr-1">1.2M</div>
                <div className="border-b border-dashed border-white text-[8px] text-right text-slate-500 pr-1">600K</div>
              </div>

              {/* Bars */}
              <div className="h-24 flex items-end justify-between gap-2 px-1 relative z-10">
                {barData.map((d) => (
                  <div key={d.month} className="flex-1 flex flex-col items-center">
                    <div className="w-full flex items-end justify-center gap-1 h-20">
                      {/* Income Bar (Green) */}
                      <div
                        style={{ height: `${d.income}%` }}
                        className="w-2 sm:w-2.5 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-sm transition-all duration-500"
                        title={`Income: ${d.income}%`}
                      />
                      {/* Expense Bar (Red) */}
                      <div
                        style={{ height: `${d.expense}%` }}
                        className="w-2 sm:w-2.5 bg-gradient-to-t from-rose-600 to-rose-400 rounded-t-sm transition-all duration-500"
                        title={`Expense: ${d.expense}%`}
                      />
                    </div>
                    <span className="text-[9px] font-medium text-slate-400 mt-1">{d.month}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Chart: Expense Breakdown */}
          <div className="sm:col-span-5 bg-[#141b27] border border-white/5 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-white">Expense Breakdown</h4>
              <span className="text-[10px] font-medium text-slate-400">Oct 2026</span>
            </div>

            {/* Donut Chart with SVG */}
            <div className="relative flex items-center justify-center my-2">
              <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="36"
                  fill="transparent"
                  stroke="#1e293b"
                  strokeWidth="11"
                />
                {/* Payroll: 52% (Green) */}
                <circle
                  cx="50"
                  cy="50"
                  r="36"
                  fill="transparent"
                  stroke="#10b981"
                  strokeWidth="11"
                  strokeDasharray="117.6 226.2"
                  strokeDashoffset="0"
                />
                {/* SaaS: 28% (Dark Cyan / Indigo) */}
                <circle
                  cx="50"
                  cy="50"
                  r="36"
                  fill="transparent"
                  stroke="#0284c7"
                  strokeWidth="11"
                  strokeDasharray="63.3 226.2"
                  strokeDashoffset="-117.6"
                />
                {/* Ads: 20% (Amber) */}
                <circle
                  cx="50"
                  cy="50"
                  r="36"
                  fill="transparent"
                  stroke="#f59e0b"
                  strokeWidth="11"
                  strokeDasharray="45.3 226.2"
                  strokeDashoffset="-180.9"
                />
              </svg>

              {/* Center Donut Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">Total</span>
                <span className="text-xs font-extrabold text-white tracking-tight">985K</span>
              </div>
            </div>

            {/* Donut Legend */}
            <div className="grid grid-cols-3 gap-1 pt-2 border-t border-white/5 text-[9px] text-center">
              <div>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1" />
                <span className="text-slate-400">Payroll</span>
                <p className="font-bold text-white">52%</p>
              </div>
              <div>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-500 mr-1" />
                <span className="text-slate-400">SaaS</span>
                <p className="font-bold text-white">28%</p>
              </div>
              <div>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 mr-1" />
                <span className="text-slate-400">Ads</span>
                <p className="font-bold text-white">20%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
