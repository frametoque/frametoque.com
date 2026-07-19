"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Download, ArrowLeft, Loader2, FileText, Calendar, Tag, Briefcase } from "lucide-react";
import Link from "next/link";
import { generateInvoicePDF } from "@/app/(dashboard)/dashboard/invoice/InvoiceDocument";
import { getInvoiceByIdAdmin } from "../../actions/actions";

const workStatusStyles = {
  "in progress": "bg-brand-500/20 text-brand-400 border-brand-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

const paymentStatusStyles = {
  paid: "bg-green-500/20 text-green-400 border-green-500/30",
  "fully paid": "bg-green-500/20 text-green-400 border-green-500/30",
  unpaid: "bg-red-500/20 text-red-400 border-red-500/30",
  pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "advance-paid": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "partially paid": "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
};

const formatDate = (dateString: string) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
};

const formatMoney = (value: any, currency = "LKR") => {
  if (!value || isNaN(parseFloat(value))) return "N/A";
  const currencySymbol = currency === "LKR" ? "Rs." : currency;
  return `${currencySymbol} ${parseFloat(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export default function AdminInvoicePage() {
  const { invoice_id } = useParams();
  const searchParams = useSearchParams();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [autoDownloaded, setAutoDownloaded] = useState(false);
  const downloadTriggeredRef = useRef(false);

  useEffect(() => {
    if (!invoice_id) return;
    const fetchInvoice = async () => {
      try {
        const data = await getInvoiceByIdAdmin(invoice_id as string);
        if (!data) throw new Error("Invoice not found");
        setInvoice(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [invoice_id]);

  // Auto-download if ?download=true
  useEffect(() => {
    if (invoice && searchParams.get("download") === "true" && !downloadTriggeredRef.current) {
      downloadTriggeredRef.current = true;
      setAutoDownloaded(true);
      handleDownload();
    }
  }, [invoice, searchParams]);

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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-6 text-center">
        <p className="text-red-400">{error || "Invoice not found"}</p>
        <Link href="/admin/invoices" className="text-brand-400 text-sm mt-3 inline-block">
          ← Back to Invoices
        </Link>
      </div>
    );
  }

  const lineItems = invoice.items || [];
  const currencyLabel = invoice.currency === "LKR" ? "Rs." : invoice.currency;
  const subtotal = parseFloat(invoice.subtotal || 0);
  const discount = parseFloat(invoice.discount || 0);
  const advance = parseFloat(invoice.advance || 0);
  const taxRate = parseFloat(invoice.tax_rate || 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = parseFloat(invoice.total || subtotal + taxAmount - discount);
  const totalDue = parseFloat(invoice.total_due || total - advance);

  return (
    <div className="space-y-6 pb-20">

      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Link
          href="/admin/invoices"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Invoices
        </Link>

        <button
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-3xl bg-gradient-to-r from-brand-600 to-brand-700 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {downloading ? "Generating PDF..." : "Download PDF"}
        </button>
      </div>

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 space-y-4 w-full">

          {/* Project Name */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
            <h1 className="text-2xl font-bold text-white mb-1">{invoice.project_name || "Untitled Project"}</h1>
            <p className="text-gray-400 text-sm">Invoice #{invoice.invoice_id}</p>
            <p className="text-gray-400 text-sm">{invoice.billing_address}</p>
            <p className="text-gray-400 text-sm mt-1 flex items-center gap-2">
              Client Email: <span className="text-white">{invoice.user_email}</span>
            </p>
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
                <span className={`px-3 py-1 text-xs font-medium rounded-full border ${workStatusStyles[invoice.work_status as keyof typeof workStatusStyles] || workStatusStyles.pending}`}>
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
                <span className={`px-3 py-1 text-xs font-medium rounded-full border ${paymentStatusStyles[invoice.payment_status as keyof typeof paymentStatusStyles] || paymentStatusStyles.unpaid}`}>
                  {invoice.payment_status || "unpaid"}
                </span>
              </div>
            </div>
          </div>

          {/* Line Items */}
          {lineItems.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden mt-4">
              <div className="grid grid-cols-3 px-5 py-3 border-b border-white/10 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <span>Description</span>
                <span className="text-center">Price</span>
                <span className="text-right">Total</span>
              </div>
              {lineItems.map((item: any, i: number) => (
                <div key={i} className="grid grid-cols-3 px-5 py-4 border-b border-white/5 last:border-0">
                  <span className="text-white text-sm">{item.description}</span>
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

              {/* Billing Summary */}
              <div className="px-5 py-4 space-y-3 border-t border-white/10 bg-white/5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Subtotal</span>
                  <span className="text-white font-semibold">{formatMoney(subtotal, invoice.currency)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Discount</span>
                    <span className="text-red-400">− {formatMoney(discount, invoice.currency)}</span>
                  </div>
                )}
                {taxRate > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Tax ({taxRate}%)</span>
                    <span className="text-white font-semibold">+ {formatMoney(taxAmount, invoice.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-white/10">
                  <span className="text-gray-300">Total</span>
                  <span className="text-white font-semibold">{formatMoney(total, invoice.currency)}</span>
                </div>
                {advance > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Advance Paid</span>
                    <span className="text-green-400">− {formatMoney(advance, invoice.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-white/10">
                  <span className="text-white font-semibold">Total Due</span>
                  <span className="text-white font-bold text-lg">{formatMoney(totalDue, invoice.currency)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Payment History */}
          {invoice.payments && invoice.payments.length > 0 && (
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
                        <td className="py-3 text-green-400 font-semibold">{formatMoney(p.amount, invoice.currency)}</td>
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

    </div>
  );
}