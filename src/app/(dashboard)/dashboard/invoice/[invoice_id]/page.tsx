"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Download, ArrowLeft, Loader2, FileText, Calendar, Clock, Tag, Briefcase, CreditCard } from "lucide-react";
import Link from "next/link";
import { generateInvoicePDF } from "@/app/(dashboard)/dashboard/invoice/InvoiceDocument";
import PayModal from "@/components/PayModal";

const workStatusStyles = {
  "in progress": "bg-brand-500/20 text-brand-400 border-brand-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

const paymentStatusStyles = {
  "fully paid": "bg-green-500/20 text-green-400 border-green-500/30",
  unpaid: "bg-red-500/20 text-red-400 border-red-500/30",
  "advance-paid": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "partially paid": "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  "on review": "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

const paymentStatusLabels = {
  "fully paid": "Fully Paid",
  unpaid: "Unpaid",
  "advance-paid": "Advance Paid",
  "partially paid": "Partially Paid",
  "on review": "On Review",
};

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("en-US", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatMoney = (value, currency = "LKR") => {
  if (!value || isNaN(parseFloat(value))) return "N/A";
  const currencySymbol = currency === "LKR" ? "LKR " : currency;
  return `${currencySymbol} ${parseFloat(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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
  const [addingToWallet, setAddingToWallet] = useState<string | null>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);

  useEffect(() => {
    if (!invoice_id) return;
    const fetchInvoice = async () => {
      try {
        const res = await fetch(`/api/invoice/${invoice_id}?t=${Date.now()}`, { cache: "no-store" });
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
      const pdfBytes = await generateInvoicePDF(invoice);
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice_id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
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
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? body.error ?? `Server error ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice_id}.pkpass`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Apple Wallet error:", err);
      alert(`Apple Wallet: ${err?.message ?? "Unknown error"}`);
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
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Server error ${res.status}`);
      }
      const { saveUrl } = await res.json();
      window.open(saveUrl, "_blank");
    } catch (err: any) {
      console.error("Google Wallet error:", err);
      alert(`Google Wallet: ${err?.message ?? "Unknown error"}`);
    } finally {
      setAddingToWallet(null);
    }
  };

  useEffect(() => {
    const handlePayNowEvent = () => setIsPayModalOpen(true);
    const handleDownloadEvent = () => handleDownload();
    window.addEventListener("client-invoice:pay-now", handlePayNowEvent);
    window.addEventListener("client-invoice:download-pdf", handleDownloadEvent);
    return () => {
      window.removeEventListener("client-invoice:pay-now", handlePayNowEvent);
      window.removeEventListener("client-invoice:download-pdf", handleDownloadEvent);
    };
  }, [invoice]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-white/10 rounded-full w-48" />
          <div className="h-10 bg-white/5 rounded-3xl w-32" />
        </div>
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
          <div className="space-y-3">
            <div className="h-6 bg-white/10 rounded-full w-1/3" />
            <div className="h-4 bg-white/5 rounded-full w-1/4" />
          </div>
          <hr className="border-white/5" />
          <div className="space-y-4">
            <div className="h-4 bg-white/5 rounded-full w-full" />
            <div className="h-4 bg-white/5 rounded-full w-5/6" />
            <div className="h-4 bg-white/5 rounded-full w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-6 text-center">
        <p className="text-red-400">{error}</p>
        <Link href="/dashboard/invoices" className="text-brand-400 text-sm mt-3 inline-block">
          ← Back to Invoices
        </Link>
      </div>
    );
  }

  const currencyLabel = invoice?.currency === "LKR" || !invoice?.currency ? "LKR " : invoice.currency;
  const subtotal = parseFloat(invoice?.subtotal || 0);
  const discount = parseFloat(invoice?.discount || 0);
  const advance = parseFloat(invoice?.advance || 0);
  const taxRate = parseFloat(invoice?.tax_rate || 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = parseFloat(invoice?.total || subtotal + taxAmount - discount);

  const paymentsList = Array.isArray(invoice?.payments) ? invoice.payments : [];
  const totalPayments = paymentsList
    .filter((p: any) => !String(p.description || '').toLowerCase().startsWith('advance'))
    .reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0);

  const totalDue = Math.max(0, total - advance - totalPayments);

  return (
    <div className="space-y-6">

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Invoice Details */}
        <div className="flex-1 space-y-4">
          {/* Project Name */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
            <h2 className="text-xl font-bold text-white mb-1">
              {invoice?.project_name || "Untitled Project"}
            </h2>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-5 flex items-start gap-4">
              <div className="p-2 rounded-3xl bg-brand-500/10">
                <FileText className="w-5 h-5 text-brand-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">Invoice ID</p>
                <p className="text-white font-semibold">{invoice?.invoice_id}</p>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-5 flex items-start gap-4">
              <div className="p-2 rounded-3xl bg-brand-500/10">
                <Calendar className="w-5 h-5 text-brand-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">Date</p>
                <p className="text-white font-semibold">{formatDate(invoice?.date)}</p>
              </div>
            </div>

            {invoice?.due_date && (
              <div className="bg-white/5 border border-white/10 rounded-3xl p-5 flex items-start gap-4">
                <div className="p-2 rounded-3xl bg-brand-500/10">
                  <Clock className="w-5 h-5 text-brand-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-xs mb-1">Due Date</p>
                  <p className={`font-semibold ${new Date(invoice.due_date) < new Date() && invoice.payment_status !== 'fully paid' ? 'text-red-400' : 'text-white'}`}>
                    {formatDate(invoice.due_date)}
                  </p>
                </div>
              </div>
            )}

            <div className="bg-white/5 border border-white/10 rounded-3xl p-5 flex items-start gap-4">
              <div className="p-2 rounded-3xl bg-brand-500/10">
                <Briefcase className="w-5 h-5 text-brand-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-2">Project Status</p>
                <span
                  className={`px-3 py-1 text-xs font-medium rounded-full border ${
                    workStatusStyles[invoice?.work_status] || workStatusStyles.pending
                  }`}
                >
                  {invoice?.work_status || "pending"}
                </span>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-5 flex items-start gap-4">
              <div className="p-2 rounded-3xl bg-brand-500/10">
                <Tag className="w-5 h-5 text-brand-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-2">Payment Status</p>
                <span
                  className={`px-3 py-1 text-xs font-medium rounded-full border ${
                    paymentStatusStyles[invoice?.payment_status] || paymentStatusStyles.unpaid
                  }`}
                >
                  {paymentStatusLabels[invoice?.payment_status] || invoice?.payment_status || "unpaid"}
                </span>
              </div>
            </div>
          </div>

          {/* Billing Summary */}
          <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
            <div className="px-5 py-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Subtotal</span>
                <span className="text-white font-semibold">
                  {formatMoney(subtotal, invoice?.currency)}
                </span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Discount</span>
                  <span className="text-red-400">
                    − {formatMoney(discount, invoice?.currency)}
                  </span>
                </div>
              )}

              {taxRate > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Tax ({taxRate}%)</span>
                  <span className="text-white">
                    + {formatMoney(taxAmount, invoice?.currency)}
                  </span>
                </div>
              )}

              <div className="flex justify-between pt-2 border-t border-white/10">
                <span className="text-gray-300">Total</span>
                <span className="text-white font-semibold">
                  {formatMoney(total, invoice?.currency)}
                </span>
              </div>

              {advance > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Advance Paid</span>
                  <span className="text-green-400">
                    − {formatMoney(advance, invoice?.currency)}
                  </span>
                </div>
              )}

              {totalPayments > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Payments</span>
                  <span className="text-green-400">
                    − {formatMoney(totalPayments, invoice?.currency)}
                  </span>
                </div>
              )}

              <div className="flex justify-between pt-2 border-t border-white/10">
                <span className="text-white font-semibold">Total Due</span>
                <span className="text-white font-bold text-lg">
                  {formatMoney(totalDue, invoice?.currency)}
                </span>
              </div>
            </div>
          </div>
              {/* ── Wallet Buttons ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Apple Wallet */}
            <button
              onClick={handleAppleWallet}
              disabled={addingToWallet === "apple"}
              className="inline-flex items-center justify-center gap-3 w-full px-5 py-4 rounded-3xl border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {addingToWallet === "apple" ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <AppleWalletIcon />
              )}
              <div className="text-left">
                <p className="text-white/50 text-[10px] leading-none mb-0.5">
                  {addingToWallet === "apple" ? "Generating…" : "Add to"}
                </p>
                <p className="text-white font-semibold text-sm leading-none">Apple Wallet</p>
              </div>
            </button>

            {/* Google Wallet */}
            <button
              onClick={handleGoogleWallet}
              disabled={addingToWallet === "google"}
              className="inline-flex items-center justify-center gap-3 w-full px-5 py-4 rounded-3xl border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {addingToWallet === "google" ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <GoogleWalletIcon />
              )}
              <div className="text-left">
                <p className="text-white/50 text-[10px] leading-none mb-0.5">
                  {addingToWallet === "google" ? "Opening…" : "Save to"}
                </p>
                <p className="text-white font-semibold text-sm leading-none">Google Wallet</p>
              </div>
            </button>
          </div>

          {/* Payment History */}
          {invoice?.payments && invoice.payments.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mt-4 space-y-4">
              <h3 className="text-lg font-semibold text-white">Payment History</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm text-gray-300">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-400 text-xs uppercase tracking-wider">
                      <th className="py-2">Date</th>
                      <th className="py-2">Amount</th>
                      <th className="py-2">Method</th>
                      <th className="py-2 text-right">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {invoice.payments.map((p: any, idx: number) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 font-medium text-white">{p.date}</td>
                        <td className="py-3 text-green-400 font-semibold">{formatMoney(p.amount, invoice?.currency)}</td>
                        <td className="py-3">{p.method}</td>
                        <td className="py-3 text-gray-400 text-right">{p.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pay Modal */}
      {invoice && (
        <PayModal
          isOpen={isPayModalOpen}
          onClose={() => setIsPayModalOpen(false)}
          invoice={{
            invoice_id: invoice.invoice_id,
            project_name: invoice.project_name,
            total_due: totalDue,
            currency: invoice.currency,
          }}
        />
      )}
    </div>
  );
}