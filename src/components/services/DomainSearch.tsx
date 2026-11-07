"use client";

import { useState } from "react";
import { Search, CheckCircle, XCircle, Globe, Server, ShieldCheck, Mail, ArrowRight, Loader2 } from "lucide-react";

interface DomainSearchProps {
  lkrRate?: number;
}

const roundToNearest10 = (amount: number) => Math.ceil((amount || 0) / 10) * 10;

const formatLKR = (amount: number) =>
  new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR" }).format(amount || 0);

export default function DomainSearch({ lkrRate = 300 }: DomainSearchProps) {
  const [domainInput, setDomainInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [orderingDomain, setOrderingDomain] = useState<string | null>(null);
  const [orderedDomains, setOrderedDomains] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    let query = domainInput.trim().toLowerCase();
    if (!query) {
      setError("Please enter a domain name.");
      return;
    }
    if (!query.includes(".")) {
      query = `${query}.com`;
      setDomainInput(query);
    }

    setError("");
    setSuccessMsg("");
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`/api/services/domains/check?domain=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to check domain availability.");
      }
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleOrderDomain = async (targetDomain: string) => {
    if (!targetDomain) return;
    setOrderingDomain(targetDomain);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/services/domains/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: targetDomain }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to place domain order.");
      }

      setOrderedDomains((prev) => [...prev, targetDomain.toLowerCase()]);
      setSuccessMsg(`Domain order placed for "${targetDomain}"! Opening payment...`);

      // Notify the domains table on dashboard to refresh
      window.dispatchEvent(new CustomEvent("domains:refresh"));

      if (data.invoice_id) {
        window.dispatchEvent(
          new CustomEvent("domains:openPay", {
            detail: {
              invoice_id: data.invoice_id,
              project_name: `Domain: ${targetDomain}`,
              total_due: data.total_due,
              currency: data.currency || "LKR",
            },
          })
        );
      }
    } catch (err: any) {
      setError(err.message || "Could not complete domain order.");
    } finally {
      setOrderingDomain(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-0 pb-8 space-y-12">
      {/* Search Area */}
      <div className="bg-black border border-neutral-900 rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-2xl">
        <div className="max-w-2xl mx-auto text-center space-y-4 mb-8 relative z-10">
          <h3 className="text-2xl md:text-3xl font-black text-white leading-tight">
            Find the Perfect <span className="text-brand-400">Domain</span>
          </h3>
          <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
            Search multi-TLD availability (.com, .lk, .net, .org, .io, .xyz) with instant registrar rates powered by Frametoque Digital.
          </p>
        </div>

        <form onSubmit={handleSearch} className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-3 relative z-10">
          <div className="flex-1 relative">
            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Enter domain name (e.g. yourbusiness.com)..."
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-gray-500 outline-none transition-all duration-300 text-base focus:border-brand-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-4 bg-white hover:bg-neutral-200 text-black font-bold rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 shadow-lg disabled:opacity-50 text-base cursor-pointer shrink-0"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Search className="w-5 h-5" />
                <span>Search</span>
              </>
            )}
          </button>
        </form>

        {error && (
          <p className="text-red-400 text-sm mt-4 text-center font-medium">
            {error}
          </p>
        )}

        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm mt-4 p-4 rounded-2xl text-center font-medium">
            {successMsg}
          </div>
        )}

        {/* Result Area */}
        {result && (
          <div className="mt-8 pt-8 border-t border-neutral-800 max-w-2xl mx-auto relative z-10 space-y-6">
            {result.available ? (
              <div className="flex flex-col sm:flex-row items-center justify-between p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-emerald-400 shrink-0" />
                  <div>
                    <h4 className="text-lg font-bold text-white leading-snug">{result.domain}</h4>
                    <p className="text-emerald-400 text-xs font-semibold uppercase tracking-wider mt-0.5">Available for registration</p>
                    {result.note &&
                      !result.note.includes("Code") &&
                      !result.note.includes("error") &&
                      !result.note.toLowerCase().includes("sandbox") &&
                      !result.note.toLowerCase().includes("cloudflare") && (
                        <p className="text-gray-400 text-[10px] mt-1">{result.note}</p>
                      )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Price (1st Yr)</p>
                    <p className="text-2xl font-black text-white">
                      {formatLKR(roundToNearest10(parseFloat(result.reg_price_usd || 0) * lkrRate))}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Est. Renews at <span className="text-gray-300 font-semibold">~{formatLKR(roundToNearest10(parseFloat(result.renew_price_usd || 0) * lkrRate))}/yr</span>*
                    </p>
                  </div>
                  {orderedDomains.includes(result.domain.toLowerCase()) ? (
                    <span className="px-6 py-3 rounded-3xl font-bold bg-slate-800/45 text-emerald-400 border border-emerald-500/30 text-sm flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Ordered
                    </span>
                  ) : (
                    <button
                      onClick={() => handleOrderDomain(result.domain)}
                      disabled={orderingDomain === result.domain}
                      className="px-6 py-3 rounded-3xl font-bold flex items-center gap-2 transition-all cursor-pointer bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 disabled:opacity-50 text-xs"
                    >
                      {orderingDomain === result.domain ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ArrowRight className="w-4 h-4" />
                      )}
                      <span>{orderingDomain === result.domain ? "Ordering..." : "Buy Domain"}</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-6 bg-rose-500/5 border border-rose-500/20 rounded-2xl">
                <XCircle className="w-8 h-8 text-rose-400 shrink-0" />
                <div>
                  <h4 className="text-lg font-bold text-white leading-snug">{result.domain}</h4>
                  <p className="text-rose-400 text-xs font-semibold uppercase tracking-wider mt-0.5">Domain is already registered</p>
                </div>
              </div>
            )}

            {/* Price Validity & Renewal Disclaimer Notice */}
            <div className="text-[11px] text-gray-400 text-center leading-relaxed bg-white/[0.02] border border-white/5 py-3 px-4 rounded-2xl space-y-1">
              <p>
                ⚠️ Note: First year registration prices are valid for 3 days. Domain orders generate an invoice automatically for online or bank payment.
              </p>
              <p className="text-gray-400/80">
                * Renewal fees are estimated values based on current exchange rates and can vary slightly according to the USD to LKR conversion rate at the time of renewal.
              </p>
            </div>

            {/* Suggestions List */}
            {result.suggestions && result.suggestions.length > 0 && (
              <div className="pt-6 border-t border-neutral-900 space-y-4">
                <h4 className="text-sm font-semibold text-gray-400">Alternative extensions available:</h4>
                <div className="space-y-3">
                  {result.suggestions.map((s: any) => {
                    const isOrdered = orderedDomains.includes(s.domain.toLowerCase());
                    const isOrdering = orderingDomain === s.domain;

                    return (
                      <div key={s.domain} className="flex items-center justify-between p-4 bg-white/[0.02] border border-neutral-900 rounded-xl gap-4 hover:border-neutral-800 transition-colors">
                        <div>
                          <span className="font-semibold text-white text-sm">{s.domain}</span>
                          <div className="text-[10px] text-gray-400 mt-1">
                            Est. Renews at ~{formatLKR(roundToNearest10(parseFloat(s.renew_price_usd || 0) * lkrRate))}/yr*
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-sm font-bold text-white block">
                              {formatLKR(roundToNearest10(parseFloat(s.reg_price_usd || 0) * lkrRate))}
                            </span>
                          </div>
                          {isOrdered ? (
                            <span className="px-4 py-2 text-xs font-semibold rounded-2xl bg-slate-800/45 text-emerald-400 border border-emerald-500/20">
                              Ordered
                            </span>
                          ) : (
                            <button
                              onClick={() => handleOrderDomain(s.domain)}
                              disabled={isOrdering}
                              className="px-4 py-2 text-xs font-semibold rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                            >
                              {isOrdering ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <ArrowRight className="w-3.5 h-3.5" />
                              )}
                              <span>{isOrdering ? "Ordering..." : "Buy"}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
