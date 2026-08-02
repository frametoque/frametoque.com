"use client";

import { useEffect, useState, useMemo } from "react";
import { FileText, CheckCircle, Clock, AlertCircle, Search, Eye, Edit2, Send, Download, Trash2, DollarSign, X, Loader2, Upload, Image as ImageIcon, FileText as FileIcon } from "lucide-react";
import Link from "next/link";
import { getInvoices, deleteInvoice, recordInvoicePayment, adminUploadPaymentSlip } from "../actions/actions";
import AnimatedNumber from "../components/AnimatedNumber";

const filters = ["All", "Fully Paid", "Partially Paid", "On Review", "Overdue", "Advance-Paid", "Unpaid"];

const formatLKR = (amount: number) => {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
  }).format(amount || 0);
};

export default function InvoicesPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Payment recording modal states
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [isAdvance, setIsAdvance] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);

  // Payment slip upload states
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [uploadingSlip, setUploadingSlip] = useState(false);
  const [includeSlip, setIncludeSlip] = useState(false);
  const [convertingPdf, setConvertingPdf] = useState(false);

  const openRecordPaymentModal = (invoice: any) => {
    setSelectedInvoice(invoice);
    setPaidAmount(invoice.amount.toString());
    setPaymentMethod("Bank Transfer");
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setIsAdvance(false);
    setSlipFile(null);
    setSlipPreview(null);
    setIncludeSlip(false);
    setPaymentModalOpen(true);
  };

  const convertPdfToImage = async (file: File): Promise<File> => {
    if (file.type !== "application/pdf") return file;

    if (!(window as any).pdfjsLib) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load PDF.js"));
        document.head.appendChild(script);
      });
    }

    const pdfjsLib = (window as any).pdfjsLib;
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);

    const scale = 2.0;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not create canvas context");

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: context, viewport }).promise;

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Failed to convert PDF canvas to blob"));
          return;
        }
        const newFilename = file.name.replace(/\.[^/.]+$/, "") + ".png";
        const convertedFile = new File([blob], newFilename, { type: "image/png" });
        resolve(convertedFile);
      }, "image/png");
    });
  };

  const handleSlipFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      alert('Please select an image or PDF file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    // Handle PDF conversion
    if (file.type === "application/pdf") {
      setConvertingPdf(true);
      convertPdfToImage(file)
        .then((convertedFile) => {
          setSlipFile(convertedFile);
          setIncludeSlip(true);
          const reader = new FileReader();
          reader.onloadend = () => {
            setSlipPreview(reader.result as string);
          };
          reader.readAsDataURL(convertedFile);
        })
        .catch((err) => {
          console.error(err);
          alert("Failed to convert PDF to image. Please upload a standard image file.");
          setSlipFile(null);
          setSlipPreview(null);
          setIncludeSlip(false);
        })
        .finally(() => {
          setConvertingPdf(false);
        });
      return;
    }

    // Handle image files
    setSlipFile(file);
    setIncludeSlip(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setSlipPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeSlipFile = () => {
    setSlipFile(null);
    setSlipPreview(null);
    setIncludeSlip(false);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setSavingPayment(true);
    try {
      // Step 1: Record the payment
      await recordInvoicePayment(
        selectedInvoice.id,
        parseFloat(paidAmount) || 0,
        paymentMethod,
        paymentDate,
        isAdvance
      );

      // Step 2: Upload slip if included (only for Bank Transfer)
      if (includeSlip && slipFile && paymentMethod === "Bank Transfer") {
        setUploadingSlip(true);
        try {
          // Convert file to base64
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(slipFile);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
          });

          // Upload the slip (auto-approved)
          const slipResult = await adminUploadPaymentSlip(
            selectedInvoice.id,
            base64,
            parseFloat(paidAmount) || 0
          );

          if (!slipResult.success) {
            console.warn("Failed to upload slip:", slipResult.error);
          }
        } catch (slipErr) {
          console.warn("Failed to upload payment slip:", slipErr);
        } finally {
          setUploadingSlip(false);
        }
      }

      setPaymentModalOpen(false);
      setSelectedInvoice(null);
      await loadData();
    } catch (err) {
      console.error("Failed to record payment:", err);
      alert("Failed to record payment: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSavingPayment(false);
    }
  };

  const loadData = async () => {
    try {
      const res = await getInvoices();
      setData(res);
    } catch (e) {
      console.error("Failed to load invoices", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await getInvoices();
        if (!cancelled) {
          setData(res);
          setLoading(false);
        }
      } catch (e) {
        console.error("Failed to load invoices", e);
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this invoice?")) {
      try {
        await deleteInvoice(id);
        await loadData();
      } catch (e) {
        console.error("Failed to delete", e);
      }
    }
  };

  const handleSend = (id: string) => {
    const url = `${window.location.origin}/dashboard/invoice/${id}`;
    navigator.clipboard.writeText(url);
    alert("Invoice link copied to clipboard: " + url);
  };

  const filteredInvoices = useMemo(() => data?.items?.filter((row: any) => {
    let statusMatch = false;
    const rowStatus = row.status?.toLowerCase() || '';
    if (activeFilter === "All") {
      statusMatch = true;
    } else if (activeFilter === "Paid") {
      statusMatch = rowStatus === "paid" || rowStatus === "fully paid";
    } else if (activeFilter === "Fully Paid") {
      statusMatch = rowStatus === "fully paid";
    } else if (activeFilter === "Partially Paid") {
      statusMatch = rowStatus === "partially paid";
    } else if (activeFilter === "On Review") {
      statusMatch = rowStatus === "on review";
    } else {
      statusMatch = rowStatus === activeFilter.toLowerCase();
    }
    const searchMatch =
      row.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.id.toLowerCase().includes(searchTerm.toLowerCase());
    return statusMatch && searchMatch;
  }) ?? [], [data, activeFilter, searchTerm]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-6 flex items-center gap-4 animate-pulse">
              <div className="p-4 rounded-2xl bg-white/5 w-14 h-14" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-white/5 rounded-full w-24" />
                <div className="h-6 bg-white/10 rounded-full w-32" />
              </div>
            </div>
          ))}
        </div>
        
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 animate-pulse space-y-4">
          <div className="h-6 bg-white/10 rounded-full w-48 mb-6" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex justify-between items-center py-4 border-b border-white/5 last:border-0">
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-white/10 rounded-full w-1/3" />
                <div className="h-3 bg-white/5 rounded-full w-1/4" />
              </div>
              <div className="h-6 bg-white/10 rounded-full w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }



  const stats = [
    { label: "Total Issued", value: data.totalIssued.toString(), icon: FileText, color: "text-brand-400", bg: "bg-brand-400/10" },
    { label: "Paid", value: data.paid.toString(), icon: CheckCircle, color: "text-green-400", bg: "bg-green-400/10" },
    { label: "Unpaid", value: data.pending.toString(), icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10" },
    { label: "Total Due", value: formatLKR(data.totalDue), icon: AlertCircle, color: "text-red-400", bg: "bg-red-400/10" },
  ];

  return (
    <div className="space-y-6">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex items-center gap-4 hover:bg-white/10 transition-colors">
            <div className={`p-4 rounded-2xl ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-gray-400 text-sm">{stat.label}</p>
              <p className="text-2xl font-semibold">
                <AnimatedNumber value={stat.value} />
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Side: Search & Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-full pl-11 pr-4 py-2.5 outline-none focus:border-brand-500 transition-colors text-sm text-white"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeFilter === f
                    ? "bg-white text-black"
                    : "bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Create Button */}
        <Link
          href="/admin/invoices/new"
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-3xl font-semibold transition-colors w-full sm:w-auto self-end lg:self-auto"
        >
          <FileText className="w-5 h-5" />
          Create Invoice
        </Link>
      </div>

      {/* Table */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 text-sm">
                <th className="p-4 font-medium">Invoice #</th>
                <th className="p-4 font-medium">Client</th>
                <th className="p-4 font-medium">Service</th>
                <th className="p-4 font-medium">Amount</th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Work Status</th>
                <th className="p-4 font-medium">Payment Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredInvoices.map((row: any) => {
                const paymentStatus = row.status?.toLowerCase() || '';
                const workStatus = row.work_status?.toLowerCase() || '';

                let paymentColor = "text-gray-400 bg-gray-400/10 border-gray-400/20";
                if (paymentStatus === 'fully paid') paymentColor = "text-green-400 bg-green-400/10 border-green-400/20";
                else if (paymentStatus === 'on review') paymentColor = "text-amber-400 bg-amber-400/10 border-amber-400/20";
                else if (paymentStatus === 'advance-paid') paymentColor = "text-blue-400 bg-blue-400/10 border-blue-400/20";
                else if (paymentStatus === 'unpaid' || paymentStatus === 'pending') paymentColor = "text-amber-400 bg-amber-400/10 border-amber-400/20";
                else if (paymentStatus === 'overdue') paymentColor = "text-red-400 bg-red-400/10 border-red-400/20";
                else if (paymentStatus === 'partially paid') paymentColor = "text-indigo-400 bg-indigo-400/10 border-indigo-400/20";

                let workColor = "text-gray-400 bg-gray-400/10 border-gray-400/20";
                if (workStatus === 'completed') workColor = "text-green-400 bg-green-400/10 border-green-400/20";
                else if (workStatus === 'in progress') workColor = "text-blue-400 bg-blue-400/10 border-blue-400/20";
                else if (workStatus === 'pending') workColor = "text-amber-400 bg-amber-400/10 border-amber-400/20";

                return (
                  <tr key={row.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <Link href={`/admin/invoice/${row.id}`} className="font-semibold text-brand-400 hover:text-brand-300 transition-colors">
                        {row.id}
                      </Link>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-medium text-white">{row.client}</div>
                      {row.clientEmail && (
                        <div className="text-xs text-gray-500 mt-0.5">{row.clientEmail}</div>
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-300">{row.service}</td>
                    <td className="p-4">
                      <div className="font-semibold text-white">{formatLKR(row.amount)}</div>
                      {paymentStatus !== 'fully paid' && (
                        <div className={`text-xs mt-0.5 font-medium ${
                          paymentStatus === 'unpaid' || paymentStatus === 'pending' || paymentStatus === 'overdue'
                            ? 'text-gray-400'
                            : 'text-indigo-400'
                        }`}>
                          Due: {formatLKR(row.total_due)}
                        </div>
                      )}
                    </td>
                    <td className={`p-4 text-sm ${row.overdue ? 'text-red-400 font-semibold' : 'text-gray-300'}`}>
                      {row.due}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 text-[10px] uppercase font-bold rounded-full border ${workColor}`}>
                        {row.work_status || '—'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 text-[10px] uppercase font-bold rounded-full border ${paymentColor}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-1">
                        {row.status?.toLowerCase() !== 'paid' && row.status?.toLowerCase() !== 'fully paid' && (
                          <button onClick={() => openRecordPaymentModal(row)} className="p-2 hover:bg-green-400/10 rounded-xl transition-colors text-gray-400 hover:text-green-400" title="Create Income from Invoice">
                            <DollarSign className="w-4 h-4" />
                          </button>
                        )}
                        <Link href={`/admin/invoice/${row.id}`} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white" title="View">
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link href={`/admin/invoices/${row.id}/edit`} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        <button onClick={() => handleSend(row.id)} className="p-2 hover:bg-brand-400/10 rounded-xl transition-colors text-gray-400 hover:text-brand-400" title="Copy Link">
                          <Send className="w-4 h-4" />
                        </button>
                        <Link href={`/admin/invoice/${row.id}?download=true`} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white" title="Download PDF">
                          <Download className="w-4 h-4" />
                        </Link>
                        <button onClick={() => handleDelete(row.id)} className="p-2 hover:bg-red-400/10 rounded-xl transition-colors text-gray-400 hover:text-red-400" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-gray-500">No invoices found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Payment Modal */}
      {paymentModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-black border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-semibold text-white">Create Income from Invoice</h2>
              <button onClick={() => setPaymentModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
              <div className="text-sm text-gray-400 space-y-1 bg-white/5 p-4 rounded-2xl border border-white/5">
                <p><span className="font-semibold text-gray-300">Invoice:</span> {selectedInvoice.id}</p>
                <p><span className="font-semibold text-gray-300">Client:</span> {selectedInvoice.client}</p>
                <p><span className="font-semibold text-gray-300">Service:</span> {selectedInvoice.service}</p>
                <p><span className="font-semibold text-gray-300">Total Amount:</span> {formatLKR(selectedInvoice.amount)}</p>
              </div>

              <div className="space-y-1">
                <label className="text-sm text-gray-400 block font-medium">Paid Amount (LKR)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm text-gray-400 block font-medium">Payment Date</label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm text-gray-400 block font-medium">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors text-white appearance-none"
                >
                  <option value="Bank Transfer" className="bg-black text-white">Bank Transfer</option>
                  <option value="Stripe" className="bg-black text-white">Stripe</option>
                  <option value="PayPal" className="bg-black text-white">PayPal</option>
                  <option value="Cash" className="bg-black text-white">Cash</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2 pb-2">
                <input
                  type="checkbox"
                  id="isAdvance"
                  checked={isAdvance}
                  onChange={(e) => setIsAdvance(e.target.checked)}
                  className="w-4 h-4 rounded border-white/10 bg-white/5 text-brand-600 focus:ring-brand-500 focus:ring-offset-black"
                />
                <label htmlFor="isAdvance" className="text-sm text-gray-300 font-medium select-none cursor-pointer">
                  Payment is advance
                </label>
              </div>

              {/* Payment Slip Upload Section */}
              <div className="pt-2 border-t border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm text-gray-300 font-medium flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Upload Payment Slip (Optional)
                  </label>
                  {includeSlip && (
                    <button
                      type="button"
                      onClick={removeSlipFile}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {convertingPdf ? (
                  <div className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-brand-500/30 rounded-xl bg-brand-500/5">
                    <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
                    <span className="text-sm text-brand-400">Converting PDF to image...</span>
                  </div>
                ) : !includeSlip ? (
                  <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-brand-500/50 hover:bg-brand-500/5 transition-all">
                    <Upload className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-400">Click to upload slip image or PDF</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleSlipFileChange}
                      className="hidden"
                    />
                  </label>
                ) : slipPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-white/10">
                    <img src={slipPreview} alt="Slip preview" className="w-full h-40 object-cover" />
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 rounded-lg text-xs text-white flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      {slipFile?.name}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-xl">
                    <FileIcon className="w-5 h-5 text-brand-400" />
                    <span className="text-sm text-gray-300 flex-1 truncate">{slipFile?.name}</span>
                    <span className="text-xs text-gray-500">
                      {slipFile ? (slipFile.size / 1024 / 1024).toFixed(2) + ' MB' : ''}
                    </span>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Max file size: 10MB. Supported: Images, PDF
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/10 justify-end">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="px-5 py-2.5 border border-white/10 hover:bg-white/5 text-gray-300 rounded-3xl text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPayment}
                  className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-3xl text-sm font-semibold transition-colors"
                >
                  {savingPayment && <Loader2 className="w-4 h-4 animate-spin" />}
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}