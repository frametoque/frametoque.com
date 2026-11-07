"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import {
  CreditCard,
  Eye,
  HelpCircle,
  ShieldAlert,
  CheckCircle,
  Plus,
  X,
  Trash2,
  Loader2,
  History,
  ChevronUp,
  Lock,
  RefreshCw,
  AlertTriangle,
  Settings2,
  ArrowRightLeft,
  Search,
  Filter,
} from "lucide-react";
import PayModal from "@/components/PayModal";
import DomainSearch from "@/components/services/DomainSearch";
import DomainControlCenterModal from "@/components/services/DomainControlCenterModal";
import DomainTransferInModal from "@/components/services/DomainTransferInModal";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";

interface ClientDomain {
  id: number;
  domain_uid?: string;
  domain_name: string;
  selling_price: string;
  renewal_price: string;
  status: string;
  expiry_date: string | null;
  created_at: string;
  invoice_id: string | null;
  payment_status: string | null;
  total_due: string | null;
  currency: string | null;
  zone_id?: string | null;
  locked?: boolean;
  auto_renew?: boolean;
  privacy_enabled?: boolean;
  nameservers?: any;
  dnssec_status?: string;
  transfer_status?: string;
  activation_lkr_price?: string | null;
  activation_lkr_rate?: string | null;
  renewal_lkr_price?: string | null;
  renewal_lkr_rate?: string | null;
}

