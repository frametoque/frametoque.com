"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Globe,
  ShieldCheck,
  Lock,
  Unlock,
  RefreshCw,
  Server,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  AlertTriangle,
  Loader2,
  Copy,
  ArrowRightLeft,
  History,
  Settings,
  CreditCard,
  Calendar,
  ExternalLink,
  Shield,
  Key,
  Eye,
  Clock,
  CheckCircle2,
  ArrowLeft,
  ShieldAlert,
} from "lucide-react";
import PayModal from "@/components/PayModal";

interface DnsRecord {
  id: string;
  type: string;
  name: string;
  content: string;
  ttl: number;
  proxied?: boolean;
  priority?: number;
}

export interface DomainControlCenterModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  domain?: any;
  domainId?: string | number;
  userEmail?: string;
  onRefresh?: () => void;
  onOpenPayModal?: (invoice: any) => void;
  isAdmin?: boolean;
  isPage?: boolean;
  backHref?: string;
}

function parseNameservers(val: any): string[] {
  if (Array.isArray(val)) {
    const filtered = val
      .filter((item) => typeof item === "string" && item.trim().length > 0)
      .filter((item) => !item.includes("frametoque.com"));
    if (filtered.length > 0) return filtered;
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          const filtered = parsed
            .filter((item) => typeof item === "string" && item.trim().length > 0)
            .filter((item) => !item.includes("frametoque.com"));
          if (filtered.length > 0) return filtered;
        }
      } catch {}
    }
    const parts = trimmed
      .split(/[,\s\n\r]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.includes("frametoque.com"));
    if (parts.length > 0) return parts;
  }
  if (val && typeof val === "object") {
    const values = Object.values(val);
    const filtered = values
      .map(String)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.includes("frametoque.com"));
    if (filtered.length > 0) return filtered;
  }
  return [];
}

const formatLKR = (amount: number | string | null | undefined) => {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num || 0);
};

export function DomainControlCenterView({
  isOpen = true,
  onClose,
  domain,
  domainId,
  userEmail,
  onRefresh,
  isAdmin = false,
  onOpenPayModal,
  isPage = false,
  backHref,
}: DomainControlCenterModalProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "dns" | "nameservers" | "renewals" | "settings"
  >("overview");

  // Domain details & states
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<any>(domain || null);
  const [isForbidden, setIsForbidden] = useState(false);
  const activeDomain = details || domain || {};
  const targetId = activeDomain?.domain_uid || domain?.domain_uid || domainId || activeDomain?.id || domain?.id;
  const activeNameservers = parseNameservers(details?.nameservers ?? activeDomain?.nameservers);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [payInvoice, setPayInvoice] = useState<any>(null);

  // DNS State
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([]);
  const [loadingDns, setLoadingDns] = useState(false);
  const [dnsError, setDnsError] = useState<string | null>(null);
  const [isAddingDns, setIsAddingDns] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [dnsForm, setDnsForm] = useState({
    type: "A",
    name: "@",
    content: "",
    ttl: 1, // 1 = Auto
    proxied: false,
    priority: 10,
  });
  const [togglingRecordId, setTogglingRecordId] = useState<string | null>(null);

  // Security & Toggles
  const [isLocked, setIsLocked] = useState(activeDomain?.locked ?? true);
  const [isAutoRenew, setIsAutoRenew] = useState(activeDomain?.auto_renew ?? false);
  const [togglingLock, setTogglingLock] = useState(false);
  const [togglingAutoRenew, setTogglingAutoRenew] = useState(false);

  // DNSSEC & Transfer
  const [dnssecEnabled, setDnssecEnabled] = useState(false);
  const [togglingDnssec, setTogglingDnssec] = useState(false);
  const [requestingTransfer, setRequestingTransfer] = useState(false);
  const [transferMessage, setTransferMessage] = useState<string | null>(null);

  // Renewal & Payment History
  const [historyRows, setHistoryRows] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Fetch full details
  const fetchDomainDetails = async () => {
    if (!targetId) return;
    setLoading(true);
    setError(null);
    setIsForbidden(false);
    try {
      const res = await fetch(`/api/services/domains/${targetId}`);
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) {
          setIsForbidden(true);
        }
        throw new Error(data.error || "Failed to load domain details.");
      }
      setDetails(data);
      setIsLocked(data.locked ?? true);
      setIsAutoRenew(data.auto_renew ?? false);
      if (data.dnssec_info?.status === "active") {
        setDnssecEnabled(true);
      } else {
        setDnssecEnabled(false);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Renewal & Payment History
  const fetchRenewalHistory = async () => {
    const emailToUse = userEmail || details?.client_email || activeDomain?.client_email;
    if (!targetId || !emailToUse) return;
    setLoadingHistory(true);
    try {
      const res = await fetch(
        `/api/services/domains/renewal-history?user_email=${encodeURIComponent(emailToUse)}&domain_id=${targetId}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      setHistoryRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load renewal history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Fetch DNS Records
  const fetchDnsRecords = async () => {
    if (!targetId) return;
    setLoadingDns(true);
    setDnsError(null);
    try {
      const res = await fetch(`/api/services/domains/${targetId}/dns`);
      const data = await res.json();
      if (res.ok) {
        setDnsRecords(data.records || []);
      } else {
        setDnsError(data.error || "Failed to load DNS records from Cloudflare.");
      }
    } catch (err: any) {
      console.error("Failed to load DNS records:", err);
      setDnsError(err.message || "Failed to load DNS records.");
    } finally {
      setLoadingDns(false);
    }
  };

  useEffect(() => {
    if ((isOpen || isPage) && targetId) {
      fetchDomainDetails();
      fetchDnsRecords();
      fetchRenewalHistory();
    }
  }, [isOpen, isPage, targetId]);

  // Build unified Invoices & Payment Ledger rows (hook must be called before any early return)
  const allLedgerRows = useMemo(() => {
    const rows: Array<{
      id: string | number;
      invoice_id: string;
      description: string;
      date: string;
      amount: number;
      status: string;
      isRenewal: boolean;
    }> = [];

    const seenInvoices = new Set<string>();

    // 1. Initial registration invoice
    if (activeDomain?.invoice_id) {
      seenInvoices.add(activeDomain.invoice_id);
      const regAmount = activeDomain.activation_lkr_price
        ? parseFloat(activeDomain.activation_lkr_price)
        : activeDomain.total_due
        ? parseFloat(activeDomain.total_due)
        : 0;
      rows.push({
        id: `reg-${activeDomain.invoice_id}`,
        invoice_id: activeDomain.invoice_id,
        description: `Initial Domain Registration (1 Year)`,
        date: activeDomain.created_at || activeDomain.purchase_date || new Date().toISOString(),
        amount: regAmount,
        status: activeDomain.payment_status || (activeDomain.status === "active" ? "paid" : "unpaid"),
        isRenewal: false,
      });
    }

    // 2. Renewal invoices from renewal-history
    for (const h of historyRows) {
      if (h.invoice_id && seenInvoices.has(h.invoice_id)) continue;
      if (h.invoice_id) seenInvoices.add(h.invoice_id);
      rows.push({
        id: h.id || `ren-${h.invoice_id}`,
        invoice_id: h.invoice_id,
        description: `Annual Domain Renewal (1 Year)`,
        date: h.renewal_date,
        amount: parseFloat(h.lkr_price || 0),
        status: h.status || "unpaid",
        isRenewal: true,
      });
    }

    // Sort descending by date
    return rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [activeDomain, historyRows]);

  if (!isPage && !isOpen) return null;

  if (!details && !domain && loading) {
    if (isPage) {
      return (
        <div className="w-full space-y-6">
          <Link
            href={backHref || (isAdmin ? "/admin/web-services/domains" : "/dashboard/domains")}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Domains</span>
          </Link>
          <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-16 text-center flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
            <p className="text-sm text-gray-400">Loading domain details...</p>
          </div>
        </div>
      );
    }
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div className="relative w-full max-w-lg bg-[#0c0d12] border border-white/10 rounded-3xl p-16 text-center flex flex-col items-center justify-center space-y-3 shadow-2xl">
          <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
          <p className="text-sm text-gray-400">Loading domain details...</p>
        </div>
      </div>
    );
  }

  if (!details && !domain && (error || isForbidden)) {
    if (isPage) {
      return (
        <div className="w-full space-y-6">
          <Link
            href={backHref || (isAdmin ? "/admin/web-services/domains" : "/dashboard/domains")}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Domains</span>
          </Link>
          <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white">
              {isForbidden ? "Access Denied" : "Domain Unavailable"}
            </h2>
            <p className="text-sm text-gray-400 max-w-md">
              {isForbidden
                ? "You do not have permission to view or manage this domain. This domain belongs to another client account."
                : error || "The requested domain could not be found."}
            </p>
          </div>
        </div>
      );
    }
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div className="relative w-full max-w-lg bg-[#0c0d12] border border-white/10 rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">
            {isForbidden ? "Access Denied" : "Domain Unavailable"}
          </h2>
          <p className="text-sm text-gray-400 max-w-md">
            {isForbidden
              ? "You do not have permission to view or manage this domain."
              : error || "The requested domain could not be found."}
          </p>
          {onClose && (
            <button
              onClick={onClose}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
            >
              <span>Close</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!activeDomain || (!activeDomain.id && !domainId && !activeDomain.domain_uid)) return null;

  // Handlers
  const handleToggleLock = async () => {
    setTogglingLock(true);
    try {
      const newLocked = !isLocked;
      const res = await fetch(`/api/services/domains/${targetId}/security`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locked: newLocked }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update lock");
      setIsLocked(newLocked);
      setSuccessMsg(newLocked ? "Registrar Lock Enabled." : "Registrar Lock Disabled.");
      setTimeout(() => setSuccessMsg(null), 3000);
      onRefresh?.();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTogglingLock(false);
    }
  };

  const handleToggleAutoRenew = async () => {
    setTogglingAutoRenew(true);
    try {
      const newAuto = !isAutoRenew;
      const res = await fetch(`/api/services/domains/${targetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auto_renew: newAuto }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update auto-renewal");
      setIsAutoRenew(newAuto);
      setSuccessMsg(newAuto ? "Auto-renewal enabled." : "Auto-renewal disabled.");
      setTimeout(() => setSuccessMsg(null), 3000);
      onRefresh?.();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTogglingAutoRenew(false);
    }
  };

  const handleToggleDnssec = async () => {
    setTogglingDnssec(true);
    try {
      const newDnssec = !dnssecEnabled;
      const res = await fetch(`/api/services/domains/${targetId}/security`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dnssec_enabled: newDnssec }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update DNSSEC.");
      setDnssecEnabled(newDnssec);
      setSuccessMsg(newDnssec ? "DNSSEC has been enabled." : "DNSSEC has been disabled.");
      setTimeout(() => setSuccessMsg(null), 3000);
      onRefresh?.();
    } catch (err: any) {
      alert(err.message || "Failed to toggle DNSSEC");
    } finally {
      setTogglingDnssec(false);
    }
  };

  const handleRequestTransfer = async () => {
    if (
      !confirm(
        "Are you sure you want to request an outbound transfer? This will unlock the domain and dispatch an EPP authorization code to your registrant email."
      )
    ) {
      return;
    }
    setRequestingTransfer(true);
    setTransferMessage(null);
    try {
      const res = await fetch(`/api/services/domains/${targetId}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to request transfer.");
      setIsLocked(false);
      setTransferMessage(
        data.notice ||
          data.message ||
          "Transfer authorization requested. Registrar Lock has been disabled. Check your inbox for the EPP key."
      );
      setSuccessMsg("Domain unlocked and transfer code requested.");
      setTimeout(() => setSuccessMsg(null), 4000);
      onRefresh?.();
    } catch (err: any) {
      alert(err.message || "Failed to request outbound transfer.");
    } finally {
      setRequestingTransfer(false);
    }
  };

  const renewalLkr = activeDomain.renewal_lkr_price
    ? parseFloat(activeDomain.renewal_lkr_price)
    : activeDomain.renewal_price
    ? parseFloat(activeDomain.renewal_price) * 310
    : activeDomain.activation_lkr_price
    ? parseFloat(activeDomain.activation_lkr_price)
    : 0;

  const renewalUsd = activeDomain.renewal_price
    ? parseFloat(activeDomain.renewal_price)
    : activeDomain.selling_price
    ? parseFloat(activeDomain.selling_price)
    : 0;

  const handleSaveDnsRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRecordId) {
        // Update
        const res = await fetch(`/api/services/domains/${targetId}/dns`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            record_id: editingRecordId,
            ...dnsForm,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update record");
      } else {
        // Create
        const res = await fetch(`/api/services/domains/${targetId}/dns`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dnsForm),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create record");
      }

      setIsAddingDns(false);
      setEditingRecordId(null);
      setDnsForm({ type: "A", name: "@", content: "", ttl: 1, proxied: false, priority: 10 });
      await fetchDnsRecords();
      setSuccessMsg("DNS record saved successfully.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteDns = async (recordId: string) => {
    if (!confirm("Are you sure you want to delete this DNS record?")) return;
    try {
      const res = await fetch(`/api/services/domains/${targetId}/dns?record_id=${recordId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete record");
      await fetchDnsRecords();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleApplyTemplate = async (templateName: string) => {
    if (!confirm(`Apply the ${templateName} preset? This will add standard DNS records for this service.`)) return;
    try {
      const res = await fetch(`/api/services/domains/${targetId}/dns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: templateName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to apply template");
      await fetchDnsRecords();
      setSuccessMsg(`Preset for ${templateName} applied.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleQuickToggleProxy = async (record: DnsRecord) => {
    if (!["A", "AAAA", "CNAME"].includes(record.type)) return;
    setTogglingRecordId(record.id);
    try {
      const res = await fetch(`/api/services/domains/${targetId}/dns`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          record_id: record.id,
          type: record.type,
          name: record.name,
          content: record.content,
          ttl: record.ttl || 1,
          proxied: !record.proxied,
          priority: record.priority,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update proxy status");
      await fetchDnsRecords();
      setSuccessMsg(record.proxied ? "Proxy disabled (DNS only)." : "Proxy enabled (CDN active).");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTogglingRecordId(null);
    }
  };

  const handlePayRenewal = (invoiceId: string, lkrAmount: number) => {
    const inv = {
      id: invoiceId,
      invoice_id: invoiceId,
      total_amount: lkrAmount,
      total_due: lkrAmount,
      currency: "LKR",
      client_name: activeDomain.domain_name,
      description: `Domain Renewal: ${activeDomain.domain_name}`,
    };
    if (onOpenPayModal) {
      onOpenPayModal(inv);
    } else {
      setPayInvoice(inv);
    }
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: Globe },
    { id: "dns", label: "DNS Editor", icon: Server },
    { id: "nameservers", label: "Nameservers", icon: ArrowRightLeft },
    { id: "renewals", label: "Renewal & History", icon: History },
    { id: "settings", label: "Settings", icon: Settings },
  ] as const;

  const tabContent = (
    <>
      {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Quick Status Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-gray-500 text-xs font-medium">Registrar Lock</span>
                  <div className="flex items-center justify-between pt-1">
                    <span className={`text-sm font-bold ${isLocked ? "text-emerald-400" : "text-amber-400"}`}>
                      {isLocked ? "Locked (Protected)" : "Unlocked"}
                    </span>
                    <button
                      onClick={handleToggleLock}
                      disabled={togglingLock}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
                      title={isLocked ? "Unlock Domain" : "Lock Domain"}
                    >
                      {togglingLock ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-gray-500">
                    {isLocked ? "Transfers Blocked" : "Ready for Transfer"}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-gray-500 text-xs font-medium">Auto-Renewal</span>
                  <div className="flex items-center justify-between pt-1">
                    <span className={`text-sm font-bold ${isAutoRenew ? "text-emerald-400" : "text-gray-400"}`}>
                      {isAutoRenew ? "Enabled" : "Disabled"}
                    </span>
                    <button
                      onClick={handleToggleAutoRenew}
                      disabled={togglingAutoRenew}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
                      title="Toggle Auto-Renewal"
                    >
                      {togglingAutoRenew ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-gray-500">
                    {isAutoRenew ? "Renews Automatically" : "Manual Renewal Required"}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-gray-500 text-xs font-medium">WHOIS Privacy</span>
                  <div className="flex items-center justify-between pt-1">
                    <span className={`text-sm font-bold ${details?.privacy ?? true ? "text-emerald-400" : "text-gray-400"}`}>
                      {details?.privacy ?? true ? "Active" : "Standard"}
                    </span>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-[10px] text-gray-500">
                    {details?.privacy ?? true ? "Included Free with Frametoque" : "Public Registry"}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-gray-500 text-xs font-medium">Expiration Date</span>
                  <div className="pt-1">
                    <span className="text-sm font-bold text-white">
                      {(details?.expiry_date || activeDomain.expiry_date)
                        ? new Date(details?.expiry_date || activeDomain.expiry_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : "Not found"}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {details?.days_remaining !== undefined && details?.days_remaining !== null
                      ? details.days_remaining > 0
                        ? `Expires in ${details.days_remaining} days`
                        : `Expired ${Math.abs(details.days_remaining)} days ago`
                      : "—"}
                  </span>
                </div>
              </div>

              {/* Active Nameservers */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Server className="w-4 h-4 text-brand-400" />
                    <span>Active Nameservers</span>
                  </h3>
                  {activeNameservers.length > 0 && (
                    <span className="text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                      Active
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {activeNameservers.length > 0 ? (
                    activeNameservers.map((ns: string) => (
                      <div
                        key={ns}
                        className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-gray-200 text-xs font-medium flex items-center gap-2"
                      >
                        <span>{ns}</span>
                        <button
                          onClick={() => copyToClipboard(ns, ns)}
                          className="p-1 hover:text-white text-gray-400 cursor-pointer"
                          title="Copy Nameserver"
                        >
                          {copiedKey === ns ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ))
                  ) : (
                    <span className="text-gray-500 text-xs py-1 font-medium">Not found</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DNS EDITOR */}
          {activeTab === "dns" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white">DNS Records Management</h3>
                </div>

                <div className="flex items-center gap-2">
                  {/* Preset Templates */}
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleApplyTemplate(e.target.value);
                        e.target.value = "";
                      }
                    }}
                    defaultValue=""
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-200 cursor-pointer focus:outline-none"
                  >
                    <option value="" disabled>Quick Presets...</option>
                    <option value="google-workspace">Google Workspace Email</option>
                    <option value="zoho-mail">Zoho Mail</option>
                    <option value="vercel">Vercel Deployment</option>
                    <option value="github-pages">GitHub Pages</option>
                  </select>

                  <button
                    onClick={() => {
                      setIsAddingDns(true);
                      setEditingRecordId(null);
                      setDnsForm({ type: "A", name: "@", content: "", ttl: 1, proxied: false, priority: 10 });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Record</span>
                  </button>
                </div>
              </div>

              {/* Add / Edit DNS Form */}
              {isAddingDns && (
                <form onSubmit={handleSaveDnsRecord} className="p-4 rounded-2xl bg-white/[0.03] border border-brand-500/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white">
                      {editingRecordId ? "Edit DNS Record" : "Create New DNS Record"}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsAddingDns(false)}
                      className="text-gray-400 hover:text-white text-xs"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block text-gray-400 mb-1">Type</label>
                      <select
                        value={dnsForm.type}
                        onChange={(e) => setDnsForm({ ...dnsForm, type: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-brand-400"
                      >
                        <option value="A">A (IPv4)</option>
                        <option value="AAAA">AAAA (IPv6)</option>
                        <option value="CNAME">CNAME (Alias)</option>
                        <option value="TXT">TXT (Text)</option>
                        <option value="MX">MX (Mail Exchange)</option>
                        <option value="SRV">SRV (Service)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-400 mb-1">Name / Host</label>
                      <input
                        type="text"
                        value={dnsForm.name}
                        onChange={(e) => setDnsForm({ ...dnsForm, name: e.target.value })}
                        placeholder="@ or subdomain"
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-brand-400"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 mb-1">TTL</label>
                      <select
                        value={dnsForm.ttl}
                        onChange={(e) => setDnsForm({ ...dnsForm, ttl: Number(e.target.value) })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-brand-400"
                      >
                        <option value="1">Auto</option>
                        <option value="60">1 min</option>
                        <option value="300">5 mins</option>
                        <option value="3600">1 hour</option>
                        <option value="86400">1 day</option>
                      </select>
                    </div>

                    {dnsForm.type === "MX" ? (
                      <div>
                        <label className="block text-gray-400 mb-1">Priority</label>
                        <input
                          type="number"
                          value={dnsForm.priority}
                          onChange={(e) => setDnsForm({ ...dnsForm, priority: Number(e.target.value) })}
                          min="0"
                          max="65535"
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-brand-400"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col justify-end">
                        <label className="block text-gray-400 mb-1">Proxy Status</label>
                        <button
                          type="button"
                          onClick={() => setDnsForm({ ...dnsForm, proxied: !dnsForm.proxied })}
                          className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer w-full h-[42px]"
                        >
                          <span className={`text-xs font-semibold ${dnsForm.proxied ? "text-amber-400" : "text-gray-400"}`}>
                            {dnsForm.proxied ? "Proxy On" : "Proxy Off"}
                          </span>
                          <div
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                              dnsForm.proxied ? "bg-amber-500" : "bg-white/20"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                dnsForm.proxied ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </div>
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-gray-400 text-xs mb-1">Content / Target Value</label>
                    <input
                      type="text"
                      value={dnsForm.content}
                      onChange={(e) => setDnsForm({ ...dnsForm, content: e.target.value })}
                      placeholder={dnsForm.type === "A" ? "192.0.2.1" : dnsForm.type === "CNAME" ? "target.example.com" : "Record target value"}
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-brand-400"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingDns(false)}
                      className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs"
                    >
                      Save Record
                    </button>
                  </div>
                </form>
              )}

              {/* Error Notice */}
              {dnsError && (
                <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                    <span>{dnsError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={fetchDnsRecords}
                    className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-white font-medium text-xs transition-colors shrink-0"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Records Table */}
              <div className="overflow-x-auto rounded-2xl border border-white/5 bg-white/[0.01]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-white/5 text-gray-400">
                    <tr>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Content</th>
                      <th className="px-4 py-3">Proxy Status</th>
                      <th className="px-4 py-3">TTL</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {loadingDns ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-gray-500">
                          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-brand-400" />
                          Loading live DNS records...
                        </td>
                      </tr>
                    ) : dnsRecords.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-gray-500">
                          No DNS records configured yet. Click "Add Record" or choose a quick preset above.
                        </td>
                      </tr>
                    ) : (
                      dnsRecords.map((r) => (
                        <tr key={r.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-bold text-brand-400 bg-brand-400/10 px-2 py-0.5 rounded">
                              {r.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-white font-medium">{r.name}</td>
                          <td className="px-4 py-3 text-gray-300 max-w-xs truncate">{r.content}</td>
                          <td className="px-4 py-3">
                            {["A", "AAAA", "CNAME"].includes(r.type) ? (
                              <button
                                type="button"
                                onClick={() => handleQuickToggleProxy(r)}
                                disabled={togglingRecordId === r.id}
                                title={r.proxied ? "Proxy is On (Click to turn off)" : "Proxy is Off (Click to turn on)"}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer border ${
                                  r.proxied
                                    ? "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                                    : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-gray-200"
                                }`}
                              >
                                {togglingRecordId === r.id ? (
                                  <Loader2 className="w-2.5 h-2.5 animate-spin text-brand-400" />
                                ) : (
                                  <span className={`w-2 h-2 rounded-full ${r.proxied ? "bg-amber-400" : "bg-gray-500"}`} />
                                )}
                                <span>{r.proxied ? "Proxy On" : "Proxy Off"}</span>
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-gray-500 text-[11px] font-medium">
                                <span className="w-2 h-2 rounded-full bg-gray-600"></span>
                                DNS only
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-400">{r.ttl === 1 ? "Auto" : `${r.ttl}s`}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setEditingRecordId(r.id);
                                  setDnsForm({
                                    type: r.type,
                                    name: r.name,
                                    content: r.content,
                                    ttl: r.ttl || 1,
                                    proxied: r.proxied ?? false,
                                    priority: r.priority || 10,
                                  });
                                  setIsAddingDns(true);
                                }}
                                className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"
                                title="Edit Record"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteDns(r.id)}
                                className="p-1.5 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400"
                                title="Delete Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: NAMESERVERS */}
          {activeTab === "nameservers" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white">Authoritative Nameservers</h3>
              </div>

              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                <span className="text-xs font-semibold text-gray-400">Current Nameservers:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeNameservers.length > 0 ? (
                    activeNameservers.map((ns: string, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs"
                      >
                        <span className="font-medium text-white">{ns}</span>
                        <span className="text-[10px] text-green-400 font-medium">Active</span>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 text-gray-500 text-xs py-3 text-center bg-white/[0.02] rounded-xl border border-white/5 font-medium">
                      Not found
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: RENEWAL & PAYMENT HISTORY */}
          {activeTab === "renewals" && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <History className="w-4 h-4 text-brand-400" />
                    <span>Renewal & Payment History</span>
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={fetchRenewalHistory}
                  disabled={loadingHistory}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition-colors self-start sm:self-auto flex items-center gap-1.5 text-xs cursor-pointer"
                  title="Refresh History"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? "animate-spin text-brand-400" : ""}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Expiration Date Card */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-gray-500 text-xs font-medium flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-brand-400" />
                    Expiration Date
                  </span>
                  <div className="pt-1">
                    <span className="text-sm font-bold text-white">
                      {(details?.expiry_date || activeDomain.expiry_date)
                        ? new Date(details?.expiry_date || activeDomain.expiry_date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Not found"}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 block">
                    {details?.days_remaining !== undefined && details?.days_remaining !== null
                      ? details.days_remaining > 0
                        ? `Expires in ${details.days_remaining} days`
                        : `Expired ${Math.abs(details.days_remaining)} days ago`
                      : "—"}
                  </span>
                </div>

                {/* Renewal Fee Card */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-gray-500 text-xs font-medium flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-brand-400" />
                    Renewal Price
                  </span>
                  <div className="pt-1">
                    <span className="text-sm font-bold text-amber-300">
                      {formatLKR(renewalLkr)}
                    </span>
                  </div>
                </div>

                {/* Auto-Renewal Status Card */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-gray-500 text-xs font-medium flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-brand-400" />
                    Auto-Renewal
                  </span>
                  <div className="flex items-center justify-between pt-1">
                    <span className={`text-sm font-bold ${isAutoRenew ? "text-emerald-400" : "text-gray-400"}`}>
                      {isAutoRenew ? "Enabled" : "Disabled"}
                    </span>
                    <button
                      type="button"
                      onClick={handleToggleAutoRenew}
                      disabled={togglingAutoRenew}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        isAutoRenew ? "bg-emerald-500" : "bg-white/20"
                      }`}
                      title="Toggle Auto-Renewal"
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          isAutoRenew ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                  <span className="text-[10px] text-gray-400 block">
                    {isAutoRenew ? "Automatic invoice before expiry" : "Manual payment required"}
                  </span>
                </div>

                {/* Registry Protection Card */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1 flex flex-col justify-between">
                  <div>
                    <span className="text-gray-500 text-xs font-medium flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Registry Status
                    </span>
                    <div className="pt-1">
                      <span className="text-sm font-bold text-white flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${activeDomain.status === "active" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                        {activeDomain.status === "active" ? "Active" : "Pending"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoices & Payment Ledger */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-brand-400" />
                    <span>Invoices & Payment History</span>
                  </h4>
                  <span className="text-[11px] text-gray-400">
                    {allLedgerRows.length} record{allLedgerRows.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-white/5 bg-white/[0.01]">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-white/5 text-gray-400">
                      <tr>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3">Invoice</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {loadingHistory ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-gray-500">
                            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-brand-400" />
                            Loading payment history...
                          </td>
                        </tr>
                      ) : allLedgerRows.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-gray-500">
                            No payment or renewal history records found.
                          </td>
                        </tr>
                      ) : (
                        allLedgerRows.map((row) => {
                          const s = String(row.status || "").toLowerCase();
                          const isPaid = s === "paid" || s === "fully paid";
                          const isOnReview = s === "on review";
                          const invoiceUrl = isAdmin
                            ? `/admin/invoice/${row.invoice_id}`
                            : `/dashboard/invoice/${row.invoice_id}`;

                          return (
                            <tr key={row.id} className="hover:bg-white/5 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`p-1.5 rounded-lg ${
                                      row.isRenewal
                                        ? "bg-amber-400/10 text-amber-400"
                                        : "bg-blue-400/10 text-blue-400"
                                    }`}
                                  >
                                    {row.isRenewal ? (
                                      <RefreshCw className="w-3.5 h-3.5" />
                                    ) : (
                                      <Globe className="w-3.5 h-3.5" />
                                    )}
                                  </div>
                                  <div>
                                    <span className="font-semibold text-white block">
                                      {row.description}
                                    </span>
                                    <span className="text-[10px] text-gray-500">
                                      {activeDomain.domain_name}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <Link
                                  href={invoiceUrl}
                                  className="font-semibold text-brand-400 hover:text-brand-300 hover:underline flex items-center gap-1"
                                >
                                  <span>{row.invoice_id}</span>
                                  <ExternalLink className="w-3 h-3 text-gray-500" />
                                </Link>
                              </td>
                              <td className="px-4 py-3 text-gray-400">
                                {row.date
                                  ? new Date(row.date).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })
                                  : "—"}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="font-semibold text-white">
                                  {formatLKR(row.amount)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                                    isPaid
                                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                      : isOnReview
                                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                      : "bg-red-500/10 text-red-400 border-red-500/20"
                                  }`}
                                >
                                  {isPaid && <CheckCircle2 className="w-2.5 h-2.5" />}
                                  {isOnReview && <Clock className="w-2.5 h-2.5" />}
                                  <span>{isPaid ? "Paid" : isOnReview ? "On Review" : "Unpaid"}</span>
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {!isPaid && !isOnReview && onOpenPayModal && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onOpenPayModal({
                                          invoice_id: row.invoice_id,
                                          project_name: row.description,
                                          total_due: row.amount,
                                          currency: "LKR",
                                        })
                                      }
                                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:opacity-95 text-white font-semibold text-[11px] transition-opacity cursor-pointer shadow-sm"
                                    >
                                      <CreditCard className="w-3 h-3" />
                                      <span>Pay Now</span>
                                    </button>
                                  )}
                                  <Link href={invoiceUrl}>
                                    <button
                                      type="button"
                                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                                      title="View Invoice Document"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                  </Link>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SETTINGS */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-white">Domain Settings</h3>
              </div>

              {transferMessage && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-semibold block">Transfer Request Initiated</span>
                    <p className="text-amber-300/90">{transferMessage}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Transfer Lock Card */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white flex items-center gap-2">
                        <Lock className="w-4 h-4 text-brand-400" />
                        Transfer Lock
                      </span>
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                          isLocked
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}
                      >
                        {isLocked ? "Locked" : "Unlocked"}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      Prevents this domain from being transferred away to another provider.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[11px] text-gray-400">
                      {isLocked ? "Transfers blocked" : "Transfers allowed"}
                    </span>
                    <button
                      type="button"
                      onClick={handleToggleLock}
                      disabled={togglingLock}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                        isLocked
                          ? "bg-white/5 hover:bg-white/10 text-gray-300 border-white/10"
                          : "bg-emerald-500 hover:bg-emerald-600 text-white border-transparent"
                      }`}
                    >
                      {togglingLock ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : isLocked ? (
                        <Unlock className="w-3.5 h-3.5" />
                      ) : (
                        <Lock className="w-3.5 h-3.5" />
                      )}
                      <span>{isLocked ? "Unlock" : "Lock"}</span>
                    </button>
                  </div>
                </div>

                {/* DNSSEC Card */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white flex items-center gap-2">
                        <Shield className="w-4 h-4 text-brand-400" />
                        DNSSEC
                      </span>
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                          dnssecEnabled
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-white/5 text-gray-400 border-white/10"
                        }`}
                      >
                        {dnssecEnabled ? "Active" : "Disabled"}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      Protects your visitors against DNS spoofing and cache poisoning.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[11px] text-gray-400">
                      {dnssecEnabled ? "Enabled" : "Disabled"}
                    </span>
                    <button
                      type="button"
                      onClick={handleToggleDnssec}
                      disabled={togglingDnssec}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                        dnssecEnabled
                          ? "bg-white/5 hover:bg-white/10 text-gray-300 border-white/10"
                          : "bg-brand-500 hover:bg-brand-600 text-white border-transparent"
                      }`}
                    >
                      {togglingDnssec ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : dnssecEnabled ? (
                        <span>Disable</span>
                      ) : (
                        <span>Enable</span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Auto-Renewal Card */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-brand-400" />
                        Auto-Renew
                      </span>
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                          isAutoRenew
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-white/5 text-gray-400 border-white/10"
                        }`}
                      >
                        {isAutoRenew ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      Automatically renews your domain before expiration so it doesn't expire.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[11px] text-gray-400">
                      {isAutoRenew ? "Auto-renew is on" : "Auto-renew is off"}
                    </span>
                    <button
                      type="button"
                      onClick={handleToggleAutoRenew}
                      disabled={togglingAutoRenew}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <div
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                          isAutoRenew ? "bg-emerald-500" : "bg-white/20"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            isAutoRenew ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </div>
                    </button>
                  </div>
                </div>

                {/* WHOIS Privacy Card */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        WHOIS Privacy
                      </span>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                        Active
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      Hides your personal contact details from public WHOIS records.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[11px] text-emerald-400/90 font-medium">
                      Included free
                    </span>
                    <Check className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>
              </div>
            </div>
          )}
    </>
  );

  if (isPage) {
    return (
      <div className="w-full space-y-6 pb-12">
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href={backHref || (isAdmin ? "/admin/web-services/domains" : "/dashboard/domains")}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-medium transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Domains</span>
            </Link>
            <div className="h-5 w-px bg-white/10 hidden sm:block" />
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5 flex-wrap">
              <span>{activeDomain.domain_name || "Manage Domains"}</span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full border border-green-500/30 bg-green-500/10 text-green-400 font-semibold uppercase tracking-wider">
                {details?.live_zone?.status || details?.status || activeDomain.status || "Active"}
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                fetchDomainDetails();
                if (activeTab === "dns") fetchDnsRecords();
                if (activeTab === "renewals") fetchRenewalHistory();
              }}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-colors cursor-pointer"
              title="Refresh Domain Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Success Alert Banner */}
        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-5 py-3 flex items-center gap-2.5 text-emerald-400 text-xs font-medium">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab Switcher - pill buttons matching admin dashboard style */}
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-5 py-2 rounded-full text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-2 ${
                  isActive
                    ? "bg-white text-black shadow-lg"
                    : "bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Content Area - Full-width glassmorphism container matching other admin pages */}
        <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
          {tabContent}
        </div>

        {payInvoice && (
          <PayModal
            isOpen={!!payInvoice}
            onClose={() => {
              setPayInvoice(null);
              fetchDomainDetails();
              fetchRenewalHistory();
            }}
            invoice={payInvoice}
          />
        )}
      </div>
    );
  }

  const modalBody = (
    <div className="relative w-full max-w-5xl my-auto max-h-[90vh] bg-[#0c0d12] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-white tracking-wide">{activeDomain.domain_name || "Manage Domains"}</h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full border border-green-500/30 bg-green-500/10 text-green-400 font-semibold uppercase tracking-wider">
            {details?.live_zone?.status || details?.status || activeDomain.status || "Active"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchDomainDetails();
              if (activeTab === "dns") fetchDnsRecords();
              if (activeTab === "renewals") fetchRenewalHistory();
            }}
            disabled={loading}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title="Refresh Domain Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Success Alert Banner */}
      {successMsg && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-2.5 flex items-center gap-2 text-emerald-400 text-xs font-medium">
          <Check className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-white/5 px-6 gap-2 bg-white/[0.01] overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-3.5 px-3 border-b-2 font-medium text-xs whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "border-brand-400 text-brand-400 font-bold bg-brand-400/[0.04]"
                  : "border-transparent text-gray-400 hover:text-gray-200"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Body */}
      <div className="p-6 pb-12 overflow-y-auto flex-1 space-y-6">
        {tabContent}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-white/5 bg-white/[0.02] flex items-center justify-between">
        <span className="text-xs text-gray-400 flex items-center gap-2">
          <span className="font-medium text-white">{activeDomain.domain_name}</span>
        </span>
        {onClose && (
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      {modalBody}

      {payInvoice && (
        <PayModal
          isOpen={!!payInvoice}
          onClose={() => {
            setPayInvoice(null);
            fetchDomainDetails();
            fetchRenewalHistory();
          }}
          invoice={payInvoice}
        />
      )}
    </div>
  );
}

export default function DomainControlCenterModal(props: DomainControlCenterModalProps) {
  return <DomainControlCenterView {...props} isPage={props.isPage ?? false} />;
}

