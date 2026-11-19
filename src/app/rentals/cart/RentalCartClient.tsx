"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trash2, 
  Plus, 
  Minus, 
  FileText, 
  Download, 
  MessageCircle, 
  Camera, 
  ArrowRight, 
  ExternalLink,
  AlertCircle,
  Loader2
} from "lucide-react";
import { useRentalKit } from "@/context/RentalKitContext";

const formatLKR = (amount: number) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(amount || 0);

export default function RentalCartClient() {
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
  } = useRentalKit();

  const todayStr = new Date().toISOString().split("T")[0];

  // Quotation form state
  const [quoteName, setQuoteName] = useState("");
  const [quoteEmail, setQuoteEmail] = useState("");
  const [quotePhone, setQuotePhone] = useState("");
  const [quotationSubmitting, setQuotationSubmitting] = useState(false);
  const [quotationSuccess, setQuotationSuccess] = useState(false);
  const [quotationError, setQuotationError] = useState("");
  const [generatedQuoteId, setGeneratedQuoteId] = useState<string | number | null>(null);

  // WhatsApp Kit Message Builder
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

I'd like to check availability and reserve the following *Bag*:

📅 *Shoot Date(s):* ${dateStr} (${totalDays} day${totalDays > 1 ? "s" : ""})

📦 *Equipment Manifest:*
${manifestLines.join("\n")}

💰 *Daily Subtotal:* ${formatLKR(dailySubtotal)} / day
💵 *Estimated Total:* ${formatLKR(estimatedTotal)} (${totalDays} day${totalDays > 1 ? "s" : ""})

