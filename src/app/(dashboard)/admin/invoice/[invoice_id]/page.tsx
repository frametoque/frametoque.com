"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Download, ArrowLeft, Loader2, FileText, Calendar, Tag, Briefcase, Eye } from "lucide-react";
import Link from "next/link";
import InvoiceDocument from "@/app/(dashboard)/dashboard/invoice/InvoiceDocument";
import { getInvoiceByIdAdmin } from "../../actions/actions";

const workStatusStyles = {
  "in progress": "bg-brand-500/20 text-brand-400 border-brand-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

const paymentStatusStyles = {
  paid: "bg-green-500/20 text-green-400 border-green-500/30",
  unpaid: "bg-red-500/20 text-red-400 border-red-500/30",
};

const formatDate = (dateString: string) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
};

export default function AdminInvoicePage() {
  const { invoice_id } = useParams();
  const searchParams = useSearchParams();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [autoDownloaded, setAutoDownloaded] = useState(false);
  const hiddenRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (invoice && searchParams.get('download') === 'true' && !autoDownloaded) {
      setAutoDownloaded(true);
      setTimeout(() => {
        handleDownload();
      }, 500); // Small delay to ensure styles and fonts are fully loaded
    }
  }, [invoice, searchParams, autoDownloaded]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;
      const element = hiddenRef.current?.querySelector("#invoice-render");
      if (!element) throw new Error("Invoice element not found");
      const canvas = await html2canvas(element as HTMLElement, {
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
      pdf.save(`${invoice_id}.pdf`);
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

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-3xl bg-gradient-to-r from-brand-600 to-brand-700 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {downloading ? "Generating..." : "Download PDF"}
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* Right — Invoice Details */}
        <div className="flex-1 space-y-4 w-full">

          {/* Project Name */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
            <h1 className="text-2xl font-bold text-white mb-1">{invoice.project_name || "Untitled Project"}</h1>
            <p className="text-gray-400 text-sm">{invoice.billing_address}</p>
            <p className="text-gray-400 text-sm mt-1 flex items-center gap-2">Client Email: <span className="text-white">{invoice.user_email}</span></p>
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

          {/* Line Items Table */}
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
                      parseFloat(invoice.subtotal || "0") -
                      parseFloat(invoice.discount || "0") -
                      parseFloat(invoice.advance || "0")
                    ).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Hidden full-size render for PDF capture */}
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