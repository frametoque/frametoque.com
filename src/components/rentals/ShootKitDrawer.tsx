"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  Calendar, 
  MessageCircle, 
  Camera, 
  Sparkles,
  ArrowRight,
  FileText
} from "lucide-react";
import { useRentalKit } from "@/context/RentalKitContext";

const formatLKR = (amount: number) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(amount || 0);

export default function ShootKitDrawer() {
  const {
    items,
    itemCount,
    dailySubtotal,
    removeFromKit,
    updateQuantity,
    clearKit,
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    totalDays,
    estimatedTotal,
    isOpen,
    openKit,
    closeKit,
  } = useRentalKit();

  // Prevent background scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const todayStr = new Date().toISOString().split("T")[0];

  // WhatsApp Pre-filled message builder for multi-item Shoot Bag
  const buildWhatsAppKitUrl = () => {
    const phone = "94702771361";
    const isSingleDay = startDate === endDate || !endDate;
    const dateStr = isSingleDay ? startDate : `${startDate} to ${endDate}`;

    const manifestLines = items.map((item, idx) => {
      const lineTotal = item.daily_rate * item.quantity;
      return `${idx + 1}. *${item.item_name}* (Qty: ${item.quantity}) - ${formatLKR(item.daily_rate)}/day (${formatLKR(lineTotal)}/day total)`;
    });

    const text = 
`Hi Frametoque Team,

I'd like to check availability and reserve the following *Shoot Bag*:

📅 *Shoot Date(s):* ${dateStr} (${totalDays} day${totalDays > 1 ? "s" : ""})

📦 *Equipment Manifest:*
${manifestLines.join("\n")}

💰 *Daily Subtotal:* ${formatLKR(dailySubtotal)} / day
💵 *Estimated Total:* ${formatLKR(estimatedTotal)} (${totalDays} day${totalDays > 1 ? "s" : ""})

Could you please confirm equipment availability for these dates and send over the reservation details? Thank you!`;

    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  };

  return (
    <>
      {/* Floating Shoot Bag Button (shows when items are in kit and drawer is closed) */}
      <AnimatePresence>
        {!isOpen && itemCount > 0 && (
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 20, stiffness: 200 }}
            className="fixed bottom-6 right-6 z-40"
          >
            <button
              type="button"
              onClick={openKit}
              className="flex items-center gap-3 pl-4 pr-5 py-3.5 rounded-full bg-slate-900 hover:bg-brand-600 text-white shadow-2xl border border-white/15 transition-all cursor-pointer active:scale-95 group"
            >
              <div className="w-7 h-7 rounded-full bg-brand-500 group-hover:bg-white group-hover:text-brand-600 text-white flex items-center justify-center font-black text-xs transition-colors">
                {itemCount}
              </div>
              <div className="text-left">
                <span className="text-xs font-bold block leading-none">View Shoot Bag</span>
                <span className="text-[10px] text-slate-300 group-hover:text-brand-100 font-medium">
                  {formatLKR(dailySubtotal)}/day
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-white group-hover:translate-x-0.5 transition-all ml-1" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
        <div className="fixed inset-0 z-[150] overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeKit}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          {/* Drawer Container */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="w-screen max-w-md bg-white shadow-2xl flex flex-col"
            >
              {/* Drawer Header */}
              <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">Your Shoot Bag</h2>
                  <span className="px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 text-[11px] sm:text-xs font-bold">
                    {itemCount} {itemCount === 1 ? "item" : "items"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={closeKit}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
                  aria-label="Close bag"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
                {items.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-4">
                    <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center">
                      <Camera className="w-8 h-8" />
                    </div>
                    <div className="space-y-1.5 max-w-xs">
                      <h3 className="text-base font-bold text-slate-900">Your Shoot Bag is empty</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Explore our gear catalog and add cameras, lenses, lighting, and mounts to bundle them into a single reservation.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={closeKit}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <span>Browse Equipment</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Shoot Dates Selector Card */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-brand-600" />
                          <span>Shoot Schedule</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-[11px] font-bold">
                          {totalDays} Shoot {totalDays === 1 ? "Day" : "Days"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                            Pickup / Start
                          </label>
                          <input
                            type="date"
                            min={todayStr}
                            value={startDate}
                            onChange={(e) => {
                              const val = e.target.value;
                              setStartDate(val);
                              if (val > endDate) setEndDate(val);
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:outline-none focus:border-brand-500 cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                            Return / End
                          </label>
                          <input
                            type="date"
                            min={startDate || todayStr}
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:outline-none focus:border-brand-500 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Manifest Item List */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Items in Bag
                        </span>
                        <button
                          type="button"
                          onClick={clearKit}
                          className="text-[11px] text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          Clear all
                        </button>
                      </div>

                      <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden bg-white">
                        {items.map((item) => (
                          <div key={item.id} className="p-3.5 flex items-center gap-3">
                            {/* Thumbnail */}
                            <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-100 relative shrink-0 overflow-hidden flex items-center justify-center">
                              {item.image_url ? (
                                <Image
                                  src={item.image_url}
                                  alt={item.item_name}
                                  fill
                                  sizes="56px"
                                  className="object-contain p-1"
                                />
                              ) : (
                                <Camera className="w-5 h-5 text-slate-300" />
                              )}
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0 space-y-0.5">
                              <span className="text-[10px] font-bold text-brand-600 uppercase tracking-wider block">
                                {item.category}
                              </span>
                              <Link
                                href={`/rentals/${item.slug}`}
                                onClick={closeKit}
                                className="text-xs font-bold text-slate-900 hover:text-brand-600 transition-colors line-clamp-1 block"
                              >
                                {item.item_name}
                              </Link>
                              <p className="text-xs font-extrabold text-slate-800">
                                {formatLKR(item.daily_rate)}{" "}
                                <span className="text-[10px] font-normal text-slate-500">/ day</span>
                              </p>
                            </div>

                            {/* Quantity Stepper */}
                            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden shrink-0">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="p-1 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="px-2 text-xs font-bold text-slate-800 min-w-[20px] text-center">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="p-1 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                                aria-label="Increase quantity"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => removeFromKit(item.id)}
                              className="p-1.5 text-slate-300 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                              aria-label="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Drawer Footer / Cost Summary & WhatsApp Action */}
              {items.length > 0 && (
                <div className="p-4 sm:p-6 border-t border-slate-200 bg-slate-50/80 space-y-3.5 sm:space-y-4">
                  {/* Summary Rows */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Daily Bag Subtotal</span>
                      <span className="font-semibold text-slate-900">{formatLKR(dailySubtotal)} / day</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Shoot Duration</span>
                      <span className="font-semibold text-slate-900">
                        {totalDays} {totalDays === 1 ? "day" : "days"}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex items-baseline justify-between">
                      <div>
                        <span className="text-sm font-extrabold text-slate-900 block">
                          Estimated Total
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Excludes refundable deposit
                        </span>
                      </div>
                      <span className="text-2xl font-black text-slate-900">
                        {formatLKR(estimatedTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Primary WhatsApp Action */}
                  <a
                    href={buildWhatsAppKitUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 shrink-0" />
                    <span>Reserve Shoot Bag via WhatsApp</span>
                  </a>

                  {/* Quotation & Manifest Page Link */}
                  <Link
                    href="/rentals/cart"
                    onClick={closeKit}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-800 font-bold text-xs shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-brand-600" />
                    <span>Generate Official Quotation PDF</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>

                  {/* Client Portal Link */}
                  <div className="pt-2 border-t border-slate-200/80 text-center">
                    <a
                      href="/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                    >
                      <span>Already a client? View invoices &amp; quotations in Client Portal</span>
                      <ArrowRight className="w-3 h-3 text-brand-600" />
                    </a>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  </>
  );
}
