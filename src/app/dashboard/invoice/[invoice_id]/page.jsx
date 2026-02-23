"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Download, ArrowLeft, Loader2, FileText, Calendar, Tag, Briefcase } from "lucide-react";
import Link from "next/link";
import InvoiceDocument from "@/app/dashboard/invoice/InvoiceDocument";

const workStatusStyles = {
  "in progress": "bg-blue-500/20 text-blue-400 border-blue-500/30",
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

export default function InvoicePage() {
  const { invoice_id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
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

      // Target the hidden full-resolution render (794x1123 = A4 at 96dpi)
      const element = hiddenRef.current?.querySelector("#invoice-render");
      if (!element) throw new Error("Invoice element not found");

      // Capture at 3x scale → ~2380x3369 pixels → near-300dpi quality
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

      // High-quality JPEG
      const imgData = canvas.toDataURL("image/jpeg", 0.92);

      // Create A4 PDF (210 x 297mm)
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pageWidth = pdf.internal.pageSize.getWidth();   // 210mm
      const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm

      pdf.addImage(imgData, "JPEG", 0, 0, pageWidth, pageHeight);
      pdf.save(`Invoice-${invoice_id}.pdf`);

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
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
        <p className="text-red-400">{error}</p>
        <Link href="/dashboard/projects" className="text-blue-400 text-sm mt-3 inline-block">
          ← Back to Projects
        </Link>
      </div>
    );
  }

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
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {downloading ? "Generating PDF..." : "Download PDF"}
        </button>
      </div>

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/*
          ── Invoice Preview ──
        */}
        {/* <div className="shrink-0">
          <div
            className="rounded-2xl border border-white/10 shadow-xl overflow-hidden"
            style={{ width: "340px", height: "481px", background: "#fff" }}
          >
            <div
              style={{
                transform: "scale(0.4282)",
                transformOrigin: "top left",
                width: "790px",
                height: "1123px",
                pointerEvents: "none",
              }}
            >
              <InvoiceDocument invoice={invoice} />
            </div>
          </div>
          <p className="text-gray-500 text-xs text-center mt-2">
            Preview only — download for full quality
          </p>
        </div> */}

        {/* Right — Invoice Details */}
       {/* Right — Invoice Details */}
<div className="flex-1 space-y-4">

  {/* Project Name */}
  <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
    <h1 className="text-2xl font-bold text-white mb-1">{invoice.project_name || "Untitled Project"}</h1>
    <p className="text-gray-400 text-sm">Invoice for services rendered by Frame Toque Digital</p>
  </div>

  {/* Details Grid */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-start gap-4">
      <div className="p-2 rounded-lg bg-blue-500/10">
        <FileText className="w-5 h-5 text-blue-400" />
      </div>
      <div>
        <p className="text-gray-400 text-xs mb-1">Invoice ID</p>
        <p className="text-white font-semibold">{invoice.invoice_id}</p>
      </div>
    </div>

    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-start gap-4">
      <div className="p-2 rounded-lg bg-blue-500/10">
        <Calendar className="w-5 h-5 text-blue-400" />
      </div>
      <div>
        <p className="text-gray-400 text-xs mb-1">Date</p>
        <p className="text-white font-semibold">{formatDate(invoice.date)}</p>
      </div>
    </div>

    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-start gap-4">
      <div className="p-2 rounded-lg bg-blue-500/10">
        <Briefcase className="w-5 h-5 text-blue-400" />
      </div>
      <div>
        <p className="text-gray-400 text-xs mb-2">Work Status</p>
        <span className={`px-3 py-1 text-xs font-medium rounded-full border ${workStatusStyles[invoice.work_status] || workStatusStyles.pending}`}>
          {invoice.work_status || "pending"}
        </span>
      </div>
    </div>

    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-start gap-4">
      <div className="p-2 rounded-lg bg-blue-500/10">
        <Tag className="w-5 h-5 text-blue-400" />
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
  {[
    { desc: invoice.description_1, price: invoice.price_1, total: invoice.total_1 },
    { desc: invoice.description_2, price: invoice.price_2, total: invoice.total_2 },
    { desc: invoice.description_3, price: invoice.price_3, total: invoice.total_3 },
    { desc: invoice.description_4, price: invoice.price_4, total: invoice.total_4 },
  ].filter(item => item.desc) .length > 0 && (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      <div className="grid grid-cols-3 px-5 py-3 border-b border-white/10 text-xs font-semibold text-gray-400 uppercase tracking-wider">
        <span>Description</span>
        <span className="text-center">Price</span>
        <span className="text-right">Total</span>
      </div>

      {[
        { desc: invoice.description_1, price: invoice.price_1, total: invoice.total_1 },
        { desc: invoice.description_2, price: invoice.price_2, total: invoice.total_2 },
        { desc: invoice.description_3, price: invoice.price_3, total: invoice.total_3 },
        { desc: invoice.description_4, price: invoice.price_4, total: invoice.total_4 },
      ]
        .filter(item => item.desc)
        .map((item, i) => (
          <div key={i} className="grid grid-cols-3 px-5 py-4 border-b border-white/5 last:border-0">
            <span className="text-white text-sm">{item.desc}</span>
            <span className="text-gray-300 text-sm text-center">
             {item.price ? `${invoice.currency === "LKR" ? "Rs." : invoice.currency} ${item.price}` : "-"}
            </span>
            <span className="text-white text-sm text-right font-medium">
              {!isNaN(parseFloat(item.total))
                ? `${invoice.currency === "LKR" ? "Rs." : invoice.currency} ${parseFloat(item.total).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
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
              {invoice.currency === "LKR" ? "Rs." : invoice.currency} {parseFloat(invoice.subtotal).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
        {invoice.discount && parseFloat(invoice.discount) > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Discount</span>
            <span className="text-red-400">
              − {invoice.currency === "LKR" ? "Rs." : invoice.currency} {parseFloat(invoice.discount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
        {invoice.advance && parseFloat(invoice.advance) > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Advance Paid</span>
            <span className="text-green-400">
              − {invoice.currency === "LKR" ? "Rs." : invoice.currency} {parseFloat(invoice.advance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
        <div className="flex justify-between pt-2 border-t border-white/10">
          <span className="text-white font-semibold">Total Due</span>
          <span className="text-white font-bold text-lg">
            {invoice.currency === "LKR" ? "Rs." : invoice.currency} {parseFloat(invoice.total_due || invoice.total).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  )}

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