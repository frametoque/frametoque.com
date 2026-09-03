"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  ShoppingBag, Trash2, Plus, Minus, ArrowRight, Check, Send, Sparkles, FileText, Download
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart, CartItem } from "@/context/CartContext";

const parsePrice = (priceString: string | number): number => {
  if (!priceString) return 0;
  return parseFloat(String(priceString).replace(/[^0-9.-]/g, "")) || 0;
};

export default function CartClient() {
  const [scrolled, setScrolled] = useState(false);
  const { cartItems, updateQuantity, removeFromCart, clearCart, cartCount } = useCart();
  const [currency, setCurrency] = useState("LKR");
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);

  // Checkout (WhatsApp) form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [targetWa, setTargetWa] = useState("94702771361");

  // Quotation form state
  const [quoteName, setQuoteName] = useState("");
  const [quoteEmail, setQuoteEmail] = useState("");
  const [quotePhone, setQuotePhone] = useState("");
  const [quotationSubmitting, setQuotationSubmitting] = useState(false);
  const [quotationSuccess, setQuotationSuccess] = useState(false);
  const [quotationError, setQuotationError] = useState("");

  useEffect(() => {
    function handleScroll() { setScrolled(window.scrollY > 50); }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const fetchRate = async () => {
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/LKR");
      const rateData = await res.json();
      setExchangeRate(rateData.rates.USD);
    } catch (e) {
      console.error("Failed to fetch exchange rate", e);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem("preferred_currency") || "LKR";
    setCurrency(saved);
    if (saved === "USD") fetchRate();
  }, []);

  useEffect(() => {
    const handler = (e: CustomEvent<{ currency: string }>) => {
      const newCurrency = e.detail.currency;
      setCurrency(newCurrency);
      if (newCurrency === "USD" && !exchangeRate) fetchRate();
    };
    window.addEventListener("currencyChange", handler as EventListener);
    return () => window.removeEventListener("currencyChange", handler as EventListener);
  }, [exchangeRate]);

  const getDisplayPrice = (item: CartItem) => {
    const raw = parsePrice(item.price);
    if (currency === "USD" && exchangeRate) return (raw * exchangeRate).toFixed(2);
    return raw.toLocaleString("en-US");
  };

  const getSubtotalLKR = () =>
    cartItems.reduce((acc, item) => acc + parsePrice(item.price) * item.quantity, 0);

  const getDisplaySubtotal = () => {
    const subtotalLKR = getSubtotalLKR();
    if (currency === "USD" && exchangeRate) return (subtotalLKR * exchangeRate).toFixed(2);
    return subtotalLKR.toLocaleString("en-US");
  };

  // ── WhatsApp Booking ──────────────────────────────────────────────────────
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone) {
      alert("Please fill in Name, Email, and Phone/WhatsApp fields.");
      return;
    }
    setSubmitting(true);
    const packagesText = cartItems
      .map((item, idx) =>
        `${idx + 1}. ${item.serviceTitle} - ${item.tier} \n   Price: ${getDisplayPrice(item)} ${currency}\n   Duration: ${item.duration}\n   Quantity: ${item.quantity}`
      )
      .join("\n\n");
    const messageText = `Hi Frametoque Team,\n\nI'd like to book the following service package(s):\n\n${packagesText}\n\nTotal Cart Value: ${getDisplaySubtotal()} ${currency}\n\nClient Details:\n- Name: ${name}\n- Email: ${email}\n- Phone/WhatsApp: ${phone}\n\n${notes ? `Additional Notes:\n${notes}` : ""}\n\nThank you!`;
    const waUrl = `https://wa.me/${targetWa}?text=${encodeURIComponent(messageText)}`;

    // Auto-save a quotation record in DB for every order placed via WhatsApp
    // (forceInsert skips duplicate checks — this is a background save, not user-initiated)
    try {
      await fetch("/api/quotation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteName: name,
          quoteEmail: email,
          quotePhone: phone,
          cartItems,
          subtotalLKR: getSubtotalLKR(),
          forceInsert: true,
        }),
      });
    } catch (err) {
      // Silently swallow — never block the WhatsApp checkout flow
      console.error("[checkout] background quotation save failed:", err);
    }

    setTimeout(() => {
      setSuccess(true);
      setSubmitting(false);
      clearCart();
      window.open(waUrl, "_blank");
    }, 1000);
  };

  // ── Get Quotation → POST to API route → Neon DB ───────────────────────────
  const handleQuotationSubmit = async (e?: React.FormEvent, force = false) => {
    if (e) e.preventDefault();
    setQuotationError("");
    if (!quoteName || !quoteEmail || !quotePhone) {
      setQuotationError("Please fill in all required fields.");
      return;
    }
    setQuotationSubmitting(true);
    try {
      const res = await fetch("/api/quotation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteName,
          quoteEmail,
          quotePhone,
          cartItems,
          subtotalLKR: getSubtotalLKR(),
          forceInsert: force,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unknown error");

      if (data.duplicate) {
        const confirmNew = window.confirm(data.message);
        if (confirmNew) {
          await handleQuotationSubmit(undefined, true);
          return;
        } else {
          setQuotationSubmitting(false);
          return;
        }
      }

      if (data.quotationId) {
        try {
          const { getQuotationById } = await import("@/app/(dashboard)/admin/actions/actions");
          const q = await getQuotationById(data.quotationId.toString());
          if (q) {
            if (!q.client_name) q.client_name = quoteName;
            if (!q.email) q.email = quoteEmail;
            if (!q.phone) q.phone = quotePhone;

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
      console.error(err);
      setQuotationError(err.message || "Something went wrong. Please try again.");
    } finally {
      setQuotationSubmitting(false);
    }
  };

  //done
if (success) {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col">
      <Navbar scrolled={scrolled} />
      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full bg-slate-900/60 border border-slate-800 rounded-3xl p-8 pt-16 text-center space-y-6 backdrop-blur-md shadow-2xl relative">
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center border-4 border-black shadow-lg">
            <Check className="w-12 h-12 text-white" />
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-black bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
              Booking Details Sent!
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Thank you for your request. We have redirected you to WhatsApp to confirm your booking details. We will be in touch shortly.
            </p>
          </div>
          <div className="pt-4 flex flex-col gap-3">
            <button onClick={() => setSuccess(false)} className="w-full py-3.5 px-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm font-semibold">
              Back to Cart
            </button>
            <Link href="/services" className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 transition-all duration-300 text-sm font-semibold block text-center">
              Browse More Services
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

  return (
    <main className="min-h-screen bg-black text-white overflow-hidden flex flex-col justify-between">
      <Navbar scrolled={scrolled} />

      <div className="flex-grow pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="border-b border-slate-800 pb-6 mb-8 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-b from-white to-gray-300 bg-clip-text text-transparent">
              Your <span className="text-brand-400">Cart</span>
            </h1>
            <p className="text-gray-400 text-sm mt-1">Review your packages and proceed to booking</p>
          </div>
          <span className="text-sm text-slate-400 bg-white/5 px-4 py-1.5 rounded-full border border-white/10 self-start">
            {cartCount} {cartCount === 1 ? "Item" : "Items"}
          </span>
        </div>

        {cartItems.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center text-slate-400 shadow-inner">
              <ShoppingBag className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Your cart is empty</h2>
              <p className="text-slate-400 max-w-md mx-auto text-sm leading-relaxed">
                <strong>Already placed an order or requested a quotation?</strong>
                <br />
                Log in to <Link href="/dashboard"><strong className="text-brand-400">/dashboard</strong></Link> using the <strong>same email address</strong> you provided to view your orders, quotations, and project updates.
              </p>
            </div>
            <Link href="/services" className="inline-flex items-center px-8 py-4 rounded-3xl bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 transition-all duration-300 font-semibold text-sm group">
              Browse Services
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-8 items-start">

            {/* ── Left: Items + Quotation ──────────────────────────────── */}
            <div className="lg:col-span-7 space-y-4">
              {cartItems.map((item) => (
                <div key={item.id} className="bg-slate-900/40 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-6 backdrop-blur-sm transition-all flex flex-col sm:flex-row gap-6 relative group">
                  <div className="flex-grow space-y-4">
                    <div>
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-semibold uppercase tracking-wider mb-2">
                        {item.categoryName}
                      </span>
                      <h3 className="text-xl font-bold leading-tight">{item.serviceTitle}</h3>
                      <p className="text-sm text-slate-400 mt-1">{item.tier}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>Delivery: {item.duration}</span>
                    </div>
                    <div className="flex items-center justify-between sm:justify-start gap-8 pt-2">
                      <div className="text-lg font-extrabold bg-gradient-to-r from-brand-400 to-brand-500 bg-clip-text text-transparent">
                        {getDisplayPrice(item)} <span className="text-xs text-gray-400">{currency}</span>
                      </div>
                      <div className="flex items-center bg-white/5 border border-white/10 rounded-full px-2 py-1">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1 hover:text-brand-400 transition-colors" aria-label="Decrease quantity">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-3 text-sm font-semibold select-none w-8 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1 hover:text-brand-400 transition-colors" aria-label="Increase quantity">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="sm:self-start p-2 text-slate-500 hover:text-red-400 hover:bg-white/5 rounded-full transition-colors self-end" aria-label="Remove item">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}

              <div className="flex justify-end pt-2">
                <button onClick={clearCart} className="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-4 transition-colors">
                  Clear Cart
                </button>
              </div>

              {/* ── GET YOUR QUOTATION ──────────────────────────────────── */}
              {!cartItems.some((item) => item.categorySlug === "domain" || item.serviceId === "domain-reg") && (
                <div className="mt-6 bg-slate-900/50 border border-slate-700/60 rounded-3xl p-6 backdrop-blur-md space-y-5 relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-500/10 rounded-full blur-2xl pointer-events-none" />

                  <div className="space-y-1 relative">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-semibold uppercase tracking-wider">
                      <FileText className="w-3 h-3" /> Free
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white">Get Your Quotation</h3>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-md">
                    Want a formal quote before committing? Drop your details and download a full breakdown immediately.
                  </p>
                </div>

                {quotationSuccess ? (
                  <div className="flex items-start gap-4 bg-green-500/10 border border-green-500/20 rounded-2xl p-5">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="font-bold text-green-300 text-sm">Quotation generated successfully!</p>
                      <p className="text-slate-400 text-xs mt-0.5">
                        Your quotation PDF has been generated and downloaded to your device.
                      </p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleQuotationSubmit} className="space-y-4 relative">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label htmlFor="quote-name" className="text-xs font-semibold text-slate-300">
                          Full Name <span className="text-brand-400">*</span>
                        </label>
                        <input
                          id="quote-name"
                          type="text"
                          required
                          value={quoteName}
                          onChange={(e) => setQuoteName(e.target.value)}
                          className="w-full bg-black/40 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl px-4 py-3 text-sm outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="quote-phone" className="text-xs font-semibold text-slate-300">
                          WhatsApp / Phone <span className="text-brand-400">*</span>
                        </label>
                        <input
                          id="quote-phone"
                          type="tel"
                          required
                          value={quotePhone}
                          onChange={(e) => setQuotePhone(e.target.value)}
                          className="w-full bg-black/40 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl px-4 py-3 text-sm outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="quote-email" className="text-xs font-semibold text-slate-300">
                        Email Address <span className="text-brand-400">*</span>
                      </label>
                      <input
                        id="quote-email"
                        type="email"
                        required
                        value={quoteEmail}
                        onChange={(e) => setQuoteEmail(e.target.value)}
                        className="w-full bg-black/40 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl px-4 py-3 text-sm outline-none transition-all"
                      />
                    </div>

                    {quotationError && (
                      <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                        {quotationError}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={quotationSubmitting}
                      className="w-full py-3.5 px-6 rounded-2xl bg-white/5 border border-brand-500/30 hover:bg-brand-500/10 hover:border-brand-500/60 transition-all duration-300 font-bold text-sm flex items-center justify-center gap-2 text-brand-300 active:scale-95 disabled:opacity-50 disabled:scale-100"
                    >
                      {quotationSubmitting ? (
                        <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <><Download className="w-4 h-4" /> Download Quotation PDF</>
                      )}
                    </button>
                  </form>
                )}
              </div>
              )}
            </div>

            {/* ── Right: Summary & WhatsApp Booking ───────────────────── */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-md space-y-4">
                <h3 className="text-lg font-bold border-b border-slate-800 pb-3">Booking Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-slate-400">
                    <span>Total Packages ({cartCount})</span>
                    <span>{getDisplaySubtotal()} {currency}</span>
                  </div>
                  {/* <div className="flex justify-between text-slate-400">
                    <span>Tax & Setup</span>
                    <span className="text-xs text-brand-400">TBD / Included</span>
                  </div> */}
                </div>
                <div className="border-t border-slate-800 pt-4 flex justify-between items-baseline">
                  <span className="font-bold text-base">Total Value</span>
                  <div className="text-2xl font-black bg-gradient-to-r from-brand-400 to-brand-500 bg-clip-text text-transparent">
                    {getDisplaySubtotal()} <span className="text-xs text-gray-300 font-semibold">{currency}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-md space-y-5">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    Place Your Order
                  </h3>
                  <p className="text-xs text-slate-400">Send selected packages to our team via WhatsApp to get started.</p>
                </div>
                <form onSubmit={handleCheckoutSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label htmlFor="client-name" className="text-xs font-semibold text-slate-300">Full Name *</label>
                    <input id="client-name" type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-black/40 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl px-4 py-3 text-sm outline-none transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="client-email" className="text-xs font-semibold text-slate-300">Email Address *</label>
                    <input id="client-email" type="email" required  value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-black/40 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl px-4 py-3 text-sm outline-none transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="client-phone" className="text-xs font-semibold text-slate-300">WhatsApp / Phone *</label>
                    <input id="client-phone" type="tel" required  value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-black/40 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl px-4 py-3 text-sm outline-none transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="client-notes" className="text-xs font-semibold text-slate-300">Additional Requirements / Notes</label>
                    <textarea id="client-notes" rows={3} placeholder="Specify customized requests or instructions..." value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full bg-black/40 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl px-4 py-3 text-sm outline-none transition-all resize-none" />
                  </div>
                  <div className="space-y-1 pb-2">
                    <label className="text-xs font-semibold text-slate-300">Send order to:</label>
                    <div className="flex flex-col sm:flex-row gap-4 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                        <input type="radio" name="targetWa" value="94702771361" checked={targetWa === "94702771361"} onChange={(e) => setTargetWa(e.target.value)} className="accent-brand-500" />
                        +94 70 277 1361
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                        <input type="radio" name="targetWa" value="94778609356" checked={targetWa === "94778609356"} onChange={(e) => setTargetWa(e.target.value)} className="accent-brand-500" />
                        +94 77 860 9356
                      </label>
                    </div>
                  </div>
                  <button type="submit" disabled={submitting} className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 transition-all duration-300 font-bold text-sm flex items-center justify-center gap-2 text-white shadow-lg shadow-brand-500/20 active:scale-95 disabled:opacity-50 disabled:scale-100">
                    {submitting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <><Send className="w-4 h-4" /> Book via WhatsApp</>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}