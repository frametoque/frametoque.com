"use client";

import React, { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import {
  Globe,
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
} from "lucide-react";
import PayModal from "@/components/PayModal";
import DomainSearch from "@/components/services/DomainSearch";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";

interface ClientDomain {
  id: number;
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
  /** Locked LKR selling price at invoice creation */
  activation_lkr_price?: string | null;
  /** Locked LKR exchange rate at invoice creation */
  activation_lkr_rate?: string | null;
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

const formatUSD = (amount: number) => `$${amount.toFixed(2)}`;

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
                <th className="px-3 py-2 text-right font-medium">USD</th>
                <th className="px-3 py-2 text-right font-medium">LKR (rate)</th>
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

  // History toggle per domain id
  const [expandedHistory, setExpandedHistory] = useState<Record<number, boolean>>({});

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
      setDomains(data);
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
    window.addEventListener("domains:refresh", handleRefresh);
    return () => window.removeEventListener("domains:refresh", handleRefresh);
  }, [user]);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
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

  /** Registration price: fixed LKR if activated and available, else live conversion. */
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

  /** Renewal price: always live */
  const getRenewalPriceDisplay = (d: ClientDomain) => {
    const usd = parseFloat(d.renewal_price || d.selling_price) || 0;
    return { usd, lkrValue: usd * lkrRate, rate: lkrRate };
  };

  /** Invoice amount display */
  const formatInvoiceAmount = (d: ClientDomain) => {
    const val = parseFloat(d.total_due || "0") || 0;
    if (d.currency === "LKR") return formatLKR(val);
    return formatUSD(val);
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
            <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">My</span>
            <span className="bg-gradient-to-r from-brand-400 to-brand-500 bg-clip-text text-transparent">&nbsp;Domains</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            Search for new domains, manage your active domain names, see registration/renewal dates, and pay linked invoices.
          </p>
        </div>

        {domains.length > 0 && (
          <button
            onClick={() => setShowSearch((prev) => !prev)}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-bold text-sm shadow-lg shadow-brand-500/20 transition-all cursor-pointer shrink-0 self-start sm:self-center"
          >
            {showSearch ? (
              <>
                <X className="w-4 h-4" />
                <span>Close Search</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Buy New Domain</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Domain Search */}
      {(domains.length === 0 || showSearch) && <DomainSearch lkrRate={lkrRate} />}

      {domains.length > 0 ? (
        <>
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-gray-500">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-amber-400/80" />
              <span className="text-amber-300/70">Fixed LKR</span>
              <span> locked at your registration rate</span>
            </span>
            <span className="flex items-center gap-1.5">
              <RefreshCw className="w-3 h-3 text-blue-400/70" />
              <span className="text-blue-300/70">Live LKR</span>
              <span> today's rate (1 USD = {lkrRate.toFixed(2)} LKR)</span>
            </span>
          </div>

          <Table>
            <TableHeader>
              <TableHead>Domain</TableHead>
              <TableHead className="text-right">Registration Price</TableHead>
              <TableHead className="text-right">Renewal Price</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Invoice & Action</TableHead>
            </TableHeader>
            <TableBody>
                  {domains.map((d) => {
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
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-xl bg-brand-400/10 text-brand-400">
                                <Globe className="w-5 h-5" />
                              </div>
                              <div>
                                <span className="font-bold text-white text-base block">{d.domain_name}</span>
                                <span className="text-[10px] text-gray-500">
                                  Ordered: {new Date(d.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          {/* Registration Price — fixed LKR after activation */}
                          <TableCell className="text-right">
                            <div className="text-white font-semibold">
                              {formatLKR(reg.lkrValue)}
                              <span className="text-xs font-normal ml-1 text-gray-500">
                                ({formatUSD(reg.usd)}
                                <span className={`text-[9px] ml-0.5 ${reg.isFixed ? "text-amber-300/80" : "text-gray-600"}`}> @{Math.round(reg.rate)}</span>)
                              </span>
                            </div>
                          </TableCell>

                          {/* Renewal Price — always live */}
                          <TableCell className="text-right">
                            <div className="text-gray-300 font-medium">
                              {formatLKR(renew.lkrValue)}
                              <span className="text-xs font-normal ml-1 text-gray-500">
                                ({formatUSD(renew.usd)}
                                <span className="text-gray-600 text-[9px] ml-0.5"> @{Math.round(lkrRate)}</span>)
                              </span>
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
                              {d.status}
                            </span>
                          </TableCell>

                          {/* Action */}
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2 flex-wrap">
                              {d.invoice_id ? (
                                <>
                                  {d.payment_status === "paid" || d.payment_status === "fully paid" ? (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full text-xs font-semibold">
                                      <CheckCircle className="w-3.5 h-3.5" />
                                      Invoice Paid
                                    </span>
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
                                          currency: d.currency || "USD",
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
                  })}
            </TableBody>
          </Table>
        </>
      ) : (
        <div />
      )}

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
