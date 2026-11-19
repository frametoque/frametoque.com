"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MessageCircle, 
  Phone, 
  Camera, 
  ShieldCheck, 
  Sparkles, 
  Layers, 
  Check, 
  Loader2,
  CalendarDays,
  Share2,
  ChevronLeft,
  ChevronRight,
  FileText,
  AlertTriangle,
  ShoppingBag
} from "lucide-react";
import type { PublicRentalProduct, BookedDateRange } from "../../actions/rentals-public";
import { checkPublicAvailability } from "../../actions/rentals-public";
import { useRentalKit } from "@/context/RentalKitContext";

const formatLKR = (amount: number) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(amount || 0);

interface ProductDetailsClientProps {
  product: PublicRentalProduct;
  bookedRanges: BookedDateRange[];
  similarProducts: PublicRentalProduct[];
}

export default function ProductDetailsClient({
  product,
  bookedRanges,
  similarProducts,
}: ProductDetailsClientProps) {
  const { addToKit, isInKit, openKit } = useRentalKit();

  // Gallery active image
  const [selectedImage, setSelectedImage] = useState<string>(
    product.image_url || product.images[0] || ""
  );

  // Tomorrow's date string as default
  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  };

  const getDayAfterTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split("T")[0];
  };

  // Availability checking state
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [startDate, setStartDate] = useState(getTomorrowStr());
  const [endDate, setEndDate] = useState(getTomorrowStr());
  const [isChecking, startCheckingTransition] = useTransition();
  const [availabilityResult, setAvailabilityResult] = useState<{
    checked: boolean;
    available: boolean;
    message: string;
    totalDays: number;
    estimatedTotal: number;
  } | null>(null);

  // Check Availability Handler
  const handleCheckAvailability = () => {
    if (!startDate) {
      alert("Please select a shoot date.");
      return;
    }

    const effectiveEnd = isMultiDay ? endDate || startDate : startDate;

    if (isMultiDay && effectiveEnd < startDate) {
      alert("End date cannot be earlier than start date.");
      return;
    }

    startCheckingTransition(async () => {
      const res = await checkPublicAvailability({
        inventory_id: product.id,
        start_date: startDate,
        end_date: effectiveEnd,
      });

      setAvailabilityResult({
        checked: true,
        available: res.available,
        message: res.message,
        totalDays: res.requestedDates.totalDays,
        estimatedTotal: res.estimatedTotal || product.daily_rate * res.requestedDates.totalDays,
      });
    });
  };

  // WhatsApp Pre-filled message builder
  const buildWhatsAppUrl = (isAvailableBooking: boolean) => {
    const phone = "94701901461";
    const effectiveEnd = isMultiDay ? endDate || startDate : startDate;
    const days = availabilityResult?.totalDays || 1;
    const total = availabilityResult?.estimatedTotal || product.daily_rate;

    let text = "";
    if (isAvailableBooking) {
      text = `Hi Frametoque Team,\n\nI'm interested in renting the following equipment:\n- Item: *${product.item_name}*\n- Rate: ${formatLKR(product.daily_rate)} / day\n- Shoot Date(s): ${startDate}${isMultiDay && effectiveEnd !== startDate ? ` to ${effectiveEnd}` : ""} (${days} day${days > 1 ? "s" : ""})\n- Estimated Rental: ${formatLKR(total)}\n- Availability Status: Checked available on your website.\n\nCould you please confirm the booking and send over the pickup details? Thanks!`;
    } else {
      text = `Hi Frametoque Team,\n\nI noticed *${product.item_name}* is booked on my shoot date (${startDate}${isMultiDay ? ` to ${effectiveEnd}` : ""}).\nDo you have alternative gear or packages available for those dates? Thank you!`;
    }

    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  };

  const allImages = Array.from(
    new Set([product.image_url, ...product.images].filter(Boolean) as string[])
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 sm:space-y-12">
      {/* Main Grid: Gallery (Row 1 Col 1-7), Pricing Card (Row 1-2 Col 8-12; 2nd on Mobile), Overview (Row 2 Col 1-7; 3rd on Mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-x-12 lg:gap-y-8 items-start">
        
        {/* 1. GALLERY SHOWCASE (Row 1 Col 1-7 on Desktop; 1st on Mobile) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="lg:col-span-7 lg:col-start-1 lg:row-start-1 space-y-3"
        >
            <div className="aspect-square rounded-3xl bg-white border border-slate-200/90 overflow-hidden relative shadow-sm group">
              <AnimatePresence mode="wait">
                {selectedImage ? (
                  <motion.img
                    key={selectedImage}
                    src={selectedImage}
                    alt={product.item_name}
                    initial={{ opacity: 0.6, scale: 1.02 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0.6 }}
                    transition={{ duration: 0.25 }}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                    <Camera className="w-16 h-16 mb-2 text-slate-300" />
                    <span className="text-xs font-medium text-slate-400">Photo Coming Soon</span>
                  </div>
                )}
              </AnimatePresence>

              {/* Prev / Next navigation arrows when multiple images */}
              {allImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const currentIdx = allImages.indexOf(selectedImage);
                      const prevIdx = currentIdx > 0 ? currentIdx - 1 : allImages.length - 1;
                      setSelectedImage(allImages[prevIdx]);
                    }}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow-lg border border-slate-200/80 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const currentIdx = allImages.indexOf(selectedImage);
                      const nextIdx = currentIdx < allImages.length - 1 ? currentIdx + 1 : 0;
                      setSelectedImage(allImages[nextIdx]);
                    }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow-lg border border-slate-200/80 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  {/* Image Counter Badge */}
                  <div className="absolute bottom-4 right-4 px-2.5 py-1 rounded-full text-xs font-semibold bg-black/60 text-white backdrop-blur-md">
                    {allImages.indexOf(selectedImage) + 1} / {allImages.length}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnails row */}
            {allImages.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(img)}
                    className={`w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                      selectedImage === img
                        ? "border-brand-600 shadow-md ring-2 ring-brand-500/20"
                        : "border-slate-200 hover:border-slate-400 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

        {/* 2. PRICING & DATE CHECK CARD (Col 8-12 Row 1-2 on Desktop; 2nd on Mobile) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="lg:col-span-5 lg:col-start-8 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-24 space-y-5 sm:space-y-6"
        >
          <div className="bg-white rounded-3xl p-5 sm:p-8 border border-slate-200/90 shadow-lg space-y-5 sm:space-y-6">
            
            {/* Header: Title, Category & Daily Rate */}
            <div className="space-y-2 border-b border-slate-100 pb-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600">
                {product.category}
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {product.item_name}
              </h1>

              <div className="pt-2 flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-slate-900">
                  {formatLKR(product.daily_rate)}
                </span>
                <span className="text-sm text-slate-500 font-medium">/ 24h shoot day</span>
              </div>
            </div>

            {/* Interactive Availability Checker */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-brand-600" />
                  <span>Check Shoot Availability</span>
                </label>

                {/* Single Day vs Multi Day toggle */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMultiDay(false);
                      setAvailabilityResult(null);
                    }}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      !isMultiDay ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    1 Day
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMultiDay(true);
                      setEndDate(getDayAfterTomorrowStr());
                      setAvailabilityResult(null);
                    }}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      isMultiDay ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Multi-Day
                  </button>
                </div>
              </div>

              {/* Date Inputs */}
              <div className="space-y-3">
                <div>
                  <label htmlFor="shoot-date-start" className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {isMultiDay ? "Shoot Start Date" : "Shoot Date"}
                  </label>
                  <input
                    id="shoot-date-start"
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (!isMultiDay) setEndDate(e.target.value);
                      setAvailabilityResult(null);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-xs"
                  />
                </div>

                {isMultiDay && (
                  <div>
                    <label htmlFor="shoot-date-end" className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Shoot End Date (Return Date)
                    </label>
                    <input
                      id="shoot-date-end"
                      type="date"
                      min={startDate || new Date().toISOString().split("T")[0]}
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setAvailabilityResult(null);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-xs"
                    />
                  </div>
                )}
              </div>

              {/* Check Availability Trigger Button */}
              <button
                type="button"
                onClick={handleCheckAvailability}
                disabled={isChecking}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
              >
                {isChecking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
                    <span>Verifying Date Availability...</span>
                  </>
                ) : (
                  <span>Check Availability</span>
                )}
              </button>
            </div>

            {/* Availability Result Box */}
            <AnimatePresence>
              {availabilityResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className={`p-4 rounded-2xl border transition-all ${
                    availabilityResult.available
                      ? "bg-emerald-50/80 border-emerald-200 text-emerald-950"
                      : "bg-amber-50/80 border-amber-200 text-amber-950"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {availabilityResult.available ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1.5 flex-1">
                      <h4 className="text-sm font-bold">
                        {availabilityResult.available
                          ? "Available for Your Selected Date(s)!"
                          : "Already Booked for These Dates"}
                      </h4>
                      {!availabilityResult.available && availabilityResult.message && (
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {availabilityResult.message}
                        </p>
                      )}

                      {availabilityResult.available && (
                        <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-xs font-semibold text-emerald-900">
                        <span>Duration: {availabilityResult.totalDays} day{availabilityResult.totalDays > 1 ? "s" : ""}</span>
                        <span className="text-sm font-bold">
                          Est. Total: {formatLKR(availabilityResult.estimatedTotal)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

            {/* Direct Booking via WhatsApp & Add to Kit Action Buttons */}
            <div className="space-y-2.5 pt-2">
              <a
                href={buildWhatsAppUrl(availabilityResult?.available !== false)}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full py-3.5 rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer ${
                  availabilityResult?.available === false
                    ? "bg-amber-600 hover:bg-amber-500 text-white"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20"
                }`}
              >
                <MessageCircle className="w-4 h-4" />
                <span>
                  {availabilityResult?.available === false
                    ? "Ask for Alternative Dates on WhatsApp"
                    : "Book Single Item on WhatsApp"}
                </span>
              </a>

              {/* Add to Multi-Item Bag Button */}
              <button
                type="button"
                onClick={() => {
                  addToKit({
                    id: product.id,
                    slug: product.slug || product.id,
                    item_name: product.item_name,
                    category: product.category,
                    daily_rate: product.daily_rate,
                    image_url: selectedImage || product.image_url,
                  });
                }}
                className={`w-full py-3 rounded-2xl font-bold text-xs sm:text-sm border transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 ${
                  isInKit(product.id)
                    ? "bg-brand-50 text-brand-700 border-brand-300 hover:bg-brand-100"
                    : "bg-slate-900 hover:bg-slate-800 text-white border-transparent shadow-sm"
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>
                  {isInKit(product.id) ? "In Bag (Click to View Bag)" : "+ Add to Bag (Bundle Multiple Items)"}
                </span>
              </button>
            </div>

            {/* Phone Call Option */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>Have immediate questions?</span>
              <a
                href="tel:+94701901461"
                className="font-bold text-slate-900 hover:text-brand-600 flex items-center gap-1 transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-brand-600" />
                <span>+94 70 190 1461</span>
              </a>
            </div>

          </div>
        </motion.div>

        {/* 3. PRODUCT OVERVIEW & REQUIREMENTS (Row 2 Col 1-7 on Desktop; 3rd on Mobile) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.18 }}
          className="lg:col-span-7 lg:col-start-1 lg:row-start-2 bg-white rounded-3xl p-5 sm:p-8 border border-slate-200 shadow-xs space-y-5 sm:space-y-6"
        >
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-3">Product Overview</h2>
            {product.description ? (
              <div className="text-sm text-slate-600 leading-relaxed space-y-3 whitespace-pre-line">
                {product.description}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">
                Professional cinema and photography gear tested and maintained prior to each shoot. Contact our rental desk for exact sensor, mount, and bundle specifications.
              </p>
            )}
          </div>

          {/* Rental Policy & Registration Requirements */}
          <div className="pt-6 border-t border-slate-100 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Registration Requirements
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Please provide below details for Registration:
              </p>
            </div>

            {/* Numbered Requirements Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                "Both sides of NIC",
                "Personal Facebook Profile",
                "Home contact number",
                "Home address and location",
                "Utility bill (Electricity or Telephone) to confirm address",
                "Facebook page (Need to see your works)",
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-150 text-xs text-slate-700 font-medium"
                >
                  <span className="w-5 h-5 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center text-[11px] font-bold shrink-0">
                    {idx + 1}
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            {/* Note Box */}
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-950 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Important Note:</span>
              </div>
              <ul className="space-y-1 text-[11.5px] text-amber-900/90 pl-5 list-disc">
                <li>You must pay half amount of advance payment to confirm the booking</li>
                <li>Advance payment is non-refundable and that advance payment is not valid for another booking</li>
              </ul>
            </div>
          </div>
        </motion.div>

      </div>

      {/* SIMILAR EQUIPMENT CROSS-SELL SECTION */}
      {similarProducts.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="pt-12 border-t border-slate-200 space-y-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Other Equipment for Rent</h3>
              <p className="text-xs text-slate-500">More production gear available from our Colombo rental desk.</p>
            </div>
            <Link
              href="/rentals"
              className="text-xs font-bold text-brand-600 hover:text-brand-500 transition-colors"
            >
              View Full Catalog &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {similarProducts.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: idx * 0.05 }}
              >
                <Link
                  href={`/rentals/${item.slug || item.id}`}
                  className="group bg-white rounded-2xl border border-slate-200 hover:border-brand-300 p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between h-full"
                >
                  <div className="space-y-3">
                    <div className="aspect-square rounded-xl bg-slate-100 overflow-hidden relative">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.item_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <Camera className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-brand-600 uppercase">
                        {item.category}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-1">
                        {item.item_name}
                      </h4>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 mt-3 flex items-baseline justify-between">
                    <span className="font-extrabold text-sm text-slate-900">
                      {formatLKR(item.daily_rate)}
                    </span>
                    <span className="text-[11px] text-slate-500">/ day</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

    </div>
  );
}
