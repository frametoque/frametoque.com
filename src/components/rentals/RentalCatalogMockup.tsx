"use client";

import { useState, useEffect } from "react";
import { Camera, Check, Sparkles, ShieldCheck, Calendar, ArrowRight } from "lucide-react";

export default function RentalCatalogMockup() {
  const [currentDate, setCurrentDate] = useState<string>("Sat, Nov 21, 2026");

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

  const gearItems = [
    {
      name: "Sony FX3 Cinema Line",
      category: "Camera",
      specs: "4K 120p • Full-Frame 10-bit 4:2:2",
      rate: "Rs. 14,000",
      status: "Available",
      badgeColor: "bg-red-500/20 text-red-400 border-red-500/30",
    },
    {
      name: "Sony FE 24-70mm f/2.8 GM II",
      category: "Lens",
      specs: "E-Mount • Fast G-Master Zoom",
      rate: "Rs. 6,500",
      status: "Available",
      badgeColor: "bg-sky-500/20 text-sky-400 border-sky-500/30",
    },
    {
      name: "Aputure 300d II Light Kit",
      category: "Lighting",
      specs: "55,000 lux @ 0.5m • Bowens Mount",
      rate: "Rs. 6,000",
      status: "Available",
      badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    },
    {
      name: "DJI RS 3 Pro Gimbal",
      category: "Gimbal",
      specs: "4.5kg Payload • Carbon Fiber Arms",
      rate: "Rs. 5,500",
      status: "Available",
      badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    },
  ];

  return (
    <div className="relative w-full max-w-2xl mx-auto select-none pt-4 pb-4 px-2 sm:pt-5 sm:pb-5 sm:px-4">
      {/* Floating Badge 1: Top-Left Instant Reservation */}
      <div className="absolute top-0 left-0 sm:top-1 sm:left-1 z-20 bg-slate-900/95 border border-red-500/40 rounded-2xl px-3.5 py-2 shadow-2xl backdrop-blur-md flex items-center gap-2.5 animate-bounce-subtle">
        <div className="w-6 h-6 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
        <div>
          <p className="text-[10px] text-slate-400 font-medium leading-none">Instant Booking</p>
          <p className="text-xs font-bold text-white leading-tight mt-0.5">Live Date Availability</p>
        </div>
      </div>

      {/* Floating Badge 2: Bottom-Right Ready for Shoot */}
      <div className="absolute bottom-0 right-0 sm:bottom-1 sm:right-1 z-20 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-2xl px-3.5 py-2 shadow-xl shadow-red-500/30 flex items-center gap-2 font-bold text-xs">
        <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
          <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wider font-semibold opacity-90 leading-none">Quality Check</p>
          <p className="text-xs font-black leading-tight mt-0.5">Shoot Tested & Ready</p>
        </div>
      </div>

      {/* Main Catalog Window (Dark Mode) */}
      <div className="relative bg-[#0c111a] border border-white/10 rounded-3xl p-4 sm:p-6 shadow-2xl shadow-red-950/40 overflow-hidden backdrop-blur-xl">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white text-sm sm:text-base tracking-tight">Frametoque Rentals</span>
            <span className="text-slate-500 text-xs">|</span>
            <span className="text-slate-400 text-xs sm:text-sm font-medium">Equipment Catalog</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-medium bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
              <Calendar className="w-3 h-3 text-red-400" />
              <span>{currentDate}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Desk Open</span>
            </div>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 pb-3 mb-3 overflow-x-auto no-scrollbar border-b border-white/5 text-[11px]">
          <span className="px-2.5 py-1 rounded-lg bg-red-600 text-white font-semibold">All (14)</span>
          <span className="px-2.5 py-1 rounded-lg bg-white/5 text-gray-400 hover:text-white">Cameras</span>
          <span className="px-2.5 py-1 rounded-lg bg-white/5 text-gray-400 hover:text-white">Lenses</span>
          <span className="px-2.5 py-1 rounded-lg bg-white/5 text-gray-400 hover:text-white">Lighting</span>
          <span className="px-2.5 py-1 rounded-lg bg-white/5 text-gray-400 hover:text-white">Audio &amp; Support</span>
        </div>

        {/* Gear Grid (4 Core Items) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {gearItems.map((item) => (
            <div
              key={item.name}
              className="group/card bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-red-500/30 rounded-2xl p-3 sm:p-3.5 transition-all duration-300"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${item.badgeColor}`}>
                  {item.category}
                </span>
                <span className="text-[11px] font-extrabold text-red-400 group-hover/card:text-red-300 transition-colors">
                  {item.rate}<span className="text-[9px] text-gray-500 font-normal">/day</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-white group-hover/card:text-red-400 transition-colors line-clamp-1">
                {item.name}
              </p>
              <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">
                {item.specs}
              </p>
              <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px]">
                <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {item.status}
                </span>
                <span className="text-gray-400 group-hover/card:text-white inline-flex items-center gap-0.5">
                  Book now <ArrowRight className="w-2.5 h-2.5 ml-0.5 group-hover/card:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Status Ribbon */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5 text-[11px] text-gray-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
            <span>Pickup at Studio Desk or Islandwide Delivery</span>
          </div>
          <span className="font-semibold text-white/90">Piliyandala, Colombo</span>
        </div>
      </div>
    </div>
  );
}