interface RenewalHistoryRow {
  id: number;
  domain_order_id: number;
  domain_name: string;
  invoice_id: string;
  renewal_date: string;
  usd_price: number;
  lkr_price: number;
  lkr_rate: number;
  status: string;
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------
const formatLKR = (amount: number) =>
  new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR" }).format(amount || 0);

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function RenewalHistoryPanel({
  domainId,
  userEmail,
}: {
  domainId: number;
  userEmail: string;
}) {
  const [history, setHistory] = useState<RenewalHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(
      `/api/services/domains/renewal-history?user_email=${encodeURIComponent(userEmail)}&domain_id=${domainId}`,
      { cache: "no-store" }
    )
      .then((r) => r.json())
      .then((data) => setHistory(Array.isArray(data) ? data : []))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [domainId, userEmail]);

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === "fully paid" || s === "paid") return "text-green-400 bg-green-400/10 border-green-400/20";
    if (s === "on review") return "text-amber-400 bg-amber-400/10 border-amber-400/20";
    return "text-red-400 bg-red-400/10 border-red-400/20";
  };

  return (
    <div className="border-t border-white/5 bg-white/[0.015] px-5 py-4">
      <p className="text-xs font-semibold text-gray-400 mb-3 flex items-center gap-1.5">
        <History className="w-3.5 h-3.5" />
        Renewal History
      </p>
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Loading history…
        </div>
      ) : history.length === 0 ? (
        <p className="text-xs text-gray-600 italic py-1">No renewal invoices yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-white/5 text-gray-500">
                <th className="px-3 py-2 text-left font-medium">Date</th>
                <th className="px-3 py-2 text-left font-medium">Invoice</th>
                <th className="px-3 py-2 text-right font-medium">Amount</th>
                <th className="px-3 py-2 text-center font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {history.map((h) => (
                <tr key={h.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-3 py-2 text-gray-400">
                    {new Date(h.renewal_date).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-brand-400 font-mono">{h.invoice_id}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="text-amber-300/90 font-medium">{formatLKR(h.lkr_price)}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] font-semibold ${getStatusBadge(h.status)}`}>
                      {h.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link href={`/dashboard/invoice/${h.invoice_id}`}>
                      <button className="p-1.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer" title="View Invoice">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function ClientDomainsPage() {
  const { user, isLoaded: isUserLoaded } = useUser();
  const [domains, setDomains] = useState<ClientDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lkrRate, setLkrRate] = useState(300);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"All" | "Active" | "Pending" | "Expired">("All");

  // History toggle per domain id
  const [expandedHistory, setExpandedHistory] = useState<Record<number, boolean>>({});

  // Control Center Modal & Transfer In Modal States
  const [selectedControlDomain, setSelectedControlDomain] = useState<ClientDomain | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // Pay Modal States
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleCancelOrder = async (id: number, domainName: string) => {
    if (!confirm(`Are you sure you want to cancel your pending order for "${domainName}"?`)) return;
    try {
      setCancellingId(id);
      const res = await fetch(`/api/services/domains/order?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to cancel domain order.");
        return;
      }
      await fetchDomains();
    } catch (err: any) {
      alert(err.message || "Failed to cancel domain order.");
    } finally {
      setCancellingId(null);
    }
  };

  const fetchDomains = async () => {
    if (!user?.primaryEmailAddress?.emailAddress) return;
    try {
      const email = user.primaryEmailAddress.emailAddress;
      const res = await fetch(
        `/api/services/domains/client?user_email=${encodeURIComponent(email)}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("Failed to fetch domains list");
      const data = await res.json();
      setDomains(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch("https://open.er-api.com/v6/latest/USD")
      .then((res) => res.json())
      .then((data) => {
        if (data?.rates?.LKR) setLkrRate(data.rates.LKR);
      })
      .catch((e) => console.error("Failed to load LKR exchange rate", e));
  }, []);

  useEffect(() => {
    if (isUserLoaded && user) {
      fetchDomains();
    } else if (isUserLoaded && !user) {
      setLoading(false);
      setError("Please sign in to view your domains.");
    }
  }, [isUserLoaded, user]);

  useEffect(() => {
    const handleRefresh = () => fetchDomains();
    const handleOpenPay = (e: any) => {
      if (e.detail) {
        setSelectedInvoice(e.detail);
        setIsPayModalOpen(true);
      }
    };
    window.addEventListener("domains:refresh", handleRefresh);
    window.addEventListener("domains:openPay", handleOpenPay);
    return () => {
      window.removeEventListener("domains:refresh", handleRefresh);
      window.removeEventListener("domains:openPay", handleOpenPay);
    };
  }, [user]);

  // Filtered Domains
  const filteredDomains = useMemo(() => {
    return domains.filter((d) => {
      const matchesSearch = d.domain_name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (activeFilter === "All") return true;
      if (activeFilter === "Active") return d.status.toLowerCase() === "active";
      if (activeFilter === "Pending") return d.status.toLowerCase() === "pending";
      if (activeFilter === "Expired") return d.status.toLowerCase() === "expired";
      return true;
    });
  }, [domains, searchQuery, activeFilter]);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
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

  const getRegPriceDisplay = (d: ClientDomain) => {
    const usd = parseFloat(d.selling_price) || 0;
    const isActivated = d.status.toLowerCase() !== "pending";
    const lockedLkr = d.activation_lkr_price ? parseFloat(d.activation_lkr_price) : null;
    const lockedRate = d.activation_lkr_rate ? parseFloat(d.activation_lkr_rate) : null;
    const lkrValue = isActivated && lockedLkr != null ? lockedLkr : usd * lkrRate;
    const rate = isActivated && lockedRate != null ? lockedRate : lkrRate;
    const isFixed = isActivated && lockedLkr != null;

    return { usd, lkrValue, rate, isFixed };
  };

  const getRenewalPriceDisplay = (d: ClientDomain) => {
    const usd = parseFloat(d.renewal_price || d.selling_price) || 0;
    const lockedLkr = d.renewal_lkr_price ? parseFloat(d.renewal_lkr_price) : null;
    const lockedRate = d.renewal_lkr_rate ? parseFloat(d.renewal_lkr_rate) : null;
    const lkrValue = lockedLkr != null ? lockedLkr : usd * lkrRate;
    const rate = lockedRate != null ? lockedRate : lkrRate;
    const isFixed = lockedLkr != null;
    return { usd, lkrValue, rate, isFixed };
  };

  const formatInvoiceAmount = (d: ClientDomain) => {
    const val = parseFloat(d.total_due || "0") || 0;
    if (d.currency === "LKR") return formatLKR(val);
    if (d.activation_lkr_price) return formatLKR(parseFloat(d.activation_lkr_price));
    return formatLKR(val * lkrRate);
  };

  const toggleHistory = (id: number) => {
    setExpandedHistory((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // ---------------------------------------------------------------------------
  // Loading / Error states
  // ---------------------------------------------------------------------------
  if (!isUserLoaded || loading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/10 rounded-full w-48 mb-6" />
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 h-64" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-6 text-center">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  const userEmail = user?.primaryEmailAddress?.emailAddress || "";

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Domain</span>
            <span className="bg-gradient-to-r from-brand-400 to-brand-500 bg-clip-text text-transparent">&nbsp;Control Center</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            Register domain names, configure global DNS records, security locks, free WHOIS privacy, and nameservers powered by Frametoque Digital.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 font-semibold text-xs transition-all cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-brand-400" />
            <span>Transfer In</span>
          </button>

          <button
            onClick={() => setShowSearch((prev) => !prev)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-bold text-xs shadow-lg shadow-brand-500/20 transition-all cursor-pointer"
          >
            {showSearch ? (
              <>
                <X className="w-3.5 h-3.5" />
                <span>Close Search</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Register New Domain</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Domain Search Drawer */}
      {(domains.length === 0 || showSearch) && <DomainSearch lkrRate={lkrRate} />}

      {/* Portfolio Controls & Search */}
      {domains.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your domains..."
              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-400"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-white/[0.02] border border-white/5 rounded-2xl overflow-x-auto">
            {(["All", "Active", "Pending", "Expired"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  activeFilter === filter
                    ? "bg-brand-500 text-white shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      )}

      {domains.length > 0 ? (
        <>
          <Table>
            <TableHeader>
              <TableHead>Domain & Control</TableHead>
              <TableHead className="text-right">Registration Price</TableHead>
              <TableHead className="text-right">Renewal Price</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Invoice & Action</TableHead>
            </TableHeader>
            <TableBody>
              {filteredDomains.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-500 text-xs">
                    No domains found matching "{searchQuery}".
                  </TableCell>
                </TableRow>
              ) : (
                filteredDomains.map((d) => {
                  const reg = getRegPriceDisplay(d);
                  const renew = getRenewalPriceDisplay(d);
                  const isHistoryOpen = expandedHistory[d.id] ?? false;

                  const daysToExpiry = d.expiry_date
                    ? Math.ceil((new Date(d.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    : null;
                  const isExpiringSoon = daysToExpiry !== null && daysToExpiry > 0 && daysToExpiry <= 30;

                  return (
                    <React.Fragment key={d.id}>
                      <TableRow className={isHistoryOpen ? "bg-white/5" : ""}>
                        {/* Domain Name */}
                        <TableCell>
                          <div>
                            <div className="flex items-center gap-2">
                              {d.status.toLowerCase() === "active" ? (
                                <Link
                                  href={`/dashboard/domains/${d.domain_uid || d.id}`}
                                  className="font-bold text-white text-base block hover:text-brand-400 transition-colors"
                                >
                                  {d.domain_name}
                                </Link>
                              ) : (
                                <span className="font-bold text-white text-base block">{d.domain_name}</span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-500">
                              Ordered: {new Date(d.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </TableCell>

                        {/* Registration Price */}
                        <TableCell className="text-right">
                          <div className="text-white font-semibold">
                            {formatLKR(reg.lkrValue)}
                          </div>
                        </TableCell>

                        {/* Renewal Price */}
                        <TableCell className="text-right">
                          <div className="text-gray-300 font-medium">
                            {formatLKR(renew.lkrValue)}
                          </div>
                        </TableCell>

                        {/* Expiry */}
                        <TableCell className="text-gray-300">
                          {d.expiry_date ? (
                            <div>
                              <div>
                                {new Date(d.expiry_date).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </div>
                              {isExpiringSoon && (
                                <span className="text-[10px] text-red-400 font-semibold flex items-center gap-1 mt-1">
                                  <AlertTriangle className="w-3 h-3 shrink-0" />
                                  Expiring in {daysToExpiry} days
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500 italic text-xs">Pending Activation</span>
                          )}
                        </TableCell>

                        {/* Status */}
                        <TableCell className="text-center">
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(d.status)}`}>
                            {d.status === "pending_manual_registration" || d.status === "manual_review"
                              ? "Pending Activation"
                              : d.status}
                          </span>
                        </TableCell>

                        {/* Action */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            {d.invoice_id ? (
                              <>
                                {d.payment_status === "paid" || d.payment_status === "fully paid" ? (
                                  <>
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full text-xs font-semibold">
                                      <CheckCircle className="w-3.5 h-3.5" />
                                      Invoice Paid
                                    </span>
                                    {d.status.toLowerCase() === "active" ? (
                                      <Link
                                        href={`/dashboard/domains/${d.domain_uid || d.id}`}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/20 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                                        title="Configure DNS records, Nameservers & Security"
                                      >
                                        <Settings2 className="w-3.5 h-3.5" />
                                        <span>Manage DNS</span>
                                      </Link>
                                    ) : (
                                      <span className="text-[11px] text-amber-400/90 font-medium bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                                        Setting up live DNS...
                                      </span>
                                    )}
                                  </>
                                ) : d.payment_status === "on review" ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full text-xs font-semibold animate-pulse">
                                    <ShieldAlert className="w-3.5 h-3.5" />
                                    On Review
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => {
                                      const isRenewal = d.status.toLowerCase() === "expired";
                                      setSelectedInvoice({
                                        invoice_id: d.invoice_id,
                                        project_name: isRenewal
                                          ? `Domain Renewal: ${d.domain_name}`
                                          : `Domain Registration: ${d.domain_name}`,
                                        total_due: parseFloat(d.total_due || "0"),
                                        currency: d.currency || "LKR",
                                      });
                                      setIsPayModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-3xl hover:opacity-95 transition-opacity text-xs cursor-pointer shadow-lg shadow-blue-500/10"
                                  >
                                    <CreditCard className="w-3.5 h-3.5" />
                                    Pay Now ({formatInvoiceAmount(d)})
                                  </button>
                                )}
                                <Link href={`/dashboard/invoice/${d.invoice_id}`}>
                                  <button className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors cursor-pointer" title="View Invoice">
                                    <Eye className="w-4 h-4" />
                                  </button>
                                </Link>
                              </>
                            ) : (
                              <span className="text-gray-500 italic text-xs flex items-center gap-1.5 bg-white/5 border border-white/5 py-1 px-3 rounded-full">
                                <HelpCircle className="w-3.5 h-3.5 text-gray-500" />
                                Pending Invoice
                              </span>
                            )}

                            {/* Renewal history toggle */}
                            {d.status.toLowerCase() !== "pending" && (
                              <button
                                onClick={() => toggleHistory(d.id)}
                                title="Renewal History"
                                className={`p-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center ${
                                  isHistoryOpen
                                    ? "bg-brand-500/20 text-brand-400"
                                    : "bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white"
                                }`}
                              >
                                {isHistoryOpen ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <History className="w-4 h-4" />
                                )}
                              </button>
                            )}

                            {d.status.toLowerCase() === "pending" && (
                              <button
                                onClick={() => handleCancelOrder(d.id, d.domain_name)}
                                disabled={cancellingId === d.id}
                                className="p-2 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                                title="Cancel Order"
                              >
                                {cancellingId === d.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Inline renewal history panel */}
                      {isHistoryOpen && (
                        <TableRow className="bg-white/5">
                          <TableCell colSpan={6} className="!p-0 border-t border-white/5">
                            <RenewalHistoryPanel domainId={d.id} userEmail={userEmail} />
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </>
      ) : (
        <div />
      )}

      {/* Domain Control Center Modal */}
      {selectedControlDomain && (
        <DomainControlCenterModal
          isOpen={!!selectedControlDomain}
          onClose={() => setSelectedControlDomain(null)}
          domain={selectedControlDomain}
          userEmail={userEmail}
          onRefresh={fetchDomains}
          onOpenPayModal={(inv) => {
            setSelectedInvoice(inv);
            setIsPayModalOpen(true);
          }}
        />
      )}

      {/* Transfer In Modal */}
      <DomainTransferInModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onSuccess={fetchDomains}
        userEmail={userEmail}
      />

      {/* Pay Modal */}
      {selectedInvoice && (
        <PayModal
          isOpen={isPayModalOpen}
          onClose={() => setIsPayModalOpen(false)}
          invoice={selectedInvoice}
        />
      )}
    </div>
  );
}