Could you please confirm equipment availability for these dates and send over the reservation details? Thank you!`;

    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  };

  // ── Client-side Quotation Generation & PDF Download ────────────────────────
  const handleQuotationSubmit = async (e?: React.FormEvent, force = false) => {
    if (e) e.preventDefault();
    setQuotationError("");

    if (!quoteName.trim() || !quoteEmail.trim() || !quotePhone.trim()) {
      setQuotationError("Please fill in your Name, Email, and Phone/WhatsApp number.");
      return;
    }

    if (items.length === 0) {
      setQuotationError("Your Bag is empty. Please add items to request a quotation.");
      return;
    }

    setQuotationSubmitting(true);

    try {
      // Map Bag items to the cart items format expected by /api/quotation
      const dateLabel = startDate === endDate || !endDate ? startDate : `${startDate} to ${endDate}`;
      const mappedCartItems = items.map((item) => ({
        id: item.id,
        serviceId: item.slug,
        serviceTitle: `Rent | ${item.item_name}`,
        tier: `${item.category} (${totalDays} Shoot Day${totalDays > 1 ? "s" : ""}: ${dateLabel})`,
        duration: `${totalDays} Day${totalDays > 1 ? "s" : ""}`,
        quantity: item.quantity,
        price: item.daily_rate * totalDays,
        categorySlug: "rentals",
      }));

      // Build descriptive rental project name
      const rentalTitles = items.map((i) => i.item_name).filter(Boolean);
      const projectTitle =
        rentalTitles.length === 1
          ? `Equipment Rental - ${rentalTitles[0]}`
          : rentalTitles.length === 2
          ? `Equipment Rental - ${rentalTitles[0]} & ${rentalTitles[1]}`
          : rentalTitles.length > 2
          ? `Equipment Rental - ${rentalTitles[0]} (+${rentalTitles.length - 1} more items)`
          : "Equipment Rental - Bag";

      const res = await fetch("/api/quotation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteName: quoteName.trim(),
          quoteEmail: quoteEmail.trim(),
          quotePhone: quotePhone.trim(),
          projectName: projectTitle,
          cartItems: mappedCartItems,
          subtotalLKR: estimatedTotal,
          forceInsert: force,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit quotation request.");

      if (data.duplicate) {
        const confirmNew = window.confirm(data.message || "An identical quotation was recently generated. Would you like to generate a new one anyway?");
        if (confirmNew) {
          await handleQuotationSubmit(undefined, true);
          return;
        } else {
          setQuotationSubmitting(false);
          return;
        }
      }

      if (data.quotationId) {
        setGeneratedQuoteId(data.quotationId);
        try {
          const { getQuotationById } = await import("@/app/(dashboard)/admin/actions/actions");
          const q = await getQuotationById(data.quotationId.toString());
          if (q) {
            if (!q.client_name) q.client_name = quoteName.trim();
            if (!q.email) q.email = quoteEmail.trim();
            if (!q.phone) q.phone = quotePhone.trim();
            if (!q.description) q.description = projectTitle;

            const { generateQuotationPDF } = await import("@/app/(dashboard)/dashboard/quotation/QuotationDocument");
            const pdfBytes = await generateQuotationPDF(q);
            const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `QT-${String(q.id).padStart(4, "0")}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
          }
        } catch (pdfErr) {
          console.error("PDF generation failed:", pdfErr);
        }
      }

      setQuotationSuccess(true);
    } catch (err: any) {
      console.error("Quotation submission error:", err);
      setQuotationError(err.message || "Something went wrong while generating quotation. Please try again.");
    } finally {
      setQuotationSubmitting(false);
    }
  };

  // Re-download generated PDF
  const handleReDownload = async () => {
    if (!generatedQuoteId) return;
    try {
      setQuotationSubmitting(true);
      const { getQuotationById } = await import("@/app/(dashboard)/admin/actions/actions");
      const q = await getQuotationById(generatedQuoteId.toString());
      if (q) {
        if (!q.client_name) q.client_name = quoteName.trim();
        if (!q.email) q.email = quoteEmail.trim();
        if (!q.phone) q.phone = quotePhone.trim();
        if (!q.description) q.description = "Equipment Rental - Bag";

        const { generateQuotationPDF } = await import("@/app/(dashboard)/dashboard/quotation/QuotationDocument");
        const pdfBytes = await generateQuotationPDF(q);
        const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `QT-${String(q.id).padStart(4, "0")}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error("Re-download failed:", e);
    } finally {
      setQuotationSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
      {/* Top Client Portal Notification Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-6 sm:mb-8 p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div>
          <p className="text-xs sm:text-sm font-bold text-slate-900">
            Already have an active booking or quotation?
          </p>
          <p className="text-[11px] sm:text-xs text-slate-500">
            Sign in to your Client Portal to review and download all your invoices, official quotations, and rental agreements.
          </p>
        </div>
        <a
          href="/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-all shadow-xs shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <span>Client Login</span>
          <ExternalLink className="w-3.5 h-3.5 text-white/80" />
        </a>
      </motion.div>

      {/* Page Title */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8"
      >
        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Your Bag
        </h1>

        {itemCount > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
              {itemCount} {itemCount === 1 ? "Item" : "Items"} in Bag
            </span>
            <button
              type="button"
              onClick={clearKit}
              className="text-xs font-medium text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
            >
              Clear Bag
            </button>
          </div>
        )}
      </motion.div>

      {items.length === 0 ? (
        /* Empty State */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="py-16 sm:py-20 text-center max-w-md mx-auto space-y-4"
        >
          <div className="w-20 h-20 rounded-3xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Camera className="w-10 h-10" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900">Your Bag is empty</h2>
            <p className="text-sm text-slate-500">
              You haven&apos;t added any cinema cameras, lenses, or equipment to your bag yet.
            </p>
          </div>
          <Link
            href="/rentals"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-slate-900 hover:bg-brand-600 text-white font-semibold text-sm transition-colors shadow-sm cursor-pointer"
          >
            <span>Browse Equipment Catalog</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      ) : (
        /* Main Layout: 2 Columns (Manifest on Left, Quotation & Booking on Right) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Schedule + Equipment Manifest */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.12 }}
            className="lg:col-span-7 space-y-6"
          >
            {/* Shoot Dates Selector */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Shoot Schedule &amp; Duration</h3>
                <span className="px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-bold">
                  {totalDays} Shoot {totalDays === 1 ? "Day" : "Days"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Pickup Date
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
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium focus:outline-none focus:border-brand-500 focus:bg-white transition-colors cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Return Date
                  </label>
                  <input
                    type="date"
                    min={startDate || todayStr}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium focus:outline-none focus:border-brand-500 focus:bg-white transition-colors cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Equipment Items List */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
                Items in Bag ({itemCount} {itemCount === 1 ? "item" : "items"})
              </h3>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                <AnimatePresence initial={false}>
                  {items.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 overflow-hidden"
                    >
                      {/* Item Thumbnail */}
                      <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-100 relative shrink-0 overflow-hidden flex items-center justify-center">
                        {item.image_url ? (
                          <Image
                            src={item.image_url}
                            alt={item.item_name}
                            fill
                            sizes="64px"
                            className="object-contain p-1"
                          />
                        ) : (
                          <Camera className="w-6 h-6 text-slate-300" />
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold text-brand-600 uppercase tracking-wider block">
                          {item.category}
                        </span>
                        <Link
                          href={`/rentals/${item.slug}`}
                          className="text-sm font-bold text-slate-900 hover:text-brand-600 transition-colors line-clamp-1"
                        >
                          {item.item_name}
                        </Link>
                        <p className="text-xs font-semibold text-slate-700 mt-0.5">
                          {formatLKR(item.daily_rate)} <span className="text-slate-400 font-normal">/ day</span>
                        </p>
                      </div>

                      {/* Quantity & Actions */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        {/* Quantity Stepper */}
                        <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1.5 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-3 text-xs font-bold text-slate-800 min-w-[28px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1.5 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Line Total */}
                        <div className="text-right min-w-[90px]">
                          <span className="text-xs font-extrabold text-slate-900 block">
                            {formatLKR(item.daily_rate * item.quantity * totalDays)}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            for {totalDays} {totalDays === 1 ? "day" : "days"}
                          </span>
                        </div>

                        {/* Remove Button */}
                        <button
                          type="button"
                          onClick={() => removeFromKit(item.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Pricing Summary & Quotation / Booking Forms */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.18 }}
            className="lg:col-span-5 space-y-5 sm:space-y-6"
          >
            {/* Cost Summary Box */}
            <div className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                Cost Summary
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Daily Equipment Subtotal</span>
                  <span className="font-semibold text-slate-900">{formatLKR(dailySubtotal)} / day</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Shoot Duration</span>
                  <span className="font-semibold text-slate-900">
                    {totalDays} {totalDays === 1 ? "day" : "days"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Equipment Count</span>
                  <span className="font-semibold text-slate-900">
                    {items.reduce((sum, i) => sum + i.quantity, 0)} units ({itemCount} models)
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-base font-extrabold text-slate-900">
                    Estimated Rental Total
                  </span>
                  <span className="text-2xl font-black text-brand-600">
                    {formatLKR(estimatedTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Quotation Generation Section */}
            <div className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Generate quotation</h3>

              {quotationSuccess ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-emerald-900">Quotation Generated &amp; Downloaded!</h4>
                    <p className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">
                      Reference: <strong>QT-{String(generatedQuoteId).padStart(4, "0")}</strong>. Your official quotation PDF was automatically generated.
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={handleReDownload}
                      disabled={quotationSubmitting}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-xs font-semibold hover:bg-emerald-100 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF Again</span>
                    </button>
                    <a
                      href="/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <span>View in Client Portal</span>
                      <ExternalLink className="w-3 h-3 text-emerald-200" />
                    </a>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleQuotationSubmit} className="space-y-3">
                  {quotationError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{quotationError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Full Name / Company <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={quoteName}
                      onChange={(e) => setQuoteName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-brand-500 focus:bg-white transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Email Address <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={quoteEmail}
                        onChange={(e) => setQuoteEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-brand-500 focus:bg-white transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Phone / WhatsApp <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={quotePhone}
                        onChange={(e) => setQuotePhone(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-brand-500 focus:bg-white transition-colors"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 pt-1">
                    <button
                      type="submit"
                      disabled={quotationSubmitting}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                    >
                      {quotationSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Generating Quotation PDF...</span>
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 text-brand-400" />
                          <span>Download Quotation</span>
                          <Download className="w-3.5 h-3.5 text-slate-400" />
                        </>
                      )}
                    </button>

                    <a
                      href={buildWhatsAppKitUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4 shrink-0" />
                      <span>Reserve Bag via WhatsApp</span>
                    </a>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
