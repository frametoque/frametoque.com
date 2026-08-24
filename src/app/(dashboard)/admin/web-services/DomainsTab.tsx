"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  getDomainOrders,
  getDomainRenewalHistory,
  updateDomainOrderStatus,
  deleteDomainOrder,
  updateDomainOrder,
  createDomainInvoice,
  renewExpiredDomain,
  getAllRenewalHistory,
  uploadRenewalInvoiceForDomain,
  setDomainRenewalInvoiceUrl,
  DomainOrder,
  DomainRenewalHistoryRow,
  uploadProviderInvoice,
  addDomainOrder,
} from "../actions/domains";
import {
  Globe,
  AlertTriangle,
  Mail,
  Check,
  Search,
  Trash2,
  Edit2,
  X,
  Clock,
  FileText,
  History,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Lock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Upload,
} from "lucide-react";
import AnimatedNumber from "../components/AnimatedNumber";
import { StatCard } from "@/components/ui/StatCard";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { PageHeader } from "@/components/ui/PageHeader";

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------
const formatLKR = (amount: number) =>
  new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR" }).format(amount || 0);

const formatUSD = (amount: number) => `$${amount.toFixed(2)}`;

const convertPdfToImage = async (file: File): Promise<File> => {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return file;


  if (!(window as any).pdfjsLib) {
    const existingScript = document.querySelector('script[src*="pdf.min.js"]');
    if (existingScript) {
      await new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          if ((window as any).pdfjsLib) {
            clearInterval(interval);
            resolve();
          }
        }, 100);
      });
    } else {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load PDF.js"));
        document.head.appendChild(script);
      });
    }
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

function extractError(res: unknown, fallback = "Unknown error"): string {
  if (
    res &&
    typeof res === "object" &&
    "error" in res &&
    typeof (res as { error?: unknown }).error === "string"
  ) {
    return (res as { error: string }).error;
  }
  return fallback;
}

