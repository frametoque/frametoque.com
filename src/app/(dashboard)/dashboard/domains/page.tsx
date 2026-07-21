"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Globe, CreditCard, Eye, HelpCircle, ShieldAlert, CheckCircle, Package, Plus, X, Trash2, Loader2 } from "lucide-react";
import PayModal from "@/components/PayModal";
import DomainSearch from "@/components/services/DomainSearch";

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
}

export default function ClientDomainsPage() {
  const { user, isLoaded: isUserLoaded } = useUser();
  const [domains, setDomains] = useState<ClientDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lkrRate, setLkrRate] = useState(300);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  
  // Pay Modal States
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

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
      const res = await fetch(`/api/services/domains/client?user_email=${encodeURIComponent(email)}`, { cache: "no-store" });
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
    // Fetch live currency conversion rate
    fetch("https://open.er-api.com/v6/latest/USD")
      .then((res) => res.json())
      .then((data) => {
        if (data?.rates?.LKR) {
          setLkrRate(data.rates.LKR);
        }
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

  const formatPrice = (price: string | number, currencyStr?: string | null, isAlreadyConverted = false) => {
    let val = parseFloat(String(price)) || 0;
    if (currencyStr === "LKR" && !isAlreadyConverted) {
      val = val * lkrRate;
    }
    const formatted = val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return currencyStr === "LKR" ? `Rs. ${formatted}` : `$${formatted}`;
  };

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

      {/* Domain Search & Direct Order (Always shown if 0 domains, toggled if user has domains) */}
      {(domains.length === 0 || showSearch) && (
        <DomainSearch />
      )}

      {domains.length > 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 text-sm bg-white/[0.02]">
                  <th className="p-5 font-medium">Domain</th>
                  <th className="p-5 font-medium text-right">Price</th>
                  <th className="p-5 font-medium text-right">Renews At</th>
                  <th className="p-5 font-medium">Expiry Date</th>
                  <th className="p-5 font-medium text-center">Status</th>
                  <th className="p-5 font-medium text-right">Invoice & Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {domains.map((d) => {
                  const regPrice = formatPrice(d.selling_price, d.currency);
                  const renewalPrice = formatPrice(d.renewal_price || d.selling_price, d.currency);
                  
                  return (
                    <tr key={d.id} className="hover:bg-white/5 transition-colors">
                      {/* Domain Name */}
                      <td className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-brand-400/10 text-brand-400">
                            <Globe className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="font-bold text-white text-base block">{d.domain_name}</span>
                            <span className="text-[10px] text-gray-500">Ordered: {new Date(d.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </td>

                      {/* Reg Price */}
                      <td className="p-5 text-right font-medium text-white text-base">
                        {regPrice}
                      </td>

                      {/* Renewal Price */}
                      <td className="p-5 text-right text-gray-400 text-sm">
                        {renewalPrice}
                      </td>

                      {/* Expiry */}
                      <td className="p-5 text-gray-300">
                        {d.expiry_date ? (
                          new Date(d.expiry_date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric"
                          })
                        ) : (
                          <span className="text-gray-500 italic text-xs">Pending Activation</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-5 text-center">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(d.status)}`}>
                          {d.status}
                        </span>
                      </td>

                      {/* Invoice & Actions */}
                      <td className="p-5 text-right">
                        <div className="flex items-center justify-end gap-3 flex-wrap">
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
                                  Pay Now ({formatPrice(d.total_due || '0', d.currency, true)})
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center">
        <div>
          {/* <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Active Registered Domains</h3>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            You don't have any registered domains yet. Use the search tool above to search availability and order your domain directly!
          </p> */}
        </div>
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
