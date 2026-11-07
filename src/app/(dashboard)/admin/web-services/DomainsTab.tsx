"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
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
  linkInvoiceToDomainOrder,
  getInvoicesForLinking,
  syncDomainFromCloudflare,
  syncAllDomainsFromCloudflare,
  manualRegisterDomain,
  getTldPricing,
  updateTldPricing,
  getAdminAuditLogs,
  TldPricingItem,
} from "../actions/domains";
import { TldPricingModal, AdminAuditLogsModal } from "./AdminDomainModals";
import DomainControlCenterModal from "@/components/services/DomainControlCenterModal";
import {
  Globe,
  AlertTriangle,
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
  Link2,
  Unlink,
  ExternalLink,
  Settings2,
  Sliders,
  Sparkles,
  ShieldCheck,
  Server,
  Loader2,
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

/** Compact single-line: shows USD/LKR pair with rate and highlights fixed bank amounts */
function RegPricePair({
  usd,
  lockedLkr,
  lockedRate,
  liveRate,
  isActivated,
  dimmed = false,
  currency = "USD",
}: {
  usd: number;
  lockedLkr?: number | null;
  lockedRate?: number | null;
  liveRate: number;
  isActivated: boolean;
  dimmed?: boolean;
  currency?: string;
}) {
  const isLkr = currency === "LKR";
  const rate = lockedRate != null && lockedRate > 0 ? lockedRate : liveRate;
  const lkrValue = lockedLkr != null ? lockedLkr : (isLkr ? usd : usd * rate);
  const usdValue = isLkr ? (rate > 0 ? lkrValue / rate : usd) : usd;
  const isFixed = lockedLkr != null || (isActivated && lockedRate != null);

  if (isLkr) {
    return (
      <div className={`text-sm ${dimmed ? "text-gray-400" : "text-white font-medium"}`}>
        {formatLKR(lkrValue)}
        <span className="text-xs font-normal ml-1 text-gray-500">
          ({formatUSD(usdValue)}
          <span className="text-gray-600 text-[9px] ml-0.5"> @{Math.round(rate)}</span>)
        </span>
      </div>
    );
  }

  return (
    <div className={`text-sm ${dimmed ? "text-gray-400" : "text-white font-medium"}`}>
      {formatUSD(usdValue)}
      <span className={`text-xs font-normal ml-1 ${isFixed ? "text-amber-300/90 font-medium" : "text-gray-500"}`}>
        ({formatLKR(lkrValue)}
        <span className={`${isFixed ? "text-amber-300/80" : "text-gray-500"} text-[9px] ml-0.5`}> @{Math.round(rate)}</span>)
      </span>
    </div>
  );
}

/** Compact single-line renewal: supports LKR and USD currencies */
function RenewalPricePair({
  usd,
  lockedLkr,
  lockedRate,
  liveRate,
  dimmed = false,
  currency = "USD",
}: {
  usd: number;
  lockedLkr?: number | null;
  lockedRate?: number | null;
  liveRate: number;
  dimmed?: boolean;
  currency?: string;
}) {
  const isLkr = currency === "LKR";
  const rate = lockedRate != null && lockedRate > 0 ? lockedRate : liveRate;
  const lkrValue = lockedLkr != null ? lockedLkr : (isLkr ? usd : usd * rate);
  const usdValue = isLkr ? (rate > 0 ? lkrValue / rate : usd) : usd;
  const isFixed = lockedLkr != null;

  if (isLkr) {
    return (
      <div className={`text-sm ${dimmed ? "text-gray-400" : "text-white font-medium"}`}>
        {formatLKR(lkrValue)}
        <span className="text-xs font-normal ml-1 text-gray-500">
          ({formatUSD(usdValue)}
          <span className="text-gray-600 text-[9px] ml-0.5"> @{Math.round(rate)}</span>)
        </span>
      </div>
    );
  }

  return (
    <div className={`text-sm ${dimmed ? "text-gray-400" : "text-white font-medium"}`}>
      {formatUSD(usdValue)}
      <span className={`text-xs font-normal ml-1 ${isFixed ? "text-amber-300/90 font-medium" : "text-gray-500"}`}>
        ({formatLKR(lkrValue)}
        <span className={`${isFixed ? "text-amber-300/80" : "text-gray-500"} text-[9px] ml-0.5`}> @{Math.round(rate)}</span>)
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
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const fetcher = async () => {
    const [rateRes, data, renewals] = await Promise.all([
      fetch("https://open.er-api.com/v6/latest/USD").then(r => r.ok ? r.json() : null).catch(() => null),
      getDomainOrders(),
      getAllRenewalHistory(),
    ]);
    return {
      orders: data,
      allRenewals: renewals,
      lkrRate: rateRes?.rates?.LKR || 300,
    };
  };

  const { data: swrData, isLoading: loading, mutate } = useSWR(['admin-domains'], fetcher);
  const { orders = [], allRenewals = [], lkrRate = 300 } = swrData || {};

  const loadData = async () => {
    await mutate();
  };

  useEffect(() => {
    const handleOpenAdd = () => {
      router.push("/admin/web-services/domains/new");
    };
    window.addEventListener("domains:open-add", handleOpenAdd);
    return () => {
      window.removeEventListener("domains:open-add", handleOpenAdd);
    };
  }, [router]);

  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState("All");

  // Advanced Filters
  const [selectedTldFilter, setSelectedTldFilter] = useState("All");
  const [onlyExpiringSoon, setOnlyExpiringSoon] = useState(false);

  // Cloudflare Admin Control & Sync States
  const [selectedControlDomain, setSelectedControlDomain] = useState<DomainOrder | null>(null);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [provisioningId, setProvisioningId] = useState<number | null>(null);

  // TLD Pricing Manager Modal
  const [isTldPricingOpen, setIsTldPricingOpen] = useState(false);

  // Audit Log Modal
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // Cloudflare Admin Handlers
  const handleSyncDomain = async (id: number) => {
    setSyncingId(id);
    try {
      const res = await syncDomainFromCloudflare(id);
      if (!res.success) throw new Error(res.error || "Failed to sync domain");
      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSyncingId(null);
    }
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    try {
      const res = await syncAllDomainsFromCloudflare();
      alert(`Cloudflare sync complete: ${res.totalSynced} domains synchronized.`);
      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSyncingAll(false);
    }
  };

  const handleManualProvision = async (id: number) => {
    const isSandboxConfirmed = confirm(
      "🛡️ SAFETY NOTICE (Sandbox Active):\n\n" +
      "This operation runs in Sandbox Mode (CLOUDFLARE_ENV=sandbox).\n" +
      "NO real money or credit card charges will be made to your Cloudflare account.\n\n" +
      "Proceed with simulated registration and DNS zone establishment?"
    );
    if (!isSandboxConfirmed) return;
    setProvisioningId(id);
    try {
      const res = await manualRegisterDomain(id);
      if (!res.success) throw new Error(res.error || "Provisioning failed");
      alert("Domain successfully provisioned in Sandbox and DNS zone established!");
      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProvisioningId(null);
    }
  };

  // Renewal history state per domain id
  const [expandedHistory, setExpandedHistory] = useState<Record<number, boolean>>({});
  const [historyData, setHistoryData] = useState<Record<number, DomainRenewalHistoryRow[]>>({});
  const [historyLoading, setHistoryLoading] = useState<Record<number, boolean>>({});

  // Quick Invoice Linking Modal States
  const [linkingDomainOrder, setLinkingDomainOrder] = useState<DomainOrder | null>(null);
  const [linkingInvoices, setLinkingInvoices] = useState<any[]>([]);
  const [loadingLinkInvoices, setLoadingLinkInvoices] = useState(false);
  const [manualInvoiceId, setManualInvoiceId] = useState("");
  const [savingLink, setSavingLink] = useState(false);

  // Available invoices for selection in Add/Edit modals
  const [modalInvoices, setModalInvoices] = useState<any[]>([]);
  const [loadingModalInvoices, setLoadingModalInvoices] = useState(false);

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
  const [editRegistrar, setEditRegistrar] = useState("Cloudflare");
  const [editActualPriceCurrency, setEditActualPriceCurrency] = useState("USD");
  const [editRegCost, setEditRegCost] = useState("");
  const [editRegBankLkr, setEditRegBankLkr] = useState("");
  const [editActivationLkrRate, setEditActivationLkrRate] = useState<string>("");
  const [editRegPrice, setEditRegPrice] = useState("");
  const [editRegPriceLkr, setEditRegPriceLkr] = useState("");
  const [editRenewCost, setEditRenewCost] = useState("");
  const [editRenewCostCurrency, setEditRenewCostCurrency] = useState("USD");
  const [editRenewBankLkr, setEditRenewBankLkr] = useState("");
  const [editRenewRate, setEditRenewRate] = useState("");
  const [editRenewPrice, setEditRenewPrice] = useState("");
  const [editRenewPriceLkr, setEditRenewPriceLkr] = useState("");
  const [editInvoiceId, setEditInvoiceId] = useState("");
  const [editStatus, setEditStatus] = useState("pending");
  const [editExpiry, setEditExpiry] = useState("");
  const [createRenewalInvoiceOnExpire, setCreateRenewalInvoiceOnExpire] = useState(true);
  const [expireCurrency, setExpireCurrency] = useState<"USD" | "LKR">("USD");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editProviderInvoiceUrl, setEditProviderInvoiceUrl] = useState<string | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<{ order: DomainOrder } | null>(null);
  const [viewingRenewalInvoice, setViewingRenewalInvoice] = useState<DomainRenewalHistoryRow | null>(null);
  const [uploadingInvoice, setUploadingInvoice] = useState(false);

  // Add Domain Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addDomainName, setAddDomainName] = useState("");
  const [addRegistrar, setAddRegistrar] = useState("Cloudflare");
  const [addActualPriceCurrency, setAddActualPriceCurrency] = useState("USD");
  const [addRegCost, setAddRegCost] = useState("");
  const [addRegBankLkr, setAddRegBankLkr] = useState("");
  const [addRegRate, setAddRegRate] = useState("");
  const [addRegPrice, setAddRegPrice] = useState("");
  const [addRegPriceLkr, setAddRegPriceLkr] = useState("");
  const [addRenewCost, setAddRenewCost] = useState("");
  const [addRenewCostCurrency, setAddRenewCostCurrency] = useState("USD");
  const [addRenewBankLkr, setAddRenewBankLkr] = useState("");
  const [addRenewRate, setAddRenewRate] = useState("");
  const [addRenewPrice, setAddRenewPrice] = useState("");
  const [addRenewPriceLkr, setAddRenewPriceLkr] = useState("");
  const [addInvoiceId, setAddInvoiceId] = useState("");
  const [addStatus, setAddStatus] = useState("active");
  const [addExpiry, setAddExpiry] = useState("");
  const [addProviderInvoiceUrl, setAddProviderInvoiceUrl] = useState<string | null>(null);
  const [uploadingAddInvoice, setUploadingAddInvoice] = useState(false);

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
    await mutate();
  };

  const handleOpenAddModal = async () => {
    setAddEmail("");
    setAddDomainName("");
    setAddRegistrar("Cloudflare");
    setAddActualPriceCurrency("USD");
    setAddRegCost("");
    setAddRegBankLkr("");
    setAddRegRate(String(lkrRate.toFixed(2)));
    setAddRegPrice("");
    setAddRegPriceLkr("");
    setAddRenewCost("");
    setAddRenewCostCurrency("USD");
    setAddRenewBankLkr("");
    setAddRenewRate(String(lkrRate.toFixed(2)));
    setAddRenewPrice("");
    setAddRenewPriceLkr("");
    setAddInvoiceId("");
    const exp = new Date();
    exp.setFullYear(exp.getFullYear() + 1);
    setAddExpiry(exp.toISOString().split("T")[0]);
    setAddStatus("active");
    setAddProviderInvoiceUrl(null);
    setSearchResults(null);
    setIsAddModalOpen(true);

    setLoadingModalInvoices(true);
    try {
      const invs = await getInvoicesForLinking();
      setModalInvoices(invs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingModalInvoices(false);
    }
  };

  const checkDomainAvailability = async () => {
    if (!addDomainName || !addDomainName.includes(".")) {
      alert("Please enter a valid domain name");
      return;
    }
    setSearchLoading(true);
    setSearchResults(null);
    try {
      const res = await fetch(`/api/services/domains/check?domain=${encodeURIComponent(addDomainName)}`);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error(data?.error || "Failed to check domain");
      setSearchResults(data);
      if (data.available) {
        const costUsd = data.reg_price_usd || 10.46;
        const renCostUsd = data.renew_price_usd || 10.46;
        setAddRegCost(String(costUsd));
        setAddRenewCost(String(renCostUsd));
        const rate = parseFloat(addRegRate) || lkrRate;
        const bankLkr = (costUsd * rate).toFixed(2);
        setAddRegBankLkr(bankLkr);
        setAddRenewBankLkr((renCostUsd * rate).toFixed(2));
        
        // Retail slightly higher
        const sellUsd = Number((costUsd * 1.35).toFixed(2));
        const renSellUsd = Number((renCostUsd * 1.35).toFixed(2));
        setAddRegPrice(String(sellUsd));
        setAddRegPriceLkr(String((sellUsd * rate).toFixed(2)));
        setAddRenewPrice(String(renSellUsd));
        setAddRenewPriceLkr(String((renSellUsd * rate).toFixed(2)));
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

    const isLkr = addActualPriceCurrency === "LKR";
    const rawCost = parseFloat(addRegCost) || 0;
    const bankDeductionLkr = parseFloat(addRegBankLkr) || (isLkr ? rawCost : rawCost * lkrRate);
    
    // Effective exchange rate
    const effRate = isLkr 
      ? lkrRate 
      : (rawCost > 0 && bankDeductionLkr > 0 ? bankDeductionLkr / rawCost : (parseFloat(addRegRate) || lkrRate));

    const regSellLkr = parseFloat(addRegPriceLkr) || (parseFloat(addRegPrice) ? parseFloat(addRegPrice) * effRate : 0);
    const regSellUsd = parseFloat(addRegPrice) || (effRate > 0 ? regSellLkr / effRate : 0);
    const regCostUsd = isLkr ? (effRate > 0 ? rawCost / effRate : 0) : rawCost;
    const profitUsd = regSellUsd - regCostUsd;

    // Renewal
    const isRenLkr = addRenewCostCurrency === "LKR";
    const rawRenCost = parseFloat(addRenewCost) || 0;
    const renBankLkr = parseFloat(addRenewBankLkr) || (isRenLkr ? rawRenCost : rawRenCost * effRate);
    const renRate = isRenLkr 
      ? effRate 
      : (rawRenCost > 0 && renBankLkr > 0 ? renBankLkr / rawRenCost : (parseFloat(addRenewRate) || effRate));
    const renSellLkr = parseFloat(addRenewPriceLkr) || (parseFloat(addRenewPrice) ? parseFloat(addRenewPrice) * renRate : 0);
    const renSellUsd = parseFloat(addRenewPrice) || (renRate > 0 ? renSellLkr / renRate : 0);

    const res = await addDomainOrder({
      client_email: addEmail,
      domain_name: addDomainName,
      actual_price: isLkr ? rawCost : regCostUsd,
      actual_price_currency: addActualPriceCurrency,
      selling_price: isLkr ? (effRate > 0 ? regSellLkr / effRate : regSellLkr) : regSellUsd,
      profit: profitUsd,
      renewal_cost: isRenLkr ? rawRenCost : (parseFloat(addRenewCost) || 0),
      renewal_price: isRenLkr ? (renRate > 0 ? renSellLkr / renRate : renSellLkr) : renSellUsd,
      renewal_cost_currency: addRenewCostCurrency,
      renewal_lkr_cost: renBankLkr,
      renewal_lkr_price: renSellLkr,
      renewal_lkr_rate: renRate,
      registrar: addRegistrar,
      expiry_date: addExpiry ? addExpiry + " 00:00:00" : "",
      status: addStatus,
      invoice_id: addInvoiceId.trim() || null,
      provider_invoice_url: addProviderInvoiceUrl,
      activation_lkr_cost: bankDeductionLkr,
      activation_lkr_price: regSellLkr,
      activation_lkr_rate: effRate,
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
        await mutate();
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
        await mutate();
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

  const handleOpenEditModal = async (order: DomainOrder) => {
    setSelectedOrder(order);
    const isLkr = order.actual_price_currency === "LKR";
    const rate = order.activation_lkr_rate || lkrRate;

    setEditEmail(order.client_email);
    setEditDomain(order.domain_name);
    setEditRegistrar(order.registrar || "Cloudflare");
    setEditActualPriceCurrency(order.actual_price_currency || "USD");
    setEditRegCost(String(order.actual_price || ""));
    setEditRegBankLkr(
      order.activation_lkr_cost != null
        ? String(order.activation_lkr_cost)
        : (isLkr ? String(order.actual_price || "") : String(((order.actual_price || 0) * rate).toFixed(2)))
    );
    setEditActivationLkrRate(String(rate.toFixed(2)));
    setEditRegPrice(String(order.selling_price || ""));
    setEditRegPriceLkr(
      order.activation_lkr_price != null
        ? String(order.activation_lkr_price)
        : String(((order.selling_price || 0) * rate).toFixed(2))
    );

    const isRenLkr = order.renewal_cost_currency === "LKR";
    const renRate = order.renewal_lkr_rate || rate;
    setEditRenewCost(String(order.renewal_cost || (isRenLkr ? 3500 : 14.25)));
    setEditRenewCostCurrency(order.renewal_cost_currency || (isLkr ? "LKR" : "USD"));
    setEditRenewBankLkr(
      order.renewal_lkr_cost != null
        ? String(order.renewal_lkr_cost)
        : (isRenLkr ? String(order.renewal_cost || 3500) : String(((order.renewal_cost || 14.25) * renRate).toFixed(2)))
    );
    setEditRenewRate(String(renRate.toFixed(2)));
    setEditRenewPrice(String(order.renewal_price || (isRenLkr ? 5000 : 19.99)));
    setEditRenewPriceLkr(
      order.renewal_lkr_price != null
        ? String(order.renewal_lkr_price)
        : String(((order.renewal_price || (isRenLkr ? 5000 : 19.99)) * renRate).toFixed(2))
    );

    setEditInvoiceId(order.invoice_id || "");
    setEditStatus(order.status);
    setEditExpiry(order.expiry_date ? order.expiry_date.split("T")[0] : "");
    setCreateRenewalInvoiceOnExpire(true);
    setExpireCurrency("USD");
    setEditProviderInvoiceUrl(order.provider_invoice_url || null);
    setEditModalOpen(true);

    setLoadingModalInvoices(true);
    try {
      const invs = await getInvoicesForLinking(order.client_email);
      setModalInvoices(invs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingModalInvoices(false);
    }
  };

  const handleOpenLinkModal = async (order: DomainOrder) => {
    setLinkingDomainOrder(order);
    setManualInvoiceId(order.invoice_id || "");
    setLoadingLinkInvoices(true);
    try {
      const invs = await getInvoicesForLinking(order.client_email);
      setLinkingInvoices(invs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLinkInvoices(false);
    }
  };

  const handleSaveInvoiceLink = async (invId: string | null) => {
    if (!linkingDomainOrder) return;
    setSavingLink(true);
    try {
      const res = await linkInvoiceToDomainOrder(linkingDomainOrder.id, invId);
      if (res.success) {
        alert(invId ? `Linked invoice ${invId} successfully!` : "Invoice unlinked successfully!");
        setLinkingDomainOrder(null);
        await fetchOrders();
      } else {
        alert("Failed to link invoice: " + ((res as any).error || "Unknown error"));
      }
    } catch (err: any) {
      alert("Error linking invoice: " + err.message);
    } finally {
      setSavingLink(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setSavingEdit(true);

    const isLkr = editActualPriceCurrency === "LKR";
    const rawCost = parseFloat(editRegCost) || 0;
    const bankDeductionLkr = parseFloat(editRegBankLkr) || (isLkr ? rawCost : rawCost * lkrRate);
    
    // Effective exchange rate
    const effRate = isLkr 
      ? lkrRate 
      : (rawCost > 0 && bankDeductionLkr > 0 ? bankDeductionLkr / rawCost : (parseFloat(editActivationLkrRate) || lkrRate));

    const regSellLkr = parseFloat(editRegPriceLkr) || (parseFloat(editRegPrice) ? parseFloat(editRegPrice) * effRate : 0);
    const regSellUsd = parseFloat(editRegPrice) || (effRate > 0 ? regSellLkr / effRate : 0);
    const regCostUsd = isLkr ? (effRate > 0 ? rawCost / effRate : 0) : rawCost;
    const profitUsd = regSellUsd - regCostUsd;

    // Renewal
    const isRenLkr = editRenewCostCurrency === "LKR";
    const rawRenCost = parseFloat(editRenewCost) || 0;
    const renBankLkr = parseFloat(editRenewBankLkr) || (isRenLkr ? rawRenCost : rawRenCost * effRate);
    const renRate = isRenLkr 
      ? effRate 
      : (rawRenCost > 0 && renBankLkr > 0 ? renBankLkr / rawRenCost : (parseFloat(editRenewRate) || effRate));
    const renSellLkr = parseFloat(editRenewPriceLkr) || (parseFloat(editRenewPrice) ? parseFloat(editRenewPrice) * renRate : 0);
    const renSellUsd = parseFloat(editRenewPrice) || (renRate > 0 ? renSellLkr / renRate : 0);

    const isBecomingExpired =
      editStatus.toLowerCase() === "expired" &&
      selectedOrder.status.toLowerCase() !== "expired";

    try {
      const res = await updateDomainOrder(
        selectedOrder.id,
        {
          client_email: editEmail,
          domain_name: editDomain,
          actual_price: isLkr ? rawCost : regCostUsd,
          actual_price_currency: editActualPriceCurrency,
          selling_price: isLkr ? (effRate > 0 ? regSellLkr / effRate : regSellLkr) : regSellUsd,
          profit: profitUsd,
          renewal_cost: isRenLkr ? rawRenCost : (parseFloat(editRenewCost) || 0),
          renewal_price: isRenLkr ? (renRate > 0 ? renSellLkr / renRate : renSellLkr) : renSellUsd,
          renewal_cost_currency: editRenewCostCurrency,
          renewal_lkr_cost: renBankLkr,
          renewal_lkr_price: renSellLkr,
          renewal_lkr_rate: renRate,
          registrar: editRegistrar,
          expiry_date: editExpiry,
          status: editStatus,
          provider_invoice_url: editProviderInvoiceUrl,
          activation_lkr_rate: effRate,
          activation_lkr_price: regSellLkr,
          activation_lkr_cost: bankDeductionLkr,
          invoice_id: editInvoiceId.trim() || null,
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
      case "pending_manual_registration":
      case "manual_review":
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

  const availableTlds = Array.from(
    new Set(orders.map((o) => o.domain_name.split(".").pop()?.toLowerCase()).filter(Boolean))
  );

  const filteredOrders = orders.filter((o) => {
    const statusMatch = activeFilter === "All" || o.status.toLowerCase() === activeFilter.toLowerCase();
    const searchMatch =
      o.domain_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.client_email.toLowerCase().includes(searchQuery.toLowerCase());

    const tld = o.domain_name.split(".").pop()?.toLowerCase();
    const tldMatch = selectedTldFilter === "All" || tld === selectedTldFilter.toLowerCase();

    const daysToExpiry = o.expiry_date
      ? Math.ceil((new Date(o.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;
    const expiryMatch = !onlyExpiringSoon || (daysToExpiry !== null && daysToExpiry > 0 && daysToExpiry <= 30);

    return statusMatch && searchMatch && tldMatch && expiryMatch;
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
      {/* Controls */}
      <PageHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search domains..."
        filters={["All", "Pending", "Active", "Expired"]}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        primaryActionLabel="Add Domain"
        onPrimaryAction={() => router.push("/admin/web-services/domains/new")}
      />

      {/* Action Required: Domains Pending Manual Cloudflare Purchase */}
      {orders.filter((o) => o.status === "pending_manual_registration" || o.status === "manual_review").length > 0 && (
        <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/30 space-y-3.5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-amber-400 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0 animate-pulse" />
              <span>Action Required: Domain Payment Received &mdash; Register on Cloudflare, then click Sync</span>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
              {orders.filter((o) => o.status === "pending_manual_registration" || o.status === "manual_review").length} pending purchase
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {orders
              .filter((o) => o.status === "pending_manual_registration" || o.status === "manual_review")
              .map((o) => (
                <div key={o.id} className="p-3.5 rounded-2xl bg-black/40 border border-amber-500/20 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-bold text-white tracking-wide text-sm">{o.domain_name}</div>
                    <div className="text-gray-400 text-xs mt-0.5">{o.client_email} &bull; Inv: {o.invoice_id || "Paid"}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSyncDomain(o.id)}
                      disabled={syncingId === o.id}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Fetch live zone from Cloudflare and activate client DNS"
                    >
                      {syncingId === o.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      <span>Sync Live CF</span>
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Domain Operations Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
        <div className="flex flex-wrap items-center gap-2">
          {/* TLD Extension Filter */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span>TLD:</span>
            <select
              value={selectedTldFilter}
              onChange={(e) => setSelectedTldFilter(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-white focus:outline-none"
            >
              <option value="All">All Extensions</option>
              {availableTlds.map((tld) => (
                <option key={tld} value={tld}>.{tld}</option>
              ))}
            </select>
          </div>

          {/* Expiring Soon Toggle */}
          <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300 cursor-pointer hover:bg-white/10 transition-colors">
            <input
              type="checkbox"
              checked={onlyExpiringSoon}
              onChange={(e) => setOnlyExpiringSoon(e.target.checked)}
              className="rounded text-brand-500 cursor-pointer"
            />
            <span>Expiring Soon (&le;30d)</span>
          </label>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsTldPricingOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-brand-400" />
            <span>TLD Pricing</span>
          </button>

          <button
            onClick={handleSyncAll}
            disabled={syncingAll}
            className="px-3.5 py-1.5 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/30 text-brand-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {syncingAll ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            <span>Sync Cloudflare</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableHead>Domain & Client</TableHead>
          <TableHead className="text-right">Cost Price</TableHead>
          <TableHead className="text-right">Selling Price</TableHead>
          <TableHead className="text-right text-brand-400">Profit</TableHead>
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

                  const isLkr = o.actual_price_currency === "LKR";
                  const effectiveRegRate = o.activation_lkr_rate != null && o.activation_lkr_rate > 0 ? o.activation_lkr_rate : lkrRate;

                  // Registration:
                  const lockedRegCostLkr = o.activation_lkr_cost ?? (isLkr ? o.actual_price : o.actual_price * effectiveRegRate);
                  const lockedRegPriceLkr = o.activation_lkr_price ?? (isLkr ? (o.selling_price || 0) : (o.selling_price || 0) * effectiveRegRate);
                  const regCostUsd = isLkr ? (effectiveRegRate > 0 ? lockedRegCostLkr / effectiveRegRate : 0) : o.actual_price;
                  const regPriceUsd = isLkr ? (effectiveRegRate > 0 ? lockedRegPriceLkr / effectiveRegRate : 0) : o.selling_price;
                  const regProfitUsd = regPriceUsd - regCostUsd;
                  const regProfitLkr = lockedRegPriceLkr - lockedRegCostLkr;
                  const isRegLocked = o.activation_lkr_cost != null || o.activation_lkr_price != null || (isActivated && o.activation_lkr_rate != null);

                  // Renewal:
                  const isRenLkr = o.renewal_cost_currency === "LKR";
                  const effectiveRenRate = o.renewal_lkr_rate != null && o.renewal_lkr_rate > 0 ? o.renewal_lkr_rate : effectiveRegRate;
                  const rawRenCost = o.renewal_cost || (isRenLkr ? 3500 : 14.25);
                  const rawRenPrice = o.renewal_price || (isRenLkr ? 5000 : 19.99);

                  const lockedRenCostLkr = o.renewal_lkr_cost ?? (isRenLkr ? rawRenCost : rawRenCost * effectiveRenRate);
                  const lockedRenPriceLkr = o.renewal_lkr_price ?? (isRenLkr ? rawRenPrice : rawRenPrice * effectiveRenRate);
                  const renewCostUsd = isRenLkr ? (effectiveRenRate > 0 ? lockedRenCostLkr / effectiveRenRate : 0) : rawRenCost;
                  const renewPriceUsd = isRenLkr ? (effectiveRenRate > 0 ? lockedRenPriceLkr / effectiveRenRate : 0) : rawRenPrice;
                  const renewProfitUsd = renewPriceUsd - renewCostUsd;
                  const renewProfitLkr = lockedRenPriceLkr - lockedRenCostLkr;
                  const isRenLocked = o.renewal_lkr_cost != null || o.renewal_lkr_price != null;
                  const isRenCostDiff = Math.abs(lockedRenCostLkr - lockedRegCostLkr) >= 0.05;
                  const isRenPriceDiff = Math.abs(lockedRenPriceLkr - lockedRegPriceLkr) >= 0.05;
                  const isRenProfitDiff = Math.abs(renewProfitLkr - regProfitLkr) >= 0.05;

                  const isHistoryOpen = expandedHistory[o.id] ?? false;
                  const historyRows = historyData[o.id] ?? [];
                  const isHistoryLoading = historyLoading[o.id] ?? false;

                  return (
                    <React.Fragment key={o.id}>
                      <TableRow className={isHistoryOpen ? "bg-white/[0.02]" : ""}>
                        <TableCell>
                          <div className="font-semibold text-white flex items-center gap-1.5 flex-wrap">
                            <Globe className="w-4 h-4 text-brand-400" />
                            <Link
                              href={`/admin/web-services/domains/${o.domain_uid || o.id}`}
                              className="hover:text-brand-400 transition-colors"
                            >
                              {o.domain_name}
                            </Link>
                            <span className="text-[10px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-gray-400 font-medium">
                              {o.registrar || 'Internet.bs'}
                            </span>
                            {o.invoice_id ? (
                              <Link
                                href={`/admin/invoice/${o.invoice_id}`}
                                title={`Open Invoice ${o.invoice_id}`}
                                className="text-[10px] bg-blue-500/10 border border-blue-500/30 text-blue-400 px-1.5 py-0.5 rounded font-mono font-medium flex items-center gap-1 hover:bg-blue-500/20 cursor-pointer"
                              >
                                <Link2 className="w-2.5 h-2.5" />
                                {o.invoice_id}
                              </Link>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenLinkModal(o)}
                                title="Link invoice manually"
                                className="text-[10px] text-gray-500 hover:text-brand-400 border border-dashed border-white/10 hover:border-brand-500/30 px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Link2 className="w-2.5 h-2.5" />
                                Link Inv
                              </button>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {o.client_email}
                          </div>
                          <div className="text-[10px] text-gray-500 mt-1.5 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                            <span>Ordered: {o.created_at ? new Date(o.created_at).toLocaleDateString() : (o.purchase_date ? new Date(o.purchase_date).toLocaleDateString() : 'N/A')}</span>
                          </div>
                        </TableCell>

                        {/* Cost Price */}
                        <TableCell className="text-right text-sm">
                          <div
                            className="text-white font-medium"
                            title={!isLkr ? `Registrar: $${regCostUsd.toFixed(2)} (Exchange Rate: ${Math.round(effectiveRegRate)} LKR/USD)` : undefined}
                          >
                            {formatLKR(lockedRegCostLkr)}
                          </div>
                          {isRenCostDiff && (
                            <div
                              className="text-xs text-gray-500 font-normal mt-0.5"
                              title={!isRenLkr ? `Renewal: $${renewCostUsd.toFixed(2)} (Rate: ${Math.round(effectiveRenRate)} LKR/USD)` : undefined}
                            >
                              Ren: {formatLKR(lockedRenCostLkr)}
                            </div>
                          )}
                        </TableCell>

                        {/* Selling Price */}
                        <TableCell className="text-right text-sm">
                          <div
                            className="text-white font-medium"
                            title={!isLkr ? `Client USD: $${regPriceUsd.toFixed(2)}` : undefined}
                          >
                            {formatLKR(lockedRegPriceLkr)}
                          </div>
                          {isRenPriceDiff && (
                            <div
                              className="text-xs text-gray-500 font-normal mt-0.5"
                              title={!isRenLkr ? `Renewal USD: $${renewPriceUsd.toFixed(2)}` : undefined}
                            >
                              Ren: {formatLKR(lockedRenPriceLkr)}
                            </div>
                          )}
                        </TableCell>

                        {/* Profit */}
                        <TableCell className="text-right font-semibold">
                          <div
                            className={regProfitLkr > 0 ? "text-brand-400" : regProfitLkr < 0 ? "text-red-400" : "text-gray-400"}
                            title={`Profit USD: $${regProfitUsd.toFixed(2)}`}
                          >
                            {formatLKR(regProfitLkr)}
                          </div>
                          {isRenProfitDiff && (
                            <div
                              className="text-xs text-gray-500 font-normal mt-0.5"
                              title={`Renewal Profit USD: $${renewProfitUsd.toFixed(2)}`}
                            >
                              Ren: {formatLKR(renewProfitLkr)}
                            </div>
                          )}
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
                            {o.status === "pending_manual_registration"
                              ? "Paid (Needs CF Purchase)"
                              : o.status === "manual_review"
                              ? "Manual Review"
                              : o.status}
                          </span>
                        </TableCell>

                        {/* Actions */}
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {/* Cloudflare Control Center */}
                            <Link
                              href={`/admin/web-services/domains/${o.domain_uid || o.id}`}
                              className="p-2 hover:bg-brand-500/20 text-brand-400 rounded-xl transition-colors flex items-center justify-center cursor-pointer"
                              title="Domain Control Center (DNS, Lock, DNSSEC, Nameservers)"
                            >
                              <Settings2 className="w-4 h-4" />
                            </Link>

                            {(o.status === "pending" || o.status === "pending_manual_registration" || o.status === "manual_review") && (
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
                              type="button"
                              onClick={() => handleOpenLinkModal(o)}
                              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                                o.invoice_id ? 'hover:bg-blue-500/10 text-blue-400' : 'hover:bg-white/10 text-gray-400 hover:text-white'
                              }`}
                              title={o.invoice_id ? `Linked to ${o.invoice_id} (Click to change/unlink)` : "Link Invoice"}
                            >
                              <Link2 className="w-4 h-4" />
                            </button>

                            <Link
                              href={`/admin/web-services/domains/${o.domain_uid || o.id}/edit`}
                              className="p-2 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-colors flex items-center justify-center cursor-pointer"
                              title="Edit Order"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Link>


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



      {/* Quick Invoice Linking Modal */}
      {linkingDomainOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md px-4">
          <div className="bg-black border border-white/10 rounded-3xl w-full max-w-lg p-6 relative shadow-2xl text-white">
            <button
              onClick={() => setLinkingDomainOrder(null)}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Link2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Link Invoice to Domain</h3>
                <p className="text-xs text-gray-400">{linkingDomainOrder.domain_name} ({linkingDomainOrder.client_email})</p>
              </div>
            </div>

            {linkingDomainOrder.invoice_id && (
              <div className="my-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-gray-400">Currently Linked:</span>
                  <span className="ml-1.5 font-mono font-bold text-blue-400">{linkingDomainOrder.invoice_id}</span>
                </div>
                <button
                  type="button"
                  disabled={savingLink}
                  onClick={() => handleSaveInvoiceLink("")}
                  className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Unlink className="w-3 h-3" />
                  Unlink
                </button>
              </div>
            )}

            <div className="space-y-4 my-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300 block">Select Invoice</label>
                {loadingLinkInvoices ? (
                  <div className="py-4 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Loading client invoices...
                  </div>
                ) : (
                  <div className="space-y-1.5 pr-1 border border-white/5 rounded-2xl p-2 bg-white/[0.02]">
                    {linkingInvoices.slice(0, 3).length === 0 ? (
                      <div className="py-4 text-center text-xs text-gray-500">
                        No recent invoices found. You can enter an ID manually below.
                      </div>
                    ) : (
                      linkingInvoices.slice(0, 3).map((inv) => {
                        const isMatch = inv.user_email?.toLowerCase() === linkingDomainOrder.client_email?.toLowerCase();
                        const isSelected = manualInvoiceId.trim() === inv.invoice_id;
                        return (
                          <button
                            key={inv.invoice_id}
                            type="button"
                            onClick={() => setManualInvoiceId(inv.invoice_id)}
                            className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? 'bg-blue-500/20 border-blue-500 text-white'
                                : 'bg-white/5 border-white/5 hover:bg-white/10 text-gray-300'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-xs">{inv.invoice_id}</span>
                                {isMatch && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-semibold">
                                    Client Match
                                  </span>
                                )}
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                  inv.payment_status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                                }`}>
                                  {inv.payment_status}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[260px]">{inv.user_email}</p>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-xs">{formatLKR(inv.total)}</span>
                              <p className="text-[10px] text-gray-500">
                                {inv.date ? new Date(inv.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                              </p>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 block">Or Enter Invoice ID Directly</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualInvoiceId}
                    onChange={(e) => setManualInvoiceId(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && manualInvoiceId.trim()) {
                        e.preventDefault();
                        handleSaveInvoiceLink(manualInvoiceId.trim());
                      }
                    }}
                    placeholder="e.g. INV-00049"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-500 font-mono text-white"
                  />
                  {manualInvoiceId && (
                    <button
                      type="button"
                      onClick={() => setManualInvoiceId("")}
                      className="px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs text-gray-400 hover:text-white"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setLinkingDomainOrder(null)}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-2xl font-semibold transition-colors text-sm text-gray-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingLink || !manualInvoiceId.trim()}
                onClick={() => handleSaveInvoiceLink(manualInvoiceId.trim())}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-semibold transition-colors text-sm disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <Link2 className="w-4 h-4" />
                {savingLink ? "Linking..." : "Link Invoice"}
              </button>
            </div>
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

      {/* Domain Control Center Modal */}
      {selectedControlDomain && (
        <DomainControlCenterModal
          isOpen={!!selectedControlDomain}
          onClose={() => setSelectedControlDomain(null)}
          domain={selectedControlDomain}
          userEmail={selectedControlDomain.client_email}
          onRefresh={loadData}
          isAdmin={true}
        />
      )}

      {/* TLD Pricing Manager Modal */}
      <TldPricingModal
        isOpen={isTldPricingOpen}
        onClose={() => setIsTldPricingOpen(false)}
      />

      {/* Domain Audit Log Modal */}
      <AdminAuditLogsModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
      />
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
