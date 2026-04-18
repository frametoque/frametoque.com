"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Download, ArrowLeft, Loader2, FileText, Calendar, Tag, Briefcase } from "lucide-react";
import Link from "next/link";
import InvoiceDocument from "@/app/(dashboard)/dashboard/invoice/InvoiceDocument";

const workStatusStyles = {
  "in progress": "bg-brand-500/20 text-brand-400 border-brand-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

const paymentStatusStyles = {
  paid: "bg-green-500/20 text-green-400 border-green-500/30",
  unpaid: "bg-red-500/20 text-red-400 border-red-500/30",
};

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
};

const formatMoney = (value, currency = "") => {
  if (!value || isNaN(parseFloat(value))) return "N/A";
  return `${currency} ${parseFloat(value).toLocaleString("en-US", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })}`.trim();
};

/* ── Wallet SVG icons ── */
const AppleWalletIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path
      fill="white"
      d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"
    />
  </svg>
);

const GoogleWalletIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

export default function InvoicePage() {
  const { invoice_id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [addingToWallet, setAddingToWallet] = useState(null);
  const hiddenRef = useRef(null);

  useEffect(() => {
    if (!invoice_id) return;
    const fetchInvoice = async () => {
      try {
        const res = await fetch(`/api/invoice/${invoice_id}`);
        if (!res.ok) throw new Error("Invoice not found");
        const data = await res.json();
        setInvoice(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [invoice_id]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;
      const element = hiddenRef.current?.querySelector("#invoice-render");
      if (!element) throw new Error("Invoice element not found");
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
        imageTimeout: 15000,
        width: 794,
        height: 1123,
        windowWidth: 794,
        windowHeight: 1123,
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, "JPEG", 0, 0, pageWidth, pageHeight);
      pdf.save(`Invoice-${invoice_id}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleAppleWallet = async () => {
    setAddingToWallet("apple");
    try {
      const res = await fetch(`/api/invoice/${invoice_id}/apple-wallet`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to generate pass");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice-${invoice_id}.pkpass`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Apple Wallet error:", err);
      alert("Failed to generate Apple Wallet pass. Please try again.");
    } finally {
      setAddingToWallet(null);
    }
  };

  const handleGoogleWallet = async () => {
    setAddingToWallet("google");
    try {
      const res = await fetch(`/api/invoice/${invoice_id}/google-wallet`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to generate pass");
      const { saveUrl } = await res.json();
      window.open(saveUrl, "_blank");
    } catch (err) {
      console.error("Google Wallet error:", err);
      alert("Failed to generate Google Wallet pass. Please try again.");
    } finally {
      setAddingToWallet(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-6 text-center">
        <p className="text-red-400">{error}</p>
        <Link href="/dashboard/projects" className="text-brand-400 text-sm mt-3 inline-block">
          ← Back to Projects
        </Link>
      </div>
    );
  }

  const lineItems = [
    { desc: invoice.description_1, price: invoice.price_1, total: invoice.total_1 },
    { desc: invoice.description_2, price: invoice.price_2, total: invoice.total_2 },
    { desc: invoice.description_3, price: invoice.price_3, total: invoice.total_3 },
    { desc: invoice.description_4, price: invoice.price_4, total: invoice.total_4 },
  ].filter((item) => item.desc);

  const currencyLabel = invoice.currency === "LKR" ? "Rs." : invoice.currency;

  return (
    <div className="space-y-6">

      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/projects"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </Link>

        <button
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-3xl bg-gradient-to-r from-brand-600 to-brand-700 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {downloading ? "Generating PDF..." : "Download PDF"}
        </button>
      </div>

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* Right — Invoice Details */}
        <div className="flex-1 space-y-4">

          {/* Project Name */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
            <h1 className="text-2xl font-bold text-white mb-1">{invoice.project_name || "Untitled Project"}</h1>
            <p className="text-gray-400 text-sm">{invoice.billing_address}</p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-5 flex items-start gap-4">
              <div className="p-2 rounded-3xl bg-brand-500/10">
                <FileText className="w-5 h-5 text-brand-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">Invoice ID</p>
                <p className="text-white font-semibold">{invoice.invoice_id}</p>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-5 flex items-start gap-4">
              <div className="p-2 rounded-3xl bg-brand-500/10">
                <Calendar className="w-5 h-5 text-brand-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">Date</p>
                <p className="text-white font-semibold">{formatDate(invoice.date)}</p>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-5 flex items-start gap-4">
              <div className="p-2 rounded-3xl bg-brand-500/10">
                <Briefcase className="w-5 h-5 text-brand-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-2">Project Status</p>
                <span className={`px-3 py-1 text-xs font-medium rounded-full border ${workStatusStyles[invoice.work_status] || workStatusStyles.pending}`}>
                  {invoice.work_status || "pending"}
                </span>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-5 flex items-start gap-4">
              <div className="p-2 rounded-3xl bg-brand-500/10">
                <Tag className="w-5 h-5 text-brand-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-2">Payment Status</p>
                <span className={`px-3 py-1 text-xs font-medium rounded-full border ${paymentStatusStyles[invoice.payment_status] || paymentStatusStyles.unpaid}`}>
                  {invoice.payment_status || "unpaid"}
                </span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          {lineItems.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
              <div className="grid grid-cols-3 px-5 py-3 border-b border-white/10 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <span>Description</span>
                <span className="text-center">Price</span>
                <span className="text-right">Total</span>
              </div>

              {lineItems.map((item, i) => (
                <div key={i} className="grid grid-cols-3 px-5 py-4 border-b border-white/5 last:border-0">
                  <span className="text-white text-sm">{item.desc}</span>
                  <span className="text-gray-300 text-sm text-center">
                    {item.price ? `${currencyLabel} ${item.price}` : "-"}
                  </span>
                  <span className="text-white text-sm text-right font-medium">
                    {!isNaN(parseFloat(item.total))
                      ? `${currencyLabel} ${parseFloat(item.total).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                      : "-"}
                  </span>
                </div>
              ))}

              {/* Subtotal / Discount / Total */}
              <div className="px-5 py-4 space-y-2 border-t border-white/10 bg-white/5">
                {invoice.subtotal && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Subtotal</span>
                    <span className="text-white">
                      {currencyLabel} {parseFloat(invoice.subtotal).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {invoice.discount && parseFloat(invoice.discount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Discount</span>
                    <span className="text-red-400">
                      − {currencyLabel} {parseFloat(invoice.discount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {invoice.advance && parseFloat(invoice.advance) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Advance Paid</span>
                    <span className="text-green-400">
                      − {currencyLabel} {parseFloat(invoice.advance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-white/10">
                  <span className="text-white font-semibold">Total Due</span>
                  <span className="text-white font-bold text-lg">
                    {currencyLabel}{" "}
                    {(
                      parseFloat(invoice.subtotal || 0) -
                      parseFloat(invoice.discount || 0) -
                      parseFloat(invoice.advance || 0)
                    ).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── Wallet Buttons ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleAppleWallet}
              disabled
              className="inline-flex items-center justify-center gap-3 w-full px-5 py-4 rounded-3xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addingToWallet === "apple" ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <AppleWalletIcon />
              )}
              <div className="text-left">
                <p className="text-white/50 text-[10px] leading-none mb-0.5">Add to</p>
                <p className="text-white font-semibold text-sm leading-none">Apple Wallet</p>
              </div>
            </button>

            <button
              onClick={handleGoogleWallet}
              disabled
              className="inline-flex items-center justify-center gap-3 w-full px-5 py-4 rounded-3xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addingToWallet === "google" ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <GoogleWalletIcon />
              )}
              <div className="text-left">
                <p className="text-white/50 text-[10px] leading-none mb-0.5">Save to</p>
                <p className="text-white font-semibold text-sm leading-none">Google Wallet</p>
              </div>
            </button>
          </div>

        </div>
      </div>

      {/*
        ── Hidden full-size render for PDF capture ──
        Positioned off-screen. Rendered at exactly 794×1123px (A4 @ 96dpi).
        html2canvas captures this at scale:3 → ~2380×3369px → excellent PDF quality.
      */}
      <div
        ref={hiddenRef}
        style={{
          position: "fixed",
          top: "-9999px",
          left: "-9999px",
          width: "794px",
          height: "1123px",
          zIndex: -1,
          pointerEvents: "none",
        }}
      >
        <InvoiceDocument invoice={invoice} />
      </div>

    </div>
  );
}