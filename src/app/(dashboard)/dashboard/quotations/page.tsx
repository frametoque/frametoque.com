"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { 
  NotepadTextDashed, Calendar, Tag, Check, ChevronDown, ChevronUp, AlertCircle, Download
} from "lucide-react";

interface QuotationItem {
  id: number;
  description: string;
  quantity: number;
  price: string | number;
  total: string | number;
}

interface Quotation {
  id: number;
  date: string;
  amount: string | number;
  clientId: string;
  description: string;
  category: string;
  paymentMethod: string;
  status: string;
  projectConfirmed: boolean;
  advance: string | number;
  totalDue: string | number;
  items: QuotationItem[];
}

const statusStyles: Record<string, string> = {
  "client-draft": "bg-slate-500/20 text-slate-400 border-slate-500/30",
  "sent": "bg-brand-500/20 text-brand-400 border-brand-500/30",
  "accepted": "bg-green-500/20 text-green-400 border-green-500/30",
  "declined": "bg-red-500/20 text-red-400 border-red-500/30",
  "expired": "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const statusLabels: Record<string, string> = {
  "client-draft": "Draft",
  "sent": "Sent",
  "accepted": "Accepted",
  "declined": "Declined",
  "expired": "Expired",
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default function ClientQuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedQuoteId, setExpandedQuoteId] = useState<number | null>(null);
  const { user, isLoaded: isUserLoaded } = useUser();

  useEffect(() => {
    if (isUserLoaded && user?.primaryEmailAddress?.emailAddress) {
      const fetchQuotations = async () => {
        try {
          setLoading(true);
          const email = user.primaryEmailAddress.emailAddress;
          const res = await fetch(`/api/quotation?user_email=${encodeURIComponent(email)}`, { cache: "no-store" });
          if (!res.ok) throw new Error("Failed to fetch quotations");
          const data = await res.json();
          setQuotations(data);
        } catch (err: any) {
          setError(err.message);
          console.error("Error fetching quotations:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchQuotations();
    } else if (isUserLoaded && !user) {
      setLoading(false);
      setError("Please sign in to view your quotations");
    }
  }, [isUserLoaded, user]);

  const toggleExpand = (id: number) => {
    setExpandedQuoteId((prev) => (prev === id ? null : id));
  };

  const handleDownloadPDF = async (q: Quotation) => {
    try {
      const jsPDF = (await import("jspdf")).default;
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Colors
      const primaryColor = [31, 169, 236]; 
      const darkColor = [31, 41, 55]; 
      const grayColor = [107, 114, 128]; 

      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text("FrameToque", 20, 25);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
      doc.text("Digital Media", 20, 30);
      doc.text("contact@frametoque.online | +94 70 190 1461", 20, 35);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("QUOTATION", 140, 25);

      // Divider
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.5);
      doc.line(20, 42, 190, 42);

      // Info Block
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text("QUOTATION DETAILS", 20, 52);
      doc.text("PREPARED FOR", 110, 52);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text(`Reference: QT-${String(q.id).padStart(5, "0")}`, 20, 58);
      doc.text(`Date: ${formatDate(q.date)}`, 20, 64);
      doc.text(`Status: ${statusLabels[q.status] || q.status}`, 20, 70);

      const clientEmail = user?.primaryEmailAddress?.emailAddress || "Client";
      doc.text(`Email: ${clientEmail}`, 110, 58);
      doc.text(`Payment: ${q.paymentMethod || "Bank Transfer"}`, 110, 64);

      // Table Header Background
      doc.setFillColor(243, 244, 246);
      doc.rect(20, 82, 170, 8, "F");

      // Table Header Text
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text("Description", 22, 87);
      doc.text("Qty", 125, 87, { align: "center" });
      doc.text("Unit Price (LKR)", 150, 87, { align: "right" });
      doc.text("Total (LKR)", 188, 87, { align: "right" });

      // Rows
      let y = 96;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);

      q.items.forEach((item) => {
        const descText = doc.splitTextToSize(item.description, 95);
        doc.text(descText, 22, y);
        
        doc.text(String(item.quantity), 125, y, { align: "center" });
        doc.text(parseFloat(String(item.price)).toLocaleString("en-US"), 150, y, { align: "right" });
        doc.text(parseFloat(String(item.total)).toLocaleString("en-US"), 188, y, { align: "right" });

        y += descText.length * 5 + 2;

        doc.setDrawColor(243, 244, 246);
        doc.setLineWidth(0.3);
        doc.line(20, y - 4, 190, y - 4);
      });

      // Totals
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
      doc.text("Subtotal:", 145, y, { align: "right" });
      doc.text("Advance Paid:", 145, y + 6, { align: "right" });
      doc.text("Total Due:", 145, y + 12, { align: "right" });

      doc.setFont("helvetica", "bold");
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text(`${parseFloat(String(q.amount)).toLocaleString("en-US")} LKR`, 188, y, { align: "right" });
      doc.text(`${parseFloat(String(q.advance || 0)).toLocaleString("en-US")} LKR`, 188, y + 6, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(`${parseFloat(String(q.totalDue)).toLocaleString("en-US")} LKR`, 188, y + 12, { align: "right" });

      // Footer
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
      doc.text("Thank you for choosing FrameToque Digital Media!", 105, 275, { align: "center" });

      doc.save(`Quotation_QT-${String(q.id).padStart(5, "0")}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  const PageShell = ({ children }: { children: React.ReactNode }) => (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">My</span>
          <span className="bg-gradient-to-r from-brand-400 to-brand-500 bg-clip-text text-transparent">&nbsp;Quotations</span>
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl">
          Track the status of quotations you have received.
        </p>
      </div>
      {children}
    </div>
  );

  if (!isUserLoaded || loading) {
    return (
      <PageShell>
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 animate-pulse space-y-4">
          <div className="h-6 bg-white/10 rounded-full w-48 mb-6" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex justify-between items-center py-4 border-b border-white/5 last:border-0">
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-white/10 rounded-full w-1/3" />
                <div className="h-3 bg-white/5 rounded-full w-1/4" />
              </div>
              <div className="h-6 bg-white/10 rounded-full w-20" />
            </div>
          ))}
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-6 text-center flex items-center justify-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <p className="text-red-400">{error}</p>
        </div>
      </PageShell>
    );
  }

  if (quotations.length === 0) {
    return (
      <PageShell>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-12 text-center">
          <NotepadTextDashed className="w-16 h-16 text-gray-600 mx-auto mb-6" />
          <h3 className="text-2xl font-semibold text-white mb-2">No Quotations Yet</h3>
          <p className="text-gray-400 max-w-md mx-auto">
            We will publish your project quotations here once generated by the admin.
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="space-y-4">
        {quotations.map((q) => {
          const isExpanded = expandedQuoteId === q.id;
          const statusClass = statusStyles[q.status] || "bg-slate-500/20 text-slate-400 border-slate-500/30";
          const statusLabel = statusLabels[q.status] || q.status;

          return (
            <div
              key={q.id}
              className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden transition-all duration-300 hover:border-white/20"
            >
              {/* Header Accordion Item */}
              <div
                onClick={() => toggleExpand(q.id)}
                className="p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 cursor-pointer select-none"
              >
                <div className="space-y-2 flex-grow">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xl font-bold text-white tracking-tight">
                      QT-{String(q.id).padStart(5, "0")}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusClass}`}>
                      {statusLabel}
                    </span>
                    {q.projectConfirmed && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Confirmed
                      </span>
                    )}
                  </div>

                  <p className="text-slate-300 text-sm line-clamp-2 max-w-2xl">
                    {q.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {formatDate(q.date)}
                    </span>
                    {q.category && (
                      <span className="flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5 text-slate-500" />
                        {q.category}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto border-t border-white/5 md:border-t-0 pt-4 md:pt-0">
                  <div className="text-right">
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Total Amount</p>
                    <p className="text-2xl font-black bg-gradient-to-r from-brand-400 to-brand-500 bg-clip-text text-transparent">
                      {parseFloat(String(q.amount)).toLocaleString("en-US")} <span className="text-xs text-slate-400 font-medium">LKR</span>
                    </p>
                  </div>
                  <div className="p-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-colors">
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-white" /> : <ChevronDown className="w-5 h-5 text-white" />}
                  </div>
                </div>
              </div>

              {/* Collapsible Content */}
              {isExpanded && (
                <div className="border-t border-white/10 bg-black/40 p-6 sm:p-8 space-y-6">
                  {/* Overview Action Bar */}
                  <div className="flex justify-between items-center border-b border-white/5 pb-4 gap-4">
                    <h4 className="font-bold text-white text-base">Quotation Overview</h4>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadPDF(q);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-semibold transition-all active:scale-95 flex-shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" /> Download PDF
                    </button>
                  </div>

                  {/* Summary Block */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 border-b border-white/5 pb-6 text-sm">
                    <div>
                      <p className="text-slate-500 mb-1">Payment Method</p>
                      <p className="font-semibold text-white">{q.paymentMethod || "Bank Transfer"}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Advance Paid</p>
                      <p className="font-semibold text-white">
                        {parseFloat(String(q.advance || 0)).toLocaleString("en-US")} LKR
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Total Due</p>
                      <p className="font-semibold text-brand-400">
                        {parseFloat(String(q.totalDue)).toLocaleString("en-US")} LKR
                      </p>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-white text-base">Quotation Items</h4>
                    <div className="overflow-x-auto border border-white/5 rounded-2xl">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-white/5 text-slate-400 text-xs uppercase font-semibold">
                            <th className="p-4">Description</th>
                            <th className="p-4 text-center">Qty</th>
                            <th className="p-4 text-right">Unit Price</th>
                            <th className="p-4 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm text-slate-300">
                          {q.items?.map((item) => (
                            <tr key={item.id} className="hover:bg-white/5 transition-colors">
                              <td className="p-4 font-medium text-white">{item.description}</td>
                              <td className="p-4 text-center">{item.quantity}</td>
                              <td className="p-4 text-right">
                                {parseFloat(String(item.price)).toLocaleString("en-US")} LKR
                              </td>
                              <td className="p-4 text-right font-semibold text-white">
                                {parseFloat(String(item.total)).toLocaleString("en-US")} LKR
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </PageShell>
  );
}
