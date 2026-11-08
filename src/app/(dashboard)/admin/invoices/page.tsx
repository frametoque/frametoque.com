"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import useSWR from "swr";
import { FileText, CheckCircle, Clock, AlertCircle, Search, Eye, Edit2, Send, Download, Trash2, DollarSign, X, Loader2, Upload, Image as ImageIcon, FileText as FileIcon, Link2, Unlink, Globe, Server, ExternalLink } from "lucide-react";
import Link from "next/link";
import { getInvoices, deleteInvoice, recordInvoicePayment, adminUploadPaymentSlip, getInvoiceByIdAdmin, linkInvoiceToEntity, getEntityOptionsForInvoice } from "../actions/actions";
import { getAccounts } from "../actions/accounts";
import AnimatedNumber from "../components/AnimatedNumber";

const filters = ["All", "Fully Paid", "Partially Paid", "On Review", "Overdue", "Advance-Paid", "Unpaid"];

const formatLKR = (amount: number) => {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
  }).format(amount || 0);
};

export default function InvoicesPage() {
  const searchParams = useSearchParams();
  const urlStatus = searchParams.get('status');
  const urlSearch = searchParams.get('client') || searchParams.get('search');
  const [activeFilter, setActiveFilter] = useState(urlStatus || "All");
  const [searchTerm, setSearchTerm] = useState(urlSearch || "");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const s = searchParams.get('status');
    const q = searchParams.get('client') || searchParams.get('search');
    if (s && filters.map(f => f.toLowerCase()).includes(s.toLowerCase())) {
      const match = filters.find(f => f.toLowerCase() === s.toLowerCase());
      if (match) setActiveFilter(match);
    }
    if (q !== null && q !== undefined) {
      setSearchTerm(q);
    }
  }, [searchParams]);

  const handleDownloadPDF = async (row: any) => {
    setDownloadingId(row.id);
    try {
      const invoiceData = await getInvoiceByIdAdmin(row.id.toString());
      if (!invoiceData) {
        alert("Failed to load invoice details");
        return;
      }
      const { generateInvoicePDF } = await import("@/app/(dashboard)/dashboard/invoice/InvoiceDocument");
      const pdfBytes = await generateInvoicePDF(invoiceData);
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${row.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  // Payment recording modal states
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [isAdvance, setIsAdvance] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState("");

  // Payment slip upload states
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [uploadingSlip, setUploadingSlip] = useState(false);
  const [includeSlip, setIncludeSlip] = useState(false);
  const [convertingPdf, setConvertingPdf] = useState(false);

  // Entity Linking modal states
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkingInvoice, setLinkingInvoice] = useState<any>(null);
  const [linkTargetType, setLinkTargetType] = useState<'domain' | 'hosting' | 'none'>('domain');
  const [linkTargetId, setLinkTargetId] = useState<string>("");
  const [loadingEntityOptions, setLoadingEntityOptions] = useState(false);
  const [entityOptions, setEntityOptions] = useState<{ domains: any[]; hosting: any[] }>({ domains: [], hosting: [] });
  const [savingEntityLink, setSavingEntityLink] = useState(false);

  const openLinkModal = async (invoice: any) => {
    setLinkingInvoice(invoice);
    if (invoice.linkedDomain) {
      setLinkTargetType('domain');
      setLinkTargetId(String(invoice.linkedDomain.id));
    } else if (invoice.linkedHosting) {
      setLinkTargetType('hosting');
      setLinkTargetId(String(invoice.linkedHosting.id));
    } else {
      setLinkTargetType('domain');
      setLinkTargetId("");
    }
    setLinkModalOpen(true);
    setLoadingEntityOptions(true);
    try {
      const opts = await getEntityOptionsForInvoice(invoice.id, invoice.clientEmail);
      setEntityOptions(opts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingEntityOptions(false);
    }
  };

  const handleSaveEntityLink = async (targetType: 'domain' | 'hosting' | 'none', targetIdStr?: string) => {
    if (!linkingInvoice) return;
    setSavingEntityLink(true);
    try {
      const targetId = targetType === 'none' ? null : (parseInt(targetIdStr || linkTargetId, 10) || null);
      const res = await linkInvoiceToEntity(linkingInvoice.id, targetType, targetId);
      if (res.success) {
        alert(targetType === 'none' ? "Invoice unlinked successfully!" : "Invoice linked successfully!");
        setLinkModalOpen(false);
        setLinkingInvoice(null);
        await loadData();
      } else {
        alert("Failed to link invoice: " + (res.error || "Unknown error"));
      }
    } catch (err: any) {
      alert("Error linking invoice: " + err.message);
    } finally {
      setSavingEntityLink(false);
    }
  };

  const openRecordPaymentModal = (invoice: any) => {
    setSelectedInvoice(invoice);
    setPaidAmount(invoice.amount.toString());
    setPaymentMethod("Bank Transfer");
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setIsAdvance(false);
    setSlipFile(null);
    setSlipPreview(null);
    setIncludeSlip(false);
    const bankAccounts = accounts.filter(acc => acc.type === 'Bank Account');
    
    // First try the invoice's bank account, then default account, then first bank account
    let defaultAcc = bankAccounts.find(acc => acc.id === invoice.bankAccountId);
    if (!defaultAcc) {
      defaultAcc = bankAccounts.find(acc => acc.isDefault) || bankAccounts[0];
    }
    
    setSelectedAccount(defaultAcc ? defaultAcc.id.toString() : "");
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
        isAdvance,
        undefined,
        selectedAccount ? parseInt(selectedAccount, 10) : null
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

  const fetcher = async () => {
    const [res, accRes] = await Promise.all([getInvoices(10, 0), getAccounts()]);
    return { data: res, accounts: accRes || [] };
  };

  const { data: swrData, isLoading: loading, isValidating, mutate: loadData } = useSWR(
    'invoices',
    fetcher,
    { revalidateOnFocus: true, dedupingInterval: 0 }
  );

  const { data = null as any, accounts = [] as any[] } = swrData || {};

  const [extraItems, setExtraItems] = useState<any[]>([]);
  
  const isOptimisticNew = searchParams.get('optimistic') === 'new';
  const isOptimisticUpdate = searchParams.get('optimistic') === 'update';
  const updateId = searchParams.get('id');

  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    setExtraItems([]);
    setPage(1);
    setHasMore(true);
  }, []);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const currentOffset = (data?.items?.length || 0) + extraItems.length;
      const res = await getInvoices(20, currentOffset);
      if (res.items.length < 20) setHasMore(false);
      setExtraItems(prev => [...prev, ...res.items]);
      setPage(p => p + 1);
    } catch (e) {
      console.error("Failed to load more:", e);
    } finally {
      setLoadingMore(false);
    }
  };

  const loadAll = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const currentOffset = (data?.items?.length || 0) + extraItems.length;
      const res = await getInvoices(5000, currentOffset);
      if (res.items.length < 5000) setHasMore(false);
      setExtraItems(prev => [...prev, ...res.items]);
    } catch (e) {
      console.error("Failed to load all invoices:", e);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if ((activeFilter !== "All" || (searchTerm && searchTerm.trim() !== "")) && hasMore && !loadingMore && data) {
      loadAll();
    }
  }, [activeFilter, searchTerm, hasMore, loadingMore, data]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 500) {
        if (!loadingMore && hasMore) {
          if (activeFilter !== "All" || (searchTerm && searchTerm.trim() !== "")) {
            loadAll();
          } else {
            loadMore();
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadingMore, hasMore, page, activeFilter, searchTerm, data, extraItems]);

  const allInvoiceItems = useMemo(() => {
    const combined = [...(data?.items || []), ...extraItems];
    const seen = new Set();
    return combined.filter(item => {
      if (!item || item.id === undefined || item.id === null) return false;
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [data?.items, extraItems]);

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

  

  const filteredInvoices = useMemo(() => allInvoiceItems.filter((row: any) => {
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
  }), [allInvoiceItems, activeFilter, searchTerm]);

  const stats = [
    { label: "Total Issued", value: (data?.totalIssued ?? 0).toString(), icon: FileText, color: "text-brand-400", bg: "bg-brand-400/10" },
    { label: "Paid", value: (data?.paid ?? 0).toString(), icon: CheckCircle, color: "text-green-400", bg: "bg-green-400/10" },
    { label: "Unpaid", value: (data?.pending ?? 0).toString(), icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10" },
    { label: "Total Due", value: formatLKR(data?.totalDue ?? 0), icon: AlertCircle, color: "text-red-400", bg: "bg-red-400/10" },
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
        {loading || !data ? (
          <div className="flex justify-center items-center py-16 text-gray-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
            <span>Loading invoices...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 text-sm">
                <th className="p-4 font-medium">Invoice #</th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Client</th>
                <th className="p-4 font-medium">Service</th>
                <th className="p-4 font-medium text-center">Work Status</th>
                <th className="p-4 font-medium text-center">Payment Status</th>
                <th className="p-4 font-medium text-right">Amount</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isOptimisticNew && isValidating && (
                 <tr className="animate-pulse bg-brand-500/10 border-b border-brand-500/20">
                   <td colSpan={10} className="p-4 py-6">
                     <div className="flex items-center justify-center gap-3 text-brand-400">
                       <Loader2 className="w-5 h-5 animate-spin" />
                       <span className="font-medium">Saving new entry...</span>
                     </div>
                   </td>
                 </tr>
              )}
              {filteredInvoices.map((row: any) => {
                const isUpdating = isOptimisticUpdate && updateId === String(row.id) && isValidating;
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
                  <tr key={row.id} className={`hover:bg-white/5 transition-colors ${isUpdating ? "animate-pulse bg-white/10 opacity-70" : ""}`}>
                    <td className="p-4">
                      <Link href={`/admin/invoice/${row.id}`} className="font-semibold text-brand-400 hover:text-brand-300 transition-colors">
                        {row.id}
                      </Link>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-white">{row.date}</div>
                      {row.dueDate && paymentStatus !== 'fully paid' && (
                        <div className={`text-xs mt-0.5 ${row.overdue ? 'text-red-400 font-medium' : 'text-gray-500'}`}>
                          Due: {row.dueDate}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      {row.clientId ? (
                        <Link href={`/admin/clients/${row.clientId}`} className="text-sm font-medium text-white hover:text-brand-400" title={row.clientEmail || ''}>
                          {row.client}
                        </Link>
                      ) : (
                        <div className="text-sm font-medium text-white" title={row.clientEmail || ''}>
                          {row.client}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-300 max-w-[200px]">
                      <div className="truncate" title={row.service}>{row.service}</div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 text-[10px] uppercase font-bold rounded-full border ${workColor}`}>
                        {row.work_status || '—'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 text-[10px] uppercase font-bold rounded-full border ${paymentColor}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-semibold text-white">{formatLKR(row.amount)}</div>
                      {paymentStatus !== 'fully paid' && (
                        <div className={`text-xs mt-0.5 font-medium ${
                          parseFloat(row.total_due) >= parseFloat(row.amount)
                            ? 'text-yellow-400'
                            : 'text-purple-400'
                        }`}>
                          Due: {formatLKR(row.total_due)}
                        </div>
                      )}
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
                        <button 
                          onClick={() => handleDownloadPDF(row)}
                          disabled={downloadingId === row.id}
                          className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white disabled:opacity-50"
                          title="Download PDF"
                        >
                          {downloadingId === row.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </button>
                        <button onClick={() => handleDelete(row.id)} className="p-2 hover:bg-red-400/10 rounded-xl transition-colors text-gray-400 hover:text-red-400" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && !loadingMore && filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-gray-500">No invoices found.</td>
                </tr>
              )}
              {loadingMore && (
                <tr><td colSpan={8} className="p-4 text-center text-gray-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>
              )}
              {!hasMore && filteredInvoices.length > 0 && (
                <tr><td colSpan={8} className="p-4 text-center text-gray-500 text-sm">No more records</td></tr>
              )}
            </tbody>
          </table>
        </div>
        )}
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

              {paymentMethod === "Bank Transfer" && (
                <div className="space-y-1">
                  <label className="text-sm text-gray-400 block font-medium">Account</label>
                  <select
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors text-white appearance-none"
                  >
                    {accounts.filter(acc => acc.type === 'Bank Account').map(acc => (
                      <option key={acc.id} value={acc.id} className="bg-black text-white">
                        {acc.name} {acc.bankName ? `(${acc.bankName})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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

      {/* Link Invoice to Domain / Server Modal */}
      {linkModalOpen && linkingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md px-4">
          <div className="bg-black border border-white/10 rounded-3xl w-full max-w-lg p-6 relative shadow-2xl text-white">
            <button
              onClick={() => setLinkModalOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Link2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Link Invoice to Order</h3>
                <p className="text-xs text-gray-400">
                  {linkingInvoice.id} • {linkingInvoice.client} ({formatLKR(linkingInvoice.amount)})
                </p>
              </div>
            </div>

            {/* Current Link Status */}
            {(linkingInvoice.linkedDomain || linkingInvoice.linkedHosting) ? (
              <div className="my-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-gray-400">Currently Linked:</span>
                  <span className="ml-1.5 font-bold text-blue-400">
                    {linkingInvoice.linkedDomain
                      ? `Domain: ${linkingInvoice.linkedDomain.name}`
                      : `Server: ${linkingInvoice.linkedHosting?.name} (${linkingInvoice.linkedHosting?.provider})`}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={savingEntityLink}
                  onClick={() => handleSaveEntityLink('none')}
                  className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Unlink className="w-3 h-3" />
                  Unlink
                </button>
              </div>
            ) : (
              <div className="my-3 p-3 bg-white/5 border border-white/10 rounded-2xl text-xs text-gray-400">
                This invoice is not currently linked to any domain or server order.
              </div>
            )}

            {/* Target Type Selector */}
            <div className="space-y-4 my-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300 block">Link Target</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setLinkTargetType('domain');
                      setLinkTargetId('');
                    }}
                    className={`py-2.5 px-3 rounded-2xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      linkTargetType === 'domain'
                        ? 'border-blue-500 bg-blue-500/10 text-white'
                        : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5 text-blue-400" />
                    Domain Order
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLinkTargetType('hosting');
                      setLinkTargetId('');
                    }}
                    className={`py-2.5 px-3 rounded-2xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      linkTargetType === 'hosting'
                        ? 'border-purple-500 bg-purple-500/10 text-white'
                        : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Server className="w-3.5 h-3.5 text-purple-400" />
                    Server / Hosting Order
                  </button>
                </div>
              </div>

              {/* List of Orders */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300 block">
                  Select {linkTargetType === 'domain' ? 'Domain' : 'Hosting / Server'} Order
                </label>
                {loadingEntityOptions ? (
                  <div className="py-4 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading orders...
                  </div>
                ) : (
                  <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 border border-white/5 rounded-2xl p-2 bg-white/[0.02]">
                    {(linkTargetType === 'domain' ? entityOptions.domains : entityOptions.hosting).length === 0 ? (
                      <div className="py-4 text-center text-xs text-gray-500">
                        No orders found for this category.
                      </div>
                    ) : (
                      (linkTargetType === 'domain' ? entityOptions.domains : entityOptions.hosting).map((item) => {
                        const isSelected = linkTargetId === String(item.id);
                        const isMatch = item.client_email?.toLowerCase() === linkingInvoice.clientEmail?.toLowerCase();
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setLinkTargetId(String(item.id))}
                            className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? linkTargetType === 'domain'
                                  ? 'bg-blue-500/20 border-blue-500 text-white'
                                  : 'bg-purple-500/20 border-purple-500 text-white'
                                : 'bg-white/5 border-white/5 hover:bg-white/10 text-gray-300'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-xs text-white">
                                  {linkTargetType === 'domain' ? item.domain_name : `${item.domain_name} (${item.hosting_provider})`}
                                </span>
                                {isMatch && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-semibold">
                                    Client Match
                                  </span>
                                )}
                                {item.status && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-gray-400">
                                    {item.status}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[260px]">{item.client_email}</p>
                            </div>
                            <div className="text-right">
                              {item.invoice_id && (
                                <span className="font-mono text-[10px] text-gray-500 block">Inv: {item.invoice_id}</span>
                              )}
                              <span className="text-[10px] text-brand-400 font-mono">ID #{item.id}</span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setLinkModalOpen(false)}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-2xl font-semibold transition-colors text-sm text-gray-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingEntityLink || !linkTargetId}
                onClick={() => handleSaveEntityLink(linkTargetType, linkTargetId)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-semibold transition-colors text-sm disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <Link2 className="w-4 h-4" />
                {savingEntityLink ? "Linking..." : "Link Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}