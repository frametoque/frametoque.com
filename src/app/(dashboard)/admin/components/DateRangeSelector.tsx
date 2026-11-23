"use client";

import { useRef } from "react";
import { Calendar } from "lucide-react";

interface DateRangeSelectorProps {
  dateRange: string;
  startDate: string;
  endDate: string;
  onRangeChange: (range: string) => void;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

export default function DateRangeSelector({
  dateRange,
  startDate,
  endDate,
  onRangeChange,
  onStartDateChange,
  onEndDateChange,
}: DateRangeSelectorProps) {
  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);

  const handleRangeChange = (range: string) => {
    onRangeChange(range);
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const formatYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (range === "this month") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      onStartDateChange(formatYMD(firstDay));
      onEndDateChange(formatYMD(lastDay));
    } else if (range === "one month") {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      onStartDateChange(formatYMD(firstDay));
      onEndDateChange(formatYMD(lastDay));
    } else if (range === "this year") {
      onStartDateChange(`${today.getFullYear()}-01-01`);
      onEndDateChange(formatYMD(today));
    } else if (range === "6 months") {
      const d = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate());
      onStartDateChange(formatYMD(d));
      onEndDateChange(formatYMD(today));
    } else if (range === "three months") {
      const d = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
      onStartDateChange(formatYMD(d));
      onEndDateChange(formatYMD(today));
    } else if (range === "custom") {
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();
      let fyStartYear = currentYear;
      let fyEndYear = currentYear + 1;
      if (currentMonth < 3) {
        fyStartYear = currentYear - 1;
        fyEndYear = currentYear;
      }
      onStartDateChange(`${fyStartYear}-04-01`);
      onEndDateChange(`${fyEndYear}-03-31`);
    } else if (range === "lifetime") {
      onStartDateChange("1970-01-01");
      onEndDateChange("2099-12-31");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex items-center">
        <select
          value={dateRange}
          onChange={(e) => handleRangeChange(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl pl-4 pr-10 py-2 outline-none focus:border-brand-500 transition-colors appearance-none cursor-pointer text-sm font-medium text-white"
        >
          <option value="lifetime" className="bg-brand-900 text-white">Lifetime</option>
          <option value="this month" className="bg-brand-900 text-white">This Month</option>
          <option value="one month" className="bg-brand-900 text-white">Last Month</option>
          <option value="three months" className="bg-brand-900 text-white">Last 3 Months</option>
          <option value="6 months" className="bg-brand-900 text-white">Last 6 Months</option>
          <option value="this year" className="bg-brand-900 text-white">This Year</option>
          <option value="custom" className="bg-brand-900 text-white">Custom Range</option>
        </select>
        <span className="absolute right-4 pointer-events-none text-gray-400">
          <ChevronIcon />
        </span>
      </div>

      {dateRange === "custom" && (
        <div className="flex items-center gap-2.5 animate-in slide-in-from-left duration-200">
          {/* Start Date Button */}
          <div
            onClick={() => {
              try {
                startInputRef.current?.showPicker?.();
              } catch {
                startInputRef.current?.focus();
              }
            }}
            className="relative bg-white/5 border border-white/10 hover:border-white/20 active:bg-white/10 rounded-xl px-4 py-2 text-sm text-white flex items-center gap-2 transition-all cursor-pointer shadow-sm select-none"
          >
            <Calendar className="w-4 h-4 text-brand-400 shrink-0 pointer-events-none" />
            <span className="font-medium pointer-events-none">{formatDateFriendly(startDate)}</span>
            <input
              ref={startInputRef}
              type="date"
              value={startDate || ""}
              onChange={(e) => {
                if (e.target.value) {
                  onStartDateChange(e.target.value);
                }
              }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10 [color-scheme:dark]"
              tabIndex={-1}
            />
          </div>

          <span className="text-gray-400 text-xs uppercase font-semibold select-none">to</span>

          {/* End Date Button */}
          <div
            onClick={() => {
              try {
                endInputRef.current?.showPicker?.();
              } catch {
                endInputRef.current?.focus();
              }
            }}
            className="relative bg-white/5 border border-white/10 hover:border-white/20 active:bg-white/10 rounded-xl px-4 py-2 text-sm text-white flex items-center gap-2 transition-all cursor-pointer shadow-sm select-none"
          >
            <Calendar className="w-4 h-4 text-brand-400 shrink-0 pointer-events-none" />
            <span className="font-medium pointer-events-none">{formatDateFriendly(endDate)}</span>
            <input
              ref={endInputRef}
              type="date"
              value={endDate || ""}
              onChange={(e) => {
                if (e.target.value) {
                  onEndDateChange(e.target.value);
                }
              }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10 [color-scheme:dark]"
              tabIndex={-1}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function formatDateFriendly(dateStr: string) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${monthNames[monthIdx]} ${day}, ${year}`;
}

function ChevronIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