function countsTowardProfit(o: DomainOrder): boolean {
  const status = o.status.toLowerCase();
  if (status === "pending") return false;
  if (status === "active") return true;
  if (status === "expired") {
    return !!(o.invoice_id && o.expiry_date);
  }
  return false;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Compact single-line: $X.XX (LKR Y,YYY @rate) */
function RegPricePair({
  usd,
  lockedLkr,
  lockedRate,
  liveRate,
  isActivated,
  dimmed = false,
}: {
  usd: number;
  lockedLkr?: number | null;
  lockedRate?: number | null;
  liveRate: number;
  isActivated: boolean;
  dimmed?: boolean;
}) {
  const lkrValue = isActivated && lockedLkr != null ? lockedLkr : usd * liveRate;
  const rate = isActivated && lockedRate != null ? lockedRate : liveRate;
  const isFixed = isActivated && lockedLkr != null;

  return (
    <div className={`text-sm ${dimmed ? "text-gray-400" : "text-white font-medium"}`}>
      {formatUSD(usd)}
      <span className={`text-xs font-normal ml-1 ${isFixed ? "text-amber-300/80" : "text-gray-500"}`}>
        ({formatLKR(lkrValue)}
        <span className={`${isFixed ? "text-amber-300/80" : "text-gray-500"} text-[9px] ml-0.5`}> @{Math.round(rate)}</span>)
      </span>
    </div>
  );
}

/** Compact single-line renewal: $X.XX (LKR Y,YYY @rate) — always live */
function RenewalPricePair({
  usd,
  liveRate,
  dimmed = false,
}: {
  usd: number;
  liveRate: number;
  dimmed?: boolean;
}) {
  const lkr = usd * liveRate;
  return (
    <div className={`text-sm ${dimmed ? "text-gray-400" : "text-white font-medium"}`}>
      {formatUSD(usd)}
      <span className="text-xs font-normal ml-1 text-gray-500">
        ({formatLKR(lkr)}
        <span className="text-gray-600 text-[9px] ml-0.5"> @{Math.round(liveRate)}</span>)
      </span>
    </div>
  );
}

/** Renewal history panel shown inline under a domain row. */
function RenewalHistoryPanel({
  history,
  loading,
  onViewRenewalInvoice,
  onUploadRenewalInvoice,
}: {
  history: DomainRenewalHistoryRow[];
  loading: boolean;
  onViewRenewalInvoice?: (h: DomainRenewalHistoryRow) => void;
  onUploadRenewalInvoice?: (h: DomainRenewalHistoryRow, file: File) => void;
}) {
  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === "fully paid" || s === "paid") {
      return "text-green-400 bg-green-400/10 border-green-400/20";
    }
    if (s === "on review") {
      return "text-amber-400 bg-amber-400/10 border-amber-400/20";
    }
    return "text-red-400 bg-red-400/10 border-red-400/20";
  };

  return (
    <div className="bg-white/[0.02] border-t border-white/5 px-4 py-3">
      <p className="text-xs font-semibold text-gray-400 mb-3 flex items-center gap-1.5">
        <History className="w-3.5 h-3.5" />
        Billing &amp; Renewal History
      </p>
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
          <div className="w-3.5 h-3.5 border border-brand-500 border-t-transparent rounded-full animate-spin" />
          Loading history...
        </div>
      ) : history.length === 0 ? (
        <p className="text-xs text-gray-600 italic py-1">No billing invoices generated yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-white/5 text-gray-500">
                <th className="px-3 py-2 text-left font-medium">Date</th>
                <th className="px-3 py-2 text-left font-medium">Invoice</th>
                <th className="px-3 py-2 text-right font-medium">USD</th>
                <th className="px-3 py-2 text-right font-medium">LKR (rate)</th>
                <th className="px-3 py-2 text-center font-medium">Status</th>
                <th className="px-3 py-2 text-center font-medium">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {history.map((h) => (
                <RenewalHistoryRow
                  key={h.id}
                  h={h}
                  getStatusBadge={getStatusBadge}
                  onView={onViewRenewalInvoice}
                  onUpload={onUploadRenewalInvoice}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RenewalHistoryRow({
  h,
  getStatusBadge,
  onView,
  onUpload,
}: {
  h: DomainRenewalHistoryRow;
  getStatusBadge: (s: string) => string;
  onView?: (h: DomainRenewalHistoryRow) => void;
  onUpload?: (h: DomainRenewalHistoryRow, file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !onUpload) return;
    setUploading(true);
    try {
      let uploadFile = file;
      // PDF → image conversion
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        if (!(window as any).pdfjsLib) {
          await new Promise<void>((res, rej) => {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
            s.onload = () => res(); s.onerror = rej;
            document.head.appendChild(s);
          });
        }
        const lib = (window as any).pdfjsLib;
        lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        const ab = await file.arrayBuffer();
        const pdf = await lib.getDocument({ data: ab }).promise;
        const page = await pdf.getPage(1);
        const vp = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = vp.width; canvas.height = vp.height;
        await page.render({ canvasContext: canvas.getContext('2d')!, viewport: vp }).promise;
        const blob = await new Promise<Blob>(r => canvas.toBlob(b => r(b!), 'image/png'));
        uploadFile = new File([blob], file.name.replace(/\.pdf$/i, '.png'), { type: 'image/png' });
      }
      onUpload(h, uploadFile);
    } finally {
      setUploading(false);
    }
  }

  return (
    <tr className="hover:bg-white/5 transition-colors">
      <td className="px-3 py-2 text-gray-400">
        {new Date(h.renewal_date).toLocaleDateString("en-US", {
          month: "short", day: "numeric", year: "numeric",
        })}
      </td>
      <td className="px-3 py-2 flex items-center gap-2">
        <span className="text-brand-400 font-mono">{h.invoice_id}</span>
        {h.id === -1 ? (
          <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1 py-0.5 rounded font-semibold select-none">
            Registration
          </span>
        ) : (
          <span className="text-[9px] bg-brand-500/10 text-brand-400 border border-brand-500/20 px-1 py-0.5 rounded font-semibold select-none">
            Renewal
          </span>
        )}
      </td>
      <td className="px-3 py-2 text-right text-white font-medium">
        {formatUSD(h.usd_price)}
      </td>
      <td className="px-3 py-2 text-right">
        <span className="text-amber-300/90">{formatLKR(h.lkr_price)}</span>
        <span className="text-gray-600 ml-1 text-[9px]">(@{h.lkr_rate.toFixed(2)})</span>
      </td>
      <td className="px-3 py-2 text-center">
        <span className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] font-semibold ${getStatusBadge(h.status)}`}>
          {h.status}
        </span>
      </td>
      <td className="px-3 py-2 text-center">
        <div className="flex items-center justify-center gap-1">
          {h.renewal_invoice_url ? (
            <button
              onClick={() => onView?.(h)}
              title="View renewal invoice"
              className="p-1.5 hover:bg-white/10 text-brand-400 rounded-lg transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
          ) : (
            <>
              <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFile} />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading || h.id === -1}
                title={h.id === -1 ? "Cannot upload for registration" : "Upload renewal invoice"}
                className="p-1.5 hover:bg-white/10 text-gray-500 hover:text-gray-300 rounded-lg transition-colors cursor-pointer disabled:opacity-30"
              >
                {uploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<DomainOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const [lkrRate, setLkrRate] = useState(300);

  // Renewal history state per domain id
  const [expandedHistory, setExpandedHistory] = useState<Record<number, boolean>>({});
  const [historyData, setHistoryData] = useState<Record<number, DomainRenewalHistoryRow[]>>({});
  const [historyLoading, setHistoryLoading] = useState<Record<number, boolean>>({});
  const [allRenewals, setAllRenewals] = useState<DomainRenewalHistoryRow[]>([]);

  // Activation & Invoice Modal States
  const [activationModalOpen, setActivationModalOpen] = useState(false);
  const [activeDomainId, setActiveDomainId] = useState<number | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'LKR'>('LKR');
  const [activatingWithInvoice, setActivatingWithInvoice] = useState(false);

  // Edit Modal States
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<DomainOrder | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editDomain, setEditDomain] = useState("");
  const [editRegistrar, setEditRegistrar] = useState("Internet.bs");
  const [editRegCost, setEditRegCost] = useState("");
  const [editRegPrice, setEditRegPrice] = useState("");
  const [editRenewCost, setEditRenewCost] = useState("");
  const [editRenewPrice, setEditRenewPrice] = useState("");
  const [editStatus, setEditStatus] = useState("pending");
  const [editExpiry, setEditExpiry] = useState("");
  const [createRenewalInvoiceOnExpire, setCreateRenewalInvoiceOnExpire] = useState(true);
  const [expireCurrency, setExpireCurrency] = useState<"USD" | "LKR">("USD");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editProviderInvoiceUrl, setEditProviderInvoiceUrl] = useState<string | null>(null);
  const [editActualPriceCurrency, setEditActualPriceCurrency] = useState("USD");
  const [editActivationLkrRate, setEditActivationLkrRate] = useState<string>("");
  const [viewingInvoice, setViewingInvoice] = useState<{ order: DomainOrder } | null>(null);
  const [viewingRenewalInvoice, setViewingRenewalInvoice] = useState<DomainRenewalHistoryRow | null>(null);
  const [uploadingInvoice, setUploadingInvoice] = useState(false);

  // Add Domain Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addDomainName, setAddDomainName] = useState("");
  const [addRegistrar, setAddRegistrar] = useState("Internet.bs");
  const [addRegCost, setAddRegCost] = useState("");
  const [addRegPrice, setAddRegPrice] = useState("");
  const [addRenewCost, setAddRenewCost] = useState("");
  const [addRenewPrice, setAddRenewPrice] = useState("");
  const [addStatus, setAddStatus] = useState("active");
  const [addExpiry, setAddExpiry] = useState("");
  const [addProviderInvoiceUrl, setAddProviderInvoiceUrl] = useState<string | null>(null);
  const [uploadingAddInvoice, setUploadingAddInvoice] = useState(false);
  const [addActualPriceCurrency, setAddActualPriceCurrency] = useState("USD");

  // Domain search states
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);

  // Expire Modal States
  const [expireModalOpen, setExpireModalOpen] = useState(false);
  const [expiringDomainId, setExpiringDomainId] = useState<number | null>(null);
  const [expiringDomainName, setExpiringDomainName] = useState("");
  const [expiringWithInvoice, setExpiringWithInvoice] = useState(false);

  // Delete Modal States
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState<number | null>(null);
  const [deletingDomainName, setDeletingDomainName] = useState("");
  const [deletingWithInvoices, setDeletingWithInvoices] = useState(false);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------
  const usdToLkr = (usd: number) => usd * lkrRate;

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Run both fetches in parallel — server already handles auto-expire in batch
      const [data, renewals] = await Promise.all([
        getDomainOrders(),
        getAllRenewalHistory(),
      ]);
      setOrders(data);
      setAllRenewals(renewals);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    // Fetch LKR rate (no cancel needed — just state update, low stakes)
    fetch("https://open.er-api.com/v6/latest/USD")
      .then((res) => res.json())
      .then((data) => { if (!cancelled && data?.rates?.LKR) setLkrRate(data.rates.LKR); })
      .catch((e) => console.error("Failed to load LKR exchange rate", e));

    async function load() {
      setLoading(true);
      try {
        const [data, renewals] = await Promise.all([
          getDomainOrders(),
          getAllRenewalHistory(),
        ]);
        if (!cancelled) {
          setOrders(data);
          setAllRenewals(renewals);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();

    const handleOpenAdd = () => {
      setAddEmail("");
      setAddDomainName("");
      setAddActualPriceCurrency("USD");
      setAddRegCost("");
      setAddRegPrice("");
      setAddRenewCost("");
      setAddRenewPrice("");
      setAddRegistrar("Internet.bs");
      setAddExpiry("");
      setAddStatus("active");
      setAddProviderInvoiceUrl(null);
      setSearchResults(null);
      setIsAddModalOpen(true);
    };

    const handleRefreshEvent = () => { fetchOrders(); };

    window.addEventListener("domains:open-add", handleOpenAdd);
    window.addEventListener("domains:refresh", handleRefreshEvent);
    return () => {
      cancelled = true;
      window.removeEventListener("domains:open-add", handleOpenAdd);
      window.removeEventListener("domains:refresh", handleRefreshEvent);
    };
  }, []);

  const checkDomainAvailability = async () => {
    if (!addDomainName || !addDomainName.includes(".")) {
      alert("Please enter a valid domain name");
      return;
    }
    setSearchLoading(true);
    setSearchResults(null);
    try {
      const res = await fetch(`/api/services/domains/check?domain=${encodeURIComponent(addDomainName)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to check domain");
      setSearchResults(data);
      if (data.available) {
        setAddRegCost(String(data.reg_price_usd || ""));
        setAddRenewCost(String(data.renew_price_usd || ""));
        // Automatically default retail prices slightly higher for helper convenience
        setAddRegPrice(String(Math.round((data.reg_price_usd || 12.0) * 1.3)));
        setAddRenewPrice(String(Math.round((data.renew_price_usd || 14.0) * 1.3)));
      } else {
        alert("Domain is already registered according to WHOIS, but you can still record it manually.");
      }
    } catch (err: any) {
      alert("WHOIS search error: " + err.message);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEdit(true);
    const actPrice = parseFloat(addRegCost) || 0;
    const sellPrice = parseFloat(addRegPrice) || 0;
    const profit = sellPrice - actPrice;

    const res = await addDomainOrder({
      client_email: addEmail,
      domain_name: addDomainName,
      actual_price: actPrice,
      actual_price_currency: addActualPriceCurrency,
      selling_price: sellPrice,
      profit: profit,
      renewal_cost: parseFloat(addRenewCost) || 0,
      renewal_price: parseFloat(addRenewPrice) || 0,
      registrar: addRegistrar,
      expiry_date: addExpiry ? addExpiry + " 00:00:00" : "",
      status: addStatus,
      invoice_id: null,
      provider_invoice_url: addProviderInvoiceUrl,
    });

    if (res.success) {
      alert("Domain order added successfully!");
      setIsAddModalOpen(false);
      fetchOrders();
    } else {
      const errMessage = (res as any).error || "Unknown error";
      alert("Failed to add domain order: " + errMessage);
    }
    setSavingEdit(false);
  };

  // ---------------------------------------------------------------------------
  // Renewal history toggle
  // ---------------------------------------------------------------------------
  const toggleHistory = async (orderId: number) => {
    const isOpen = expandedHistory[orderId];
    setExpandedHistory((prev) => ({ ...prev, [orderId]: !isOpen }));

    if (!isOpen && !historyData[orderId]) {
      setHistoryLoading((prev) => ({ ...prev, [orderId]: true }));
      try {
        const rows = await getDomainRenewalHistory(orderId);
        setHistoryData((prev) => ({ ...prev, [orderId]: rows }));
      } catch (e) {
        console.error(e);
      } finally {
        setHistoryLoading((prev) => ({ ...prev, [orderId]: false }));
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Status / CRUD handlers
  // ---------------------------------------------------------------------------
  const handleStatusChange = async (id: number, newStatus: string) => {
    setUpdatingId(id);
    try {
      const res = await updateDomainOrderStatus(id, newStatus);
      if (res.success) {
        setOrders((prev) =>
          prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o))
        );
        fetchOrders();
      } else {
        alert("Failed to update status: " + extractError(res));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleConfirmActivation = async () => {
    if (!activeDomainId) return;
    setActivatingWithInvoice(true);
    try {
      const res = await createDomainInvoice(activeDomainId, selectedCurrency);
      if (res.success) {
        alert(`Invoice ${res.invoiceId} created successfully!`);
        setActivationModalOpen(false);
        setActiveDomainId(null);
        fetchOrders();
      } else {
        alert("Failed to create invoice: " + extractError(res));
      }
    } catch (e: any) {
      console.error(e);
      alert("Error creating invoice: " + e.message);
    } finally {
      setActivatingWithInvoice(false);
    }
  };

  const handleOpenDeleteModal = (order: DomainOrder) => {
    setDeletingOrderId(order.id);
    setDeletingDomainName(order.domain_name);
    setDeletingWithInvoices(false);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingOrderId) return;
    try {
      const res = await deleteDomainOrder(deletingOrderId, deletingWithInvoices);
      if (res.success) {
        setOrders((prev) => prev.filter((o) => o.id !== deletingOrderId));
        setDeleteModalOpen(false);
        setDeletingOrderId(null);
        alert("Domain order deleted successfully!");
        await fetchOrders();
      } else {
        alert("Failed to delete order: " + extractError(res));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenExpireModal = (order: DomainOrder) => {
    setExpiringDomainId(order.id);
    setExpiringDomainName(order.domain_name);
    setCreateRenewalInvoiceOnExpire(true);
    setExpireCurrency("USD");
    setExpireModalOpen(true);
  };

  const handleConfirmExpire = async () => {
    if (!expiringDomainId) return;
    setExpiringWithInvoice(true);
    try {
      const res = await updateDomainOrderStatus(expiringDomainId, "expired", {
        skipRenewalInvoice: !createRenewalInvoiceOnExpire,
        currency: expireCurrency,
      });
      if (res.success) {
        if (res.skippedInvoice) {
          alert("Domain marked as expired without creating a renewal invoice.");
        } else if (res.invoiceId) {
          alert(
            res.alreadyExists
              ? `Domain marked as expired. Existing renewal invoice ${res.invoiceId} is still open.`
              : `Domain marked as expired. Renewal invoice ${res.invoiceId} created.`
          );
        } else {
          alert("Domain marked as expired.");
        }
        setExpireModalOpen(false);
        setExpiringDomainId(null);
        // Invalidate cached history for this domain
        setHistoryData((prev) => {
          const next = { ...prev };
          delete next[expiringDomainId];
          return next;
        });
        await fetchOrders();
      } else {
        alert("Failed to mark domain as expired: " + extractError(res));
      }
    } catch (err: any) {
      console.error(err);
      alert("Error marking domain as expired: " + err.message);
    } finally {
      setExpiringWithInvoice(false);
    }
  };

  const handleRenewExpired = async (order: DomainOrder) => {
    if (!confirm(`Are you sure you want to renew "${order.domain_name}"? This will generate a new renewal invoice.`)) {
      return;
    }
    setUpdatingId(order.id);
    try {
      const res = await renewExpiredDomain(order.id);
      if (res.success) {
        alert(`Domain renewed successfully! Invoice ${res.invoiceId} (LKR) generated.`);
        // Invalidate cached history
        setHistoryData((prev) => {
          const next = { ...prev };
          delete next[order.id];
          return next;
        });
        await fetchOrders();
      } else {
        alert("Failed to renew domain: " + extractError(res));
      }
    } catch (err: any) {
      console.error(err);
      alert("Error renewing domain: " + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleOpenEditModal = (order: DomainOrder) => {
    setSelectedOrder(order);
    setEditEmail(order.client_email);
    setEditDomain(order.domain_name);
    setEditRegistrar(order.registrar || "Internet.bs");
    setEditRegCost(String(order.actual_price));
    setEditRegPrice(String(order.selling_price));
    setEditRenewCost(String(order.renewal_cost || 14.25));
    setEditRenewPrice(String(order.renewal_price || 19.99));
    setEditStatus(order.status);
    setEditExpiry(order.expiry_date ? order.expiry_date.split("T")[0] : "");
    setCreateRenewalInvoiceOnExpire(true);
    setExpireCurrency("USD");
    setEditActualPriceCurrency(order.actual_price_currency || "USD");
    setEditProviderInvoiceUrl(order.provider_invoice_url || null);
    setEditActivationLkrRate(order.activation_lkr_rate != null ? String(order.activation_lkr_rate) : String(lkrRate));
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setSavingEdit(true);
    const regCostNum = parseFloat(editRegCost) || 0;
    const regPriceNum = parseFloat(editRegPrice) || 0;
    const renewCostNum = parseFloat(editRenewCost) || 0;
    const renewPriceNum = parseFloat(editRenewPrice) || 0;
    const isBecomingExpired =
      editStatus.toLowerCase() === "expired" &&
      selectedOrder.status.toLowerCase() !== "expired";

    const isUsd = editActualPriceCurrency === "USD";
    const rateNum = parseFloat(editActivationLkrRate) || lkrRate;

    try {
      const res = await updateDomainOrder(
        selectedOrder.id,
        {
          client_email: editEmail,
          domain_name: editDomain,
          actual_price: regCostNum,
          selling_price: regPriceNum,
          profit: regPriceNum - regCostNum,
          renewal_cost: renewCostNum,
          renewal_price: renewPriceNum,
          registrar: editRegistrar,
          expiry_date: editExpiry,
          status: editStatus,
          provider_invoice_url: editProviderInvoiceUrl,
          actual_price_currency: editActualPriceCurrency,
          activation_lkr_rate: isUsd ? rateNum : null,
          activation_lkr_price: isUsd ? regPriceNum * rateNum : null,
          activation_lkr_cost: isUsd ? regCostNum * rateNum : null,
        },
        isBecomingExpired
          ? {
              skipRenewalInvoice: !createRenewalInvoiceOnExpire,
              currency: expireCurrency,
            }
          : undefined
      );

      if (res.success) {
        if (isBecomingExpired) {
          if (res.skippedInvoice) {
            alert("Domain marked as expired without creating a renewal invoice.");
          } else if (res.invoiceId) {
            alert(
              res.alreadyExists
                ? `Domain marked as expired. Existing renewal invoice ${res.invoiceId} is still open.`
                : `Domain marked as expired. Renewal invoice ${res.invoiceId} created.`
            );
          }
        }
        setEditModalOpen(false);
        // Invalidate cached history
        setHistoryData((prev) => {
          const next = { ...prev };
          delete next[selectedOrder.id];
          return next;
        });
        await fetchOrders();
      } else {
        alert("Failed to save changes: " + extractError(res));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingEdit(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "text-green-400 bg-green-400/10 border border-green-400/20";
      case "pending":
        return "text-amber-400 bg-amber-400/10 border border-amber-400/20";
      case "expired":
        return "text-red-400 bg-red-400/10 border border-red-400/20";
      default:
        return "text-gray-400 bg-gray-400/10 border border-gray-400/20";
    }
  };

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------
  const activeCount = orders.filter((o) => o.status.toLowerCase() === "active").length;
  const expiredCount = orders.filter((o) => o.status.toLowerCase() === "expired").length;
  const pendingCount = orders.filter((o) => o.status.toLowerCase() === "pending").length;

  const totalRegProfitLkr = orders.reduce((acc, o) => {
    if (!countsTowardProfit(o)) return acc;
    const regProfit = o.selling_price - o.actual_price;
    const lockedRegCostLkr = o.activation_lkr_cost ?? null;
    const lockedRegPriceLkr = o.activation_lkr_price ?? null;
    const regProfitLkr = (lockedRegPriceLkr != null && lockedRegCostLkr != null)
      ? (lockedRegPriceLkr - lockedRegCostLkr)
      : (regProfit * lkrRate);
    return acc + regProfitLkr;
  }, 0);

  const totalRenewalProfitLkr = allRenewals.reduce((acc, h) => {
    const status = h.status.toLowerCase();
    if (status !== 'paid' && status !== 'fully paid') return acc;
    const o = orders.find(d => d.id === h.domain_order_id);
    const renewCostUsd = o?.renewal_cost || 14.25;
    const renewProfitLkr = h.lkr_price - (renewCostUsd * h.lkr_rate);
    return acc + renewProfitLkr;
  }, 0);

  const totalProfitLkr = totalRegProfitLkr + totalRenewalProfitLkr;

  const filteredOrders = orders.filter((o) => {
    const statusMatch = activeFilter === "All" || o.status.toLowerCase() === activeFilter.toLowerCase();
    const searchMatch =
      o.domain_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.client_email.toLowerCase().includes(searchQuery.toLowerCase());
    return statusMatch && searchMatch;
  });

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="space-y-6 pb-10 mt-2">
        {/* Skeleton Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((idx) => (
            <div key={idx} className="bg-white/5 border border-white/10 rounded-3xl p-6 flex items-center justify-between h-[104px] animate-pulse">
              <div className="space-y-2.5">
                <div className="h-3 w-24 bg-white/10 rounded-full" />
                <div className="h-7 w-12 bg-white/10 rounded-full" />
              </div>
              <div className="p-3 bg-white/5 rounded-2xl w-12 h-12" />
            </div>
          ))}
        </div>

        {/* Skeleton Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 animate-pulse">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
            <div className="h-[42px] w-full sm:w-64 bg-white/5 border border-white/10 rounded-full" />
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-[38px] w-20 bg-white/5 border border-white/10 rounded-full" />
              ))}
            </div>
          </div>
          <div className="h-3 w-40 bg-white/5 rounded-full self-end lg:self-auto" />
        </div>

        {/* Skeleton Table */}
        <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden animate-pulse">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="p-4"><div className="h-4 w-28 bg-white/10 rounded-full" /></th>
                  <th className="p-4 text-right"><div className="h-4 w-32 bg-white/10 rounded-full ml-auto" /></th>
                  <th className="p-4 text-right"><div className="h-4 w-32 bg-white/10 rounded-full ml-auto" /></th>
                  <th className="p-4 text-right"><div className="h-4 w-24 bg-white/10 rounded-full ml-auto" /></th>
                  <th className="p-4"><div className="h-4 w-20 bg-white/10 rounded-full" /></th>
                  <th className="p-4 text-center"><div className="h-4 w-12 bg-white/10 rounded-full mx-auto" /></th>
                  <th className="p-4 text-right"><div className="h-4 w-16 bg-white/10 rounded-full ml-auto" /></th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((idx) => (
                  <tr key={idx} className="border-t border-white/5">
                    <td className="p-4 space-y-2.5">
                      <div className="h-4 w-40 bg-white/10 rounded-full" />
                      <div className="h-3.5 w-32 bg-white/5 rounded-full" />
                      <div className="h-3 w-24 bg-white/5 rounded-full" />
                    </td>
                    <td className="p-4 text-right space-y-2">
                      <div className="h-3.5 w-20 bg-white/10 rounded-full ml-auto" />
                      <div className="h-3 w-16 bg-white/5 rounded-full ml-auto" />
                    </td>
                    <td className="p-4 text-right space-y-2">
                      <div className="h-3.5 w-20 bg-white/10 rounded-full ml-auto" />
                      <div className="h-3 w-16 bg-white/5 rounded-full ml-auto" />
                    </td>
                    <td className="p-4 text-right space-y-2">
                      <div className="h-4 w-14 bg-white/10 rounded-full ml-auto" />
                      <div className="h-3 w-12 bg-white/5 rounded-full ml-auto" />
                    </td>
                    <td className="p-4">
                      <div className="h-4 w-24 bg-white/10 rounded-full" />
                    </td>
                    <td className="p-4 text-center">
                      <div className="h-6 w-16 bg-white/10 rounded-full mx-auto" />
                    </td>
                    <td className="p-4 text-right">
                      <div className="h-8 w-24 bg-white/10 rounded-xl ml-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 mt-2">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Active Domains" 
          value={<AnimatedNumber value={activeCount} />} 
          icon={<Globe className="w-6 h-6" />} 
          iconBgColor="bg-green-400/10" 
          iconTextColor="text-green-400" 
        />
        <StatCard 
          title="Expired Domains" 
          value={<AnimatedNumber value={expiredCount} />} 
          icon={<AlertTriangle className="w-6 h-6" />} 
          iconBgColor="bg-red-400/10" 
          iconTextColor="text-red-400" 
        />
        <StatCard 
          title="Pending Orders" 
          value={<AnimatedNumber value={pendingCount} />} 
          icon={<Clock className="w-6 h-6" />} 
          iconBgColor="bg-amber-400/10" 
          iconTextColor="text-amber-400" 
        />
        <StatCard 
          title="Total profit (LKR)" 
          value={<AnimatedNumber value={formatLKR(totalProfitLkr)} />} 
          icon={<TrendingUp className="w-6 h-6" />} 
          iconBgColor="bg-brand-400/10" 
          iconTextColor="text-brand-400" 
        />
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex-1">
          <PageHeader
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search domains..."
            filters={["All", "Pending", "Active", "Expired"]}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            primaryActionLabel="Add Domain"
            onPrimaryAction={() => setIsAddModalOpen(true)}
          />
        </div>
        <span className="text-gray-400 text-xs font-medium self-end lg:self-auto mb-2">
          Today's rate (1 USD = {lkrRate.toFixed(2)} LKR)
        </span>
      </div>

    

      {/* Table */}
      <Table>
        <TableHeader>
          <TableHead>Domain & Client</TableHead>
          <TableHead className="text-right">Cost Price (Reg / Ren)</TableHead>
          <TableHead className="text-right">Selling Price (Reg / Ren)</TableHead>
          <TableHead className="text-right text-brand-400">Profit (Reg / Ren)</TableHead>
          <TableHead>Expiry Date</TableHead>
          <TableHead className="text-center">Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableHeader>
        <TableBody>
          {filteredOrders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-gray-500 py-20 font-medium">
                No domain registrations found matching search criteria.
              </TableCell>
            </TableRow>
          ) : (
            filteredOrders.map((o) => {
              const daysToExpiry = Math.ceil(
                    (new Date(o.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  );
                  const isExpiringSoon = daysToExpiry > 0 && daysToExpiry <= 30;
                  const isActivated = o.status.toLowerCase() !== "pending";

                  const regProfit = o.selling_price - o.actual_price;
                  const renewCost = o.renewal_cost || 14.25;
                  const renewPrice = o.renewal_price || 19.99;
                  const renewProfit = renewPrice - renewCost;

                  // Fixed LKR values for registration (locked at activation)
                  const lockedRegCostLkr = o.activation_lkr_cost ?? null;
                  const lockedRegPriceLkr = o.activation_lkr_price ?? null;
                  const lockedRate = o.activation_lkr_rate ?? null;

                  // Fixed LKR profit (locked)
                  const regProfitLkr =
                    isActivated && lockedRegPriceLkr != null && lockedRegCostLkr != null
                      ? lockedRegPriceLkr - lockedRegCostLkr
                      : regProfit * lkrRate;
                  const effectiveRate =
                    isActivated && lockedRate != null ? lockedRate : lkrRate;

                  const isHistoryOpen = expandedHistory[o.id] ?? false;
                  const historyRows = historyData[o.id] ?? [];
                  const isHistoryLoading = historyLoading[o.id] ?? false;

                  return (
                    <React.Fragment key={o.id}>
                      <TableRow className={isHistoryOpen ? "bg-white/[0.02]" : ""}>
                        <TableCell>
                          <div className="font-semibold text-white flex items-center gap-1.5 flex-wrap">
                            <Globe className="w-4 h-4 text-brand-400" />
                            {o.domain_name}
                            <span className="text-[10px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-gray-400 font-medium">
                              {o.registrar || 'Internet.bs'}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 text-gray-500" />
                            {o.client_email}
                          </div>
                          <div className="text-[10px] text-gray-500 mt-1.5 flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-gray-500 shrink-0" />
                            <span>Ordered: {o.created_at ? new Date(o.created_at).toLocaleDateString() : (o.purchase_date ? new Date(o.purchase_date).toLocaleDateString() : 'N/A')}</span>
                          </div>
                        </TableCell>

                        {/* Cost Price (Reg / Ren) */}
                        <TableCell className="text-right text-sm space-y-1">
                          <RegPricePair
                            usd={o.actual_price}
                            lockedLkr={lockedRegCostLkr}
                            lockedRate={lockedRate}
                            liveRate={lkrRate}
                            isActivated={isActivated}
                            dimmed
                          />
                          <RenewalPricePair usd={renewCost} liveRate={lkrRate} dimmed />
                        </TableCell>

                        {/* Selling Price (Reg / Ren) */}
                        <TableCell className="text-right text-sm space-y-1">
                          <RegPricePair
                            usd={o.selling_price}
                            lockedLkr={lockedRegPriceLkr}
                            lockedRate={lockedRate}
                            liveRate={lkrRate}
                            isActivated={isActivated}
                          />
                          <RenewalPricePair usd={renewPrice} liveRate={lkrRate} />
                        </TableCell>

                        {/* Profit (Reg / Ren) */}
                        <TableCell className="text-right font-semibold text-brand-400 space-y-1">
                          <div>
                            {formatUSD(regProfit)}
                            <span className={`text-[10px] ml-1 font-normal ${isActivated && lockedRate != null ? "text-amber-300/80" : "text-gray-500"}`}>
                              ({formatLKR(regProfitLkr)})
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 font-normal">
                            {formatUSD(renewProfit)}
                            <span className="text-[10px] ml-1 font-normal text-gray-500">
                              ({formatLKR(renewProfit * lkrRate)})
                            </span>
                          </div>
                        </TableCell>

                        {/* Expiry */}
                        <TableCell>
                          {o.status.toLowerCase() === "pending" || !o.expiry_date ? (
                            <span className="text-gray-500 font-medium text-xs">Not Active Yet</span>
                          ) : (
                            <>
                              <div className={daysToExpiry <= 14 ? "text-red-500 font-bold" : "text-white"}>
                                {new Date(o.expiry_date).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </div>
                              {isExpiringSoon && (
                                <span className="text-[10px] text-red-400 font-semibold flex items-center gap-1 mt-1">
                                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                  Expiring in {daysToExpiry} days!
                                </span>
                              )}
                            </>
                          )}
                        </TableCell>

                        {/* Status */}
                        <TableCell className="text-center">
                          <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full border ${getStatusColor(o.status)}`}>
                            {o.status}
                          </span>
                        </TableCell>

                        {/* Actions */}
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {o.status === "pending" && (
                              <>
                                {!o.invoice_id ? (
                                  <button
                                    onClick={() => {
                                      setActiveDomainId(o.id);
                                      setSelectedCurrency('LKR');
                                      setActivationModalOpen(true);
                                    }}
                                    disabled={updatingId !== null}
                                    title="Create Invoice"
                                    className="p-2 hover:bg-blue-400/10 text-gray-400 hover:text-blue-400 rounded-xl transition-colors flex items-center justify-center cursor-pointer"
                                  >
                                    <FileText className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleStatusChange(o.id, "active")}
                                    disabled={updatingId !== null}
                                    title="Mark as Registered/Active"
                                    className="p-2 hover:bg-green-400/10 text-gray-400 hover:text-green-400 rounded-xl transition-colors flex items-center justify-center cursor-pointer"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                )}
                              </>
                            )}

                            {o.status?.toLowerCase() === "active" && (
                              <button
                                onClick={() => handleOpenExpireModal(o)}
                                disabled={updatingId !== null}
                                title="Mark as Expired"
                                className="p-2 hover:bg-red-400/10 text-gray-400 hover:text-red-400 rounded-xl transition-colors flex items-center justify-center cursor-pointer"
                              >
                                <AlertTriangle className="w-4 h-4" />
                              </button>
                            )}

                            {o.status?.toLowerCase() === "expired" && (
                              <button
                                onClick={() => handleRenewExpired(o)}
                                disabled={updatingId !== null}
                                title="Renew Domain (LKR Invoice)"
                                className="px-2.5 py-1 hover:bg-green-400/10 text-gray-400 hover:text-green-400 rounded-xl transition-colors flex items-center justify-center cursor-pointer font-medium text-xs gap-1 border border-white/10 hover:border-green-400/20"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Renew</span>
                              </button>
                            )}

                            {/* Renewal history toggle */}
                            <button
                              onClick={() => toggleHistory(o.id)}
                              title="Renewal History"
                              className={`p-2 rounded-xl transition-colors flex items-center justify-center cursor-pointer ${
                                isHistoryOpen
                                  ? "bg-brand-500/20 text-brand-400"
                                  : "hover:bg-white/10 text-gray-400 hover:text-white"
                              }`}
                            >
                              {isHistoryOpen ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <History className="w-4 h-4" />
                              )}
                            </button>

                            {o.provider_invoice_url && (
                              <button
                              onClick={() => setViewingInvoice({ order: o })}
                                title="View Provider Invoice"
                                className="p-2 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-colors flex items-center justify-center cursor-pointer"
                              >
                                <FileText className="w-4 h-4 text-brand-400" />
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenEditModal(o)}
                              className="p-2 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-colors flex items-center justify-center"
                              title="Edit Order"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <a
                              href={`mailto:${o.client_email}?subject=Domain Renewal Reminder: ${o.domain_name}&body=Hi client,%0D%0A%0D%0AThis is a reminder that your domain registration for ${o.domain_name} expires on ${new Date(o.expiry_date).toLocaleDateString()} (${daysToExpiry} days remaining).%0D%0A%0D%0APlease let us know if you want us to handle the renewal for another year.%0D%0A%0D%0AThank you!`}
                              className="p-2 hover:bg-brand-400/10 text-gray-400 hover:text-brand-400 rounded-xl transition-colors flex items-center justify-center"
                              title="Send Expiry Reminder Email"
                            >
                              <Mail className="w-4 h-4" />
                            </a>

                            <button
                              onClick={() => handleOpenDeleteModal(o)}
                              className="p-2 hover:bg-red-400/10 text-gray-400 hover:text-red-400 rounded-xl transition-colors flex items-center justify-center cursor-pointer"
                              title="Delete Order"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Inline renewal history panel */}
                      {isHistoryOpen && (
                        <tr className="bg-white/[0.01]">
                          <td colSpan={7} className="p-0 border-t border-white/5">
                            <RenewalHistoryPanel
                              history={historyRows}
                              loading={isHistoryLoading}
                              onViewRenewalInvoice={(h) => setViewingRenewalInvoice(h)}
                              onUploadRenewalInvoice={async (h, file) => {
                                const fd = new FormData();
                                fd.append('file', file);
                                const url = await uploadRenewalInvoiceForDomain(fd);
                                await setDomainRenewalInvoiceUrl(h.id, url);
                                // Refresh history
                                const fresh = await getDomainRenewalHistory(o.id);
                                setHistoryData(prev => ({ ...prev, [o.id]: fresh }));
                              }}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
          )}
        </TableBody>
      </Table>

      {/* Edit Modal */}
      {editModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-black border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-white">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-semibold text-white">Edit Domain Order</h2>
              <button onClick={() => setEditModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Domain Name</label>
                  <input
                    type="text"
                    required
                    value={editDomain}
                    onChange={(e) => setEditDomain(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Client Email</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Registrar Source</label>
                  <select
                    value={editRegistrar}
                    onChange={(e) => setEditRegistrar(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors"
                  >
                    <option value="Cloudflare" className="bg-black text-white">Cloudflare</option>
                    <option value="Internet.bs" className="bg-black text-white">Internet.bs</option>
                    <option value="Namecheap" className="bg-black text-white">Namecheap</option>
                    <option value="GoDaddy" className="bg-black text-white">GoDaddy</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors"
                  >
                    <option value="pending" className="bg-black text-white">Pending</option>
                    <option value="active" className="bg-black text-white">Active</option>
                    <option value="expired" className="bg-black text-white">Expired</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={editExpiry}
                    onChange={(e) => setEditExpiry(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>

              {editStatus.toLowerCase() === "expired" &&
                selectedOrder.status.toLowerCase() !== "expired" && (
                  <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-4 space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-red-300">Expiry billing</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Choose whether to generate a renewal invoice so the client can pay again.
                      </p>
                    </div>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={createRenewalInvoiceOnExpire}
                        onChange={(e) => setCreateRenewalInvoiceOnExpire(e.target.checked)}
                        className="mt-1 rounded border-white/20 bg-white/5"
                      />
                      <span className="text-sm text-gray-300">
                        Create renewal invoice at ${parseFloat(editRenewPrice || "0").toFixed(2)} USD
                      </span>
                    </label>

                    {createRenewalInvoiceOnExpire && (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-400 block">Renewal Invoice Currency</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setExpireCurrency("USD")}
                            className={`py-2.5 px-4 rounded-2xl border text-sm font-semibold transition-all cursor-pointer ${
                              expireCurrency === "USD"
                                ? "border-brand-500 bg-brand-500/10 text-white"
                                : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            USD ($)
                          </button>
                          <button
                            type="button"
                            onClick={() => setExpireCurrency("LKR")}
                            className={`py-2.5 px-4 rounded-2xl border text-sm font-semibold transition-all cursor-pointer ${
                              expireCurrency === "LKR"
                                ? "border-brand-500 bg-brand-500/10 text-white"
                                : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            LKR (Rs.)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              {/* Exchange Rate Input — shown when cost currency is USD */}
              {editActualPriceCurrency === "USD" && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2 mt-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-amber-300 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      Fixed Exchange Rate (1 USD = ? LKR)
                    </label>
                    <button
                      type="button"
                      onClick={() => setEditActivationLkrRate(String(lkrRate))}
                      className="text-[11px] text-brand-400 hover:underline cursor-pointer"
                    >
                      Reset to Live Rate ({Math.round(lkrRate)} LKR)
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={editActivationLkrRate}
                    onChange={(e) => setEditActivationLkrRate(e.target.value)}
                    placeholder={`Live rate: ${lkrRate}`}
                    className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-amber-400 transition-colors font-mono"
                  />
                </div>
              )}

              <div className="grid sm:grid-cols-3 gap-4 border-t border-white/5 pt-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Cost Currency</label>
                  <select
                    value={editActualPriceCurrency}
                    onChange={(e) => setEditActualPriceCurrency(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="LKR">LKR (Rs.)</option>
                  </select>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-gray-400 block">Purchase Cost ({editActualPriceCurrency === "USD" ? "$" : "Rs."})</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editRegCost}
                    onChange={(e) => setEditRegCost(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1 border-t border-white/5 pt-4">
                <label className="text-xs font-semibold text-gray-400 block">Provider Invoice (Admin Only)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingInvoice(true);
                      try {
                        const convertedFile = await convertPdfToImage(file);
                        const formData = new FormData();
                        formData.append("file", convertedFile);
                        const url = await uploadProviderInvoice(formData);
                        setEditProviderInvoiceUrl(url);
                      } catch (err: any) {
                        alert("Failed to upload: " + err.message);
                      } finally {
                        setUploadingInvoice(false);
                      }
                    }}
                    className="hidden"
                    id="provider-invoice-upload"
                  />
                  <label
                    htmlFor="provider-invoice-upload"
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold cursor-pointer transition-colors text-white"
                  >
                    {uploadingInvoice ? "Uploading..." : editProviderInvoiceUrl ? "Change Invoice" : "Upload Invoice"}
                  </label>
                  {editProviderInvoiceUrl && (
                    <div className="flex items-center gap-2">
                      <a
                        href={editProviderInvoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-400 hover:underline"
                      >
                        View
                      </a>
                      <button
                        type="button"
                        onClick={() => setEditProviderInvoiceUrl(null)}
                        className="text-xs text-red-400 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 border-t border-white/5 pt-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Selling Price (Client Price - Registration)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editRegPrice}
                    onChange={(e) => setEditRegPrice(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Purchase Cost (Our Cost - Renewal)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editRenewCost}
                    onChange={(e) => setEditRenewCost(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Selling Price (Client Price - Renewal)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editRenewPrice}
                    onChange={(e) => setEditRenewPrice(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-2xl font-semibold transition-colors text-sm text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit || uploadingInvoice}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-semibold transition-colors text-sm disabled:opacity-50"
                >
                  {savingEdit ? "Saving..." : uploadingInvoice ? "Uploading..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expire Domain Modal */}
      {expireModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
          <div className="bg-black border border-white/10 rounded-3xl w-full max-w-md p-6 relative shadow-2xl">
            <button
              onClick={() => setExpireModalOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-white mb-2">Mark Domain as Expired</h3>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              Expire <span className="text-white font-semibold">{expiringDomainName}</span>. You can optionally create a renewal invoice so the client can pay again.
            </p>

            <div className="space-y-4 mb-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createRenewalInvoiceOnExpire}
                  onChange={(e) => setCreateRenewalInvoiceOnExpire(e.target.checked)}
                  className="mt-1 rounded border-white/20 bg-white/5"
                />
                <span className="text-sm text-gray-300">
                  Create renewal invoice for client payment
                </span>
              </label>

              {createRenewalInvoiceOnExpire ? (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-400 block">Billing Currency</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setExpireCurrency("USD")}
                      className={`py-3 px-4 rounded-2xl border text-sm font-semibold transition-all cursor-pointer text-center ${
                        expireCurrency === "USD"
                          ? "border-brand-500 bg-brand-500/10 text-white"
                          : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      USD ($)
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpireCurrency("LKR")}
                      className={`py-3 px-4 rounded-2xl border text-sm font-semibold transition-all cursor-pointer text-center ${
                        expireCurrency === "LKR"
                          ? "border-brand-500 bg-brand-500/10 text-white"
                          : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      LKR (Rs.)
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-amber-300/90 bg-amber-400/10 border border-amber-400/20 rounded-2xl px-4 py-3">
                  No invoice will be created. Use this when the client has confirmed they will not renew.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => setExpireModalOpen(false)}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-2xl font-semibold transition-colors text-sm text-gray-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmExpire}
                disabled={expiringWithInvoice}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-semibold transition-colors text-sm disabled:opacity-50 cursor-pointer"
              >
                {expiringWithInvoice ? "Expiring..." : "Confirm Expire"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activation & Currency Selection Modal */}
      {activationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
          <div className="bg-black border border-white/10 rounded-3xl w-full max-w-md p-6 relative shadow-2xl">
            <button
              onClick={() => setActivationModalOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-white mb-2">Activate Domain & Generate Invoice</h3>
            <p className="text-gray-400 text-sm mb-2 leading-relaxed">
              Select the billing currency for the registration invoice. 
            </p>
            <p className="text-xs text-brand-300/70 bg-brand-500/5 border border-brand-500/10 rounded-xl px-3 py-2 mb-6">
              Current rate: <span className="font-bold text-brand-300">1 USD = {lkrRate.toFixed(2)} LKR</span>
            </p>

            <div className="space-y-4 mb-6">
              <label className="text-xs font-semibold text-gray-400 block">Billing Currency</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedCurrency('USD')}
                  className={`py-3 px-4 rounded-2xl border text-sm font-semibold transition-all cursor-pointer text-center ${
                    selectedCurrency === 'USD'
                      ? 'border-brand-500 bg-brand-500/10 text-white'
                      : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  USD ($)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCurrency('LKR')}
                  className={`py-3 px-4 rounded-2xl border text-sm font-semibold transition-all cursor-pointer text-center ${
                    selectedCurrency === 'LKR'
                      ? 'border-brand-500 bg-brand-500/10 text-white'
                      : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  LKR (Rs.)
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => setActivationModalOpen(false)}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-2xl font-semibold transition-colors text-sm text-gray-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmActivation}
                disabled={activatingWithInvoice}
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-semibold transition-colors text-sm disabled:opacity-50 cursor-pointer"
              >
                {activatingWithInvoice ? "Activating..." : "Confirm & Activate"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Domain Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
          <div className="bg-black border border-white/10 rounded-3xl w-full max-w-md p-6 relative shadow-2xl text-white">
            <button
              onClick={() => setDeleteModalOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-white mb-2">Delete Domain Order</h3>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              Are you sure you want to delete the domain <span className="text-white font-semibold">{deletingDomainName}</span>?
            </p>

            <div className="space-y-4 mb-6">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={deletingWithInvoices}
                  onChange={(e) => setDeletingWithInvoices(e.target.checked)}
                  className="mt-1 rounded border-white/20 bg-white/5"
                />
                <div className="space-y-0.5">
                  <span className="text-sm text-gray-300 font-semibold block">Delete associated invoices</span>
                  <span className="text-xs text-gray-500 block">Deletes the registration invoice & all renewal invoices linked to this domain.</span>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-2xl font-semibold transition-colors text-sm text-gray-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-semibold transition-colors text-sm cursor-pointer"
              >
                Delete Domain
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Domain Order Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-black border border-white/10 rounded-3xl w-full max-w-xl p-6 relative shadow-2xl overflow-y-auto max-h-[90vh] text-white">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold mb-4">Add Domain Order</h3>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Client Email</label>
                  <input
                    type="email"
                    required
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Domain Name</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="example.com"
                      value={addDomainName}
                      onChange={(e) => setAddDomainName(e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white"
                    />
                    <button
                      type="button"
                      onClick={checkDomainAvailability}
                      disabled={searchLoading}
                      className="px-3 bg-brand-600 hover:bg-brand-500 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
                    >
                      {searchLoading ? "Checking..." : "Check API"}
                    </button>
                  </div>
                </div>
              </div>

              {searchResults && (
                <div className={`p-3 rounded-xl border text-xs ${searchResults.available ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                  {searchResults.available 
                    ? `✓ Domain is available! Registrar Cost: $${searchResults.reg_price_usd} (Renews: $${searchResults.renew_price_usd}). Prices auto-filled.` 
                    : `✗ WHOIS: Domain is already registered.`
                  }
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Registrar</label>
                  <input
                    type="text"
                    required
                    value={addRegistrar}
                    onChange={(e) => setAddRegistrar(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Status</label>
                  <select
                    value={addStatus}
                    onChange={(e) => setAddStatus(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>

              {/* Pricing Grid */}
              <div className="grid sm:grid-cols-4 gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Cost Currency</label>
                  <select
                    value={addActualPriceCurrency}
                    onChange={(e) => setAddActualPriceCurrency(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="LKR">LKR (Rs.)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Reg Cost</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={addRegCost}
                    onChange={(e) => setAddRegCost(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-gray-500 block">Selling Currency</span>
                  <div className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-400">
                    LKR (Rs.)
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Reg Price (Retail)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={addRegPrice}
                    onChange={(e) => setAddRegPrice(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white"
                  />
                </div>
              </div>

              {/* Renewal Pricing Grid */}
              <div className="grid sm:grid-cols-2 gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Renewal Cost ({addActualPriceCurrency === "USD" ? "$" : "Rs."})</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={addRenewCost}
                    onChange={(e) => setAddRenewCost(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Renewal Price (LKR)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={addRenewPrice}
                    onChange={(e) => setAddRenewPrice(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 block">Expiry Date</label>
                <input
                  type="date"
                  required
                  value={addExpiry}
                  onChange={(e) => setAddExpiry(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white"
                />
              </div>

              {/* Upload Provider Invoice */}
              <div className="space-y-1 border-t border-white/5 pt-4">
                <label className="text-xs font-semibold text-gray-400 block">Provider Invoice (Admin Only)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingAddInvoice(true);
                      try {
                        const convertedFile = await convertPdfToImage(file);
                        const formData = new FormData();
                        formData.append("file", convertedFile);
                        const url = await uploadProviderInvoice(formData);
                        setAddProviderInvoiceUrl(url);
                      } catch (err: any) {
                        alert("Failed to upload: " + err.message);
                      } finally {
                        setUploadingAddInvoice(false);
                      }
                    }}
                    className="hidden"
                    id="provider-invoice-add-upload-dom"
                  />
                  <label
                    htmlFor="provider-invoice-add-upload-dom"
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold cursor-pointer transition-colors text-white"
                  >
                    {uploadingAddInvoice ? "Uploading..." : addProviderInvoiceUrl ? "Change Invoice" : "Upload Invoice"}
                  </label>
                  {addProviderInvoiceUrl && (
                    <div className="flex items-center gap-2">
                      <a
                        href={addProviderInvoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-400 hover:underline"
                      >
                        View
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-2xl font-semibold transition-colors text-sm text-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit || uploadingAddInvoice}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-semibold transition-colors text-sm disabled:opacity-50 cursor-pointer"
                >
                  {savingEdit ? "Adding..." : uploadingAddInvoice ? "Uploading..." : "Add Domain"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Viewer Modal */}
      {viewingInvoice && <DomainInvoiceModal
        order={viewingInvoice.order}
        lkrRate={lkrRate}
        onClose={() => setViewingInvoice(null)}
      />}

      {viewingRenewalInvoice && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={() => setViewingRenewalInvoice(null)}>
          <div className="relative bg-black border border-white/10 rounded-3xl overflow-hidden max-w-3xl w-full max-h-[90vh] shadow-2xl" onClick={e => e.stopPropagation()}>
            <button className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-white/20 rounded-full text-white transition-colors cursor-pointer" onClick={() => setViewingRenewalInvoice(null)}>
              <X className="w-5 h-5" />
            </button>
            <div className="p-5 border-b border-white/10">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Renewal Invoice</p>
              <p className="text-white font-semibold mt-0.5">{viewingRenewalInvoice.domain_name} — {viewingRenewalInvoice.invoice_id}</p>
              <p className="text-xs text-gray-500 mt-0.5">{new Date(viewingRenewalInvoice.renewal_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="flex items-center justify-center p-6 bg-black/50 min-h-[400px]">
              <img src={viewingRenewalInvoice.renewal_invoice_url!} alt="Renewal Invoice" className="max-w-full max-h-full object-contain rounded-xl shadow-lg border border-white/5" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DomainInvoiceModal({
  order,
  lkrRate,
  onClose,
}: {
  order: DomainOrder;
  lkrRate: number;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'purchase' | 'renewals'>('purchase');
  const [renewals, setRenewals] = useState<DomainRenewalHistoryRow[]>([]);
  const [loadingRenewals, setLoadingRenewals] = useState(false);
  const [renewalIdx, setRenewalIdx] = useState(0);
  const [uploadingRenewal, setUploadingRenewal] = useState(false);
  const renewalFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;
    setLoadingRenewals(true);
    getDomainRenewalHistory(order.id).then(res => {
      if (isMounted) {
        setRenewals(res);
        setLoadingRenewals(false);
      }
    });
    return () => { isMounted = false; };
  }, [order.id]);

  const renewalInvoices = renewals.filter(r => r.renewal_invoice_url);

  const lockedRate    = order.activation_lkr_rate ?? null;
  const lockedCost    = order.activation_lkr_cost  ?? null;
  const lockedPrice   = order.activation_lkr_price ?? null;
  const effectiveRate = lockedRate ?? lkrRate;

  const costLkr   = lockedCost  != null ? lockedCost  : order.actual_price  * effectiveRate;
  const priceLkr  = lockedPrice != null ? lockedPrice : order.selling_price * effectiveRate;
  const profitLkr = priceLkr - costLkr;

  const fmtLKR = (v: number) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(v || 0);
  const fmtUSD = (v: number) => `$${v.toFixed(2)}`;

  const date = order.purchase_date
    ? new Date(order.purchase_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : order.created_at
    ? new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'N/A';

  async function handleRenewalUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingRenewal(true);
    try {
      let uploadFile = file;
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        if (!(window as any).pdfjsLib) {
          await new Promise<void>((res, rej) => {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
            s.onload = () => res(); s.onerror = rej;
            document.head.appendChild(s);
          });
        }
        const lib = (window as any).pdfjsLib;
        lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        const ab = await file.arrayBuffer();
        const pdf = await lib.getDocument({ data: ab }).promise;
        const page = await pdf.getPage(1);
        const vp = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = vp.width; canvas.height = vp.height;
        await page.render({ canvasContext: canvas.getContext('2d')!, viewport: vp }).promise;
        const blob = await new Promise<Blob>(r => canvas.toBlob(b => r(b!), 'image/png'));
        uploadFile = new File([blob], file.name.replace(/\.pdf$/i, '.png'), { type: 'image/png' });
      }
      const fd = new FormData();
      fd.append('file', uploadFile);
      const url = await uploadRenewalInvoiceForDomain(fd);
      
      // Target latest renewal record or create one
      const targetRow = renewals.find(r => r.id !== -1);
      if (targetRow) {
        await setDomainRenewalInvoiceUrl(targetRow.id, url);
        const updated = await getDomainRenewalHistory(order.id);
        setRenewals(updated);
        setRenewalIdx(updated.filter(r => r.renewal_invoice_url).length - 1);
      } else {
        alert("Upload successful! Please assign to a renewal record in the history panel below.");
      }
    } catch (err) {
      console.error('Renewal invoice upload failed:', err);
    } finally {
      setUploadingRenewal(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={onClose}>
      <div className="relative flex flex-col md:flex-row bg-black border border-white/10 rounded-3xl overflow-hidden max-w-5xl w-full max-h-[90vh] shadow-2xl" onClick={e => e.stopPropagation()}>
        <button className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-white/20 rounded-full text-white transition-colors backdrop-blur-md cursor-pointer" onClick={onClose}>
          <X className="w-5 h-5" />
        </button>

        {/* Left panel — clean receipt style */}
        <div className="w-full md:w-72 shrink-0 bg-white/5 p-8 flex flex-col gap-6 border-b md:border-b-0 md:border-r border-white/10 overflow-y-auto">
          <div>
            <h3 className="text-xl font-bold text-white">Domain Provider Invoice</h3>
            <p className="text-sm text-gray-400">Transaction Information</p>
          </div>

          <div className="space-y-5">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Domain</p>
              <p className="text-sm font-semibold text-white">{order.domain_name}</p>
            </div>

            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Purchase Cost</p>
              <p className="text-3xl font-bold text-green-400">{fmtUSD(order.actual_price)}</p>
              {lockedRate != null && (
                <p className="text-xs text-amber-300/70 mt-0.5">{fmtLKR(costLkr)} <span className="text-[10px]">@{Math.round(effectiveRate)}</span></p>
              )}
            </div>

            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Date</p>
              <p className="text-sm font-medium text-white">{date}</p>
            </div>

            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Client</p>
              <p className="text-sm font-medium text-white">{order.client_email}</p>
            </div>

            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Registrar</p>
              <p className="text-sm font-medium text-white">{order.registrar || 'Internet.bs'}</p>
            </div>

            <hr className="border-white/10" />

            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Financials</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Actual Cost</span>
                  <span className="text-white font-medium">{fmtUSD(order.actual_price)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Selling Price</span>
                  <span className="text-white font-medium">{fmtUSD(order.selling_price)}</span>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-2">
                  <span className="text-gray-400">Profit</span>
                  <span className={`font-bold ${profitLkr >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtLKR(profitLkr)}</span>
                </div>
              </div>
            </div>

            {order.invoice_id && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Linked Invoice</p>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-500/10 border border-brand-500/20 rounded-xl text-brand-400 font-mono text-sm">
                  <FileText className="w-3.5 h-3.5" />{order.invoice_id}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right panel — invoice images & tabs */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Tabs */}
          <div className="flex border-b border-white/10 bg-black/30">
            <button
              onClick={() => setTab('purchase')}
              className={`px-5 py-3 text-sm font-medium transition-colors cursor-pointer ${
                tab === 'purchase' ? 'text-white border-b-2 border-brand-500' : 'text-gray-500 hover:text-gray-300'
              }`}
            >Provider Invoice</button>
            <button
              onClick={() => { setTab('renewals'); setRenewalIdx(Math.max(0, renewalInvoices.length - 1)); }}
              className={`px-5 py-3 text-sm font-medium transition-colors cursor-pointer flex items-center gap-2 ${
                tab === 'renewals' ? 'text-white border-b-2 border-brand-500' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Renewal Invoices
              {renewalInvoices.length > 0 && <span className="text-[10px] bg-brand-500 text-white rounded-full px-1.5 py-0.5">{renewalInvoices.length}</span>}
            </button>
          </div>

          {tab === 'purchase' && (
            <div className="flex-1 flex items-center justify-center p-6 bg-black/50 overflow-auto">
              {order.provider_invoice_url ? (
                <img src={order.provider_invoice_url} alt="Provider Invoice" className="max-w-full max-h-full object-contain rounded-xl shadow-lg border border-white/5" />
              ) : (
                <p className="text-gray-500 text-sm">No provider invoice uploaded</p>
              )}
            </div>
          )}

          {tab === 'renewals' && (
            <div className="flex-1 flex flex-col">
              {loadingRenewals ? (
                <div className="flex-1 flex items-center justify-center p-8 text-gray-500 text-sm gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Loading renewal invoices...
                </div>
              ) : renewalInvoices.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
                  <RefreshCw className="w-10 h-10 text-gray-700" />
                  <p className="text-gray-500 text-sm text-center">No renewal invoices yet.<br/>Upload one below.</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                  {/* Invoice image */}
                  <div className="flex-1 flex items-center justify-center p-6 bg-black/50 overflow-auto relative">
                    <img
                      src={renewalInvoices[renewalIdx]?.renewal_invoice_url!}
                      alt={`Renewal Invoice ${renewalIdx + 1}`}
                      className="max-w-full max-h-full object-contain rounded-xl shadow-lg border border-white/5"
                    />
                    {/* Nav arrows */}
                    {renewalInvoices.length > 1 && (
                      <>
                        <button
                          onClick={() => setRenewalIdx(i => Math.max(0, i - 1))}
                          disabled={renewalIdx === 0}
                          className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/70 hover:bg-white/20 rounded-full text-white disabled:opacity-30 transition-all cursor-pointer"
                        ><ChevronLeft className="w-5 h-5" /></button>
                        <button
                          onClick={() => setRenewalIdx(i => Math.min(renewalInvoices.length - 1, i + 1))}
                          disabled={renewalIdx === renewalInvoices.length - 1}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/70 hover:bg-white/20 rounded-full text-white disabled:opacity-30 transition-all cursor-pointer"
                        ><ChevronRight className="w-5 h-5" /></button>
                      </>
                    )}
                  </div>
                  {/* Thumbnails + meta */}
                  <div className="p-4 border-t border-white/10 bg-black/30 flex items-center gap-3 overflow-x-auto">
                    {renewalInvoices.map((inv, i) => (
                      <button
                        key={i}
                        onClick={() => setRenewalIdx(i)}
                        className={`shrink-0 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                          i === renewalIdx ? 'border-brand-500' : 'border-white/10 opacity-50 hover:opacity-80'
                        }`}
                      >
                        <img src={inv.renewal_invoice_url!} alt={`Thumbnail ${i+1}`} className="w-14 h-14 object-cover" />
                      </button>
                    ))}
                    <div className="ml-auto text-xs text-gray-500 shrink-0">
                      {renewalIdx + 1} / {renewalInvoices.length}
                      {renewalInvoices[renewalIdx]?.renewal_date && (
                        <div>{new Date(renewalInvoices[renewalIdx].renewal_date).toLocaleDateString()}</div>
                      )}
                      {renewalInvoices[renewalIdx]?.invoice_id && (
                        <div className="text-gray-400 font-mono">{renewalInvoices[renewalIdx].invoice_id}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {/* Upload new renewal invoice */}
              <div className="p-4 border-t border-white/10 bg-black/20">
                <p className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wider">Add Renewal Invoice</p>
                <input ref={renewalFileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleRenewalUpload} />
                <button
                  onClick={() => renewalFileRef.current?.click()}
                  disabled={uploadingRenewal}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  {uploadingRenewal ? <><RefreshCw className="w-4 h-4 animate-spin" />Uploading...</> : <><Upload className="w-4 h-4" />Upload Renewal Invoice</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
