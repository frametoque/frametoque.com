"use client";

import { useState } from "react";
import { Search, CheckCircle, XCircle, Globe, Server, ShieldCheck, Mail, ArrowRight, Loader2 } from "lucide-react";

export interface DomainSelectionAdminData {
  domain: string;
  packageType?: "standard" | "economy" | "second_level" | "global" | string;
  priceLkr?: number;
  costLkr?: number;
  renewPriceLkr?: number;
  priceUsd?: number;
  renewPriceUsd?: number;
  registrar?: string;
  currency?: string;
  reservedNames?: string[];
}

interface DomainSearchProps {
  lkrRate?: number;
  adminMode?: boolean;
  onSelectForAdmin?: (data: DomainSelectionAdminData) => void;
  selectedDomain?: string | null;
}

const roundToNearest10 = (amount: number) => Math.ceil((amount || 0) / 10) * 10;

const formatLKR = (amount: number) =>
  new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR" }).format(amount || 0);

export default function DomainSearch({
  lkrRate = 300,
  adminMode = false,
  onSelectForAdmin,
  selectedDomain,
}: DomainSearchProps) {
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

  const handleOrderDomain = async (
    targetDomain: string,
    options?: { packageType?: string; customPriceLkr?: number }
  ) => {
    if (!targetDomain) return;

    if (adminMode && onSelectForAdmin) {
      const packageType = options?.packageType || "global";
      let priceLkr = options?.customPriceLkr;
      let costLkr: number | undefined;
      let renewPriceLkr: number | undefined;
      let priceUsd: number | undefined;
      let renewPriceUsd: number | undefined;
      let registrar = "Cloudflare";
      let currency = "LKR";
      let reservedNames: string[] = [];

      if (result?.lk_tiers) {
        if (packageType === "standard") {
          priceLkr = result.lk_tiers.standard.price_lkr || 10000;
          costLkr = result.lk_tiers.standard.cost_lkr || 8000;
          renewPriceLkr = result.lk_tiers.standard.renew_price_lkr || 10000;
          registrar = "LK Domain Registry";
          reservedNames = result.lk_tiers.standard.reserved_names || [];
        } else if (packageType === "economy") {
          priceLkr = result.lk_tiers.economy.price_lkr || 6500;
          costLkr = result.lk_tiers.economy.cost_lkr || 5000;
          renewPriceLkr = result.lk_tiers.economy.renew_price_lkr || 6500;
          registrar = "LK Domain Registry";
        } else if (packageType === "second_level") {
          priceLkr = options?.customPriceLkr || 2000;
          costLkr = 1000;
          renewPriceLkr = priceLkr;
          registrar = "LK Domain Registry";
        }
      } else {
        registrar = "Cloudflare";
        priceUsd = parseFloat(result?.reg_price_usd || 0);
        renewPriceUsd = parseFloat(result?.renew_price_usd || 0);
        priceLkr = roundToNearest10(priceUsd * lkrRate);
        renewPriceLkr = roundToNearest10(renewPriceUsd * lkrRate);
        costLkr = roundToNearest10(parseFloat(result?.actual_cost_usd || result?.reg_price_usd || 0) * lkrRate);
      }

      onSelectForAdmin({
        domain: targetDomain,
        packageType,
        priceLkr,
        costLkr,
        renewPriceLkr,
        priceUsd,
        renewPriceUsd,
        registrar,
        currency,
        reservedNames,
      });
      return;
    }

    setOrderingDomain(targetDomain);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/services/domains/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: targetDomain,
          packageType: options?.packageType,
          customPriceLkr: options?.customPriceLkr,
        }),
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
              result.lk_tiers ? (
                /* LK Domain Registry Packages & Options View */
                <div className="space-y-6">
                  {/* Standard (Recommended) Tier */}
                  <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h4 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                          {result.lk_tiers.standard.domain}
                        </h4>
                        <span className="px-2.5 py-0.5 rounded-md border border-gray-600 bg-white/5 text-gray-300 text-xs font-semibold">
                          Standard
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md border border-blue-500/40 bg-blue-500/10 text-blue-400 text-xs font-bold uppercase tracking-wider">
                          RECOMMENDED
                        </span>
                      </div>

                      <div className="flex items-center gap-4 self-end sm:self-auto">
                        <div className="text-right">
                          <span className="text-xl font-black text-white">
                            {formatLKR(result.lk_tiers.standard.price_lkr)}
                          </span>
                          <span className="text-xs text-gray-400 font-normal">/yr</span>
                        </div>
                        {orderedDomains.includes(result.lk_tiers.standard.domain.toLowerCase()) ? (
                          <span className="px-6 py-3 rounded-3xl font-bold bg-slate-800/45 text-emerald-400 border border-emerald-500/30 text-sm flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" /> Ordered
                          </span>
                        ) : (
                          <button
                            onClick={() =>
                              handleOrderDomain(result.lk_tiers.standard.domain, {
                                packageType: "standard",
                                customPriceLkr: result.lk_tiers.standard.price_lkr,
                              })
                            }
                            disabled={orderingDomain === result.lk_tiers.standard.domain}
                            className={`px-6 py-3 rounded-3xl font-bold flex items-center gap-2 transition-all cursor-pointer text-xs disabled:opacity-50 ${
                              selectedDomain?.toLowerCase() === result.lk_tiers.standard.domain.toLowerCase()
                                ? "bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/30 ring-2 ring-brand-400"
                                : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                            }`}
                          >
                            {orderingDomain === result.lk_tiers.standard.domain ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <ArrowRight className="w-4 h-4" />
                            )}
                            <span>
                              {adminMode
                                ? selectedDomain?.toLowerCase() === result.lk_tiers.standard.domain.toLowerCase()
                                  ? "Selected for Client"
                                  : "Register for Client"
                                : orderingDomain === result.lk_tiers.standard.domain
                                ? "Ordering..."
                                : "Buy Domain"}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/5 text-xs text-gray-400 space-y-1.5">
                      <p className="text-gray-400 font-medium">You automatically reserve following names:</p>
                      <div className="flex flex-wrap gap-2 pt-0.5">
                        {result.lk_tiers.standard.reserved_names?.map((resName: string) => (
                          <span
                            key={resName}
                            className="font-mono text-gray-300 bg-white/5 px-2.5 py-1 rounded-md text-[11px] border border-white/5"
                          >
                            {resName}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Other options related to your domain name search */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-semibold text-gray-400">
                      Other options related to your domain name search
                    </h5>
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <h4 className="text-lg font-bold text-white">{result.lk_tiers.economy.domain}</h4>
                        <span className="px-2.5 py-0.5 rounded-md border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-semibold">
                          Economy
                        </span>
                      </div>

                      <div className="flex items-center gap-4 self-end sm:self-auto">
                        <div className="text-right">
                          <span className="text-base font-bold text-white">
                            {formatLKR(result.lk_tiers.economy.price_lkr)}
                          </span>
                          <span className="text-xs text-gray-400 font-normal">/yr</span>
                        </div>
                        {orderedDomains.includes(result.lk_tiers.economy.domain.toLowerCase()) ? (
                          <span className="px-4 py-2 rounded-2xl font-bold bg-slate-800/45 text-emerald-400 border border-emerald-500/30 text-xs">
                            Ordered
                          </span>
                        ) : (
                          <button
                            onClick={() =>
                              handleOrderDomain(result.lk_tiers.economy.domain, {
                                packageType: "economy",
                                customPriceLkr: result.lk_tiers.economy.price_lkr,
                              })
                            }
                            disabled={orderingDomain === result.lk_tiers.economy.domain}
                            className={`px-4 py-2 text-xs font-semibold rounded-2xl transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 ${
                              selectedDomain?.toLowerCase() === result.lk_tiers.economy.domain.toLowerCase()
                                ? "bg-brand-500 text-white border border-brand-400 shadow-md shadow-brand-500/20"
                                : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            }`}
                          >
                            {orderingDomain === result.lk_tiers.economy.domain ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <ArrowRight className="w-3.5 h-3.5" />
                            )}
                            <span>
                              {adminMode
                                ? selectedDomain?.toLowerCase() === result.lk_tiers.economy.domain.toLowerCase()
                                  ? "Selected"
                                  : "Register for Client"
                                : orderingDomain === result.lk_tiers.economy.domain
                                ? "Ordering..."
                                : "Buy"}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Budget (Second Level Domain Names Only) */}
                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                    <h5 className="text-sm font-semibold text-gray-300">
                      Budget (Second Level Domain Names Only)
                    </h5>
                    <div className="divide-y divide-white/5">
                      {result.lk_tiers.second_level?.map((item: any) => {
                        const isOrdered = orderedDomains.includes(item.domain.toLowerCase());
                        const isOrdering = orderingDomain === item.domain;
                        return (
                          <div
                            key={item.domain}
                            className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                          >
                            <span className="font-semibold text-white text-sm font-mono">
                              {item.domain}
                            </span>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <span className="text-sm font-bold text-white block">
                                  {formatLKR(item.price_lkr)}
                                  <span className="text-xs text-gray-400 font-normal">/yr</span>
                                </span>
                              </div>
                              {isOrdered ? (
                                <span className="px-4 py-2 text-xs font-semibold rounded-2xl bg-slate-800/45 text-emerald-400 border border-emerald-500/20">
                                  Ordered
                                </span>
                              ) : (
                                <button
                                  onClick={() =>
                                    handleOrderDomain(item.domain, {
                                      packageType: "second_level",
                                      customPriceLkr: item.price_lkr,
                                    })
                                  }
                                  disabled={isOrdering}
                                  className={`px-4 py-1.5 text-xs font-semibold rounded-2xl transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 ${
                                    selectedDomain?.toLowerCase() === item.domain.toLowerCase()
                                      ? "bg-brand-500 text-white border border-brand-400 shadow-md shadow-brand-500/20"
                                      : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  }`}
                                >
                                  {isOrdering ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  )}
                                  <span>
                                    {adminMode
                                      ? selectedDomain?.toLowerCase() === item.domain.toLowerCase()
                                        ? "Selected"
                                        : "Register for Client"
                                      : isOrdering
                                      ? "Ordering..."
                                      : "Buy"}
                                  </span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* Standard Top-Level Domain (Non-LK) */
                <div className="flex flex-col sm:flex-row items-center justify-between p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl gap-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-8 h-8 text-emerald-400 shrink-0" />
                    <div>
                      <h4 className="text-lg font-bold text-white leading-snug">{result.domain}</h4>
                      <p className="text-emerald-400 text-xs font-semibold uppercase tracking-wider mt-0.5">
                        Available for registration
                      </p>
                      {result.note &&
                        !result.note.includes("Code") &&
                        !result.note.includes("error") &&
                        !result.note.toLowerCase().includes("sandbox") &&
                        !result.note.toLowerCase().includes("cloudflare") &&
                        !result.note.toLowerCase().includes("lk nic") &&
                        !result.note.toLowerCase().includes("local registry") && (
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
                        Est. Renews at{" "}
                        <span className="text-gray-300 font-semibold">
                          ~{formatLKR(roundToNearest10(parseFloat(result.renew_price_usd || 0) * lkrRate))}/yr
                        </span>
                        *
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
                        className={`px-6 py-3 rounded-3xl font-bold flex items-center gap-2 transition-all cursor-pointer text-xs disabled:opacity-50 ${
                          selectedDomain?.toLowerCase() === result.domain.toLowerCase()
                            ? "bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/30 ring-2 ring-brand-400"
                            : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                        }`}
                      >
                        {orderingDomain === result.domain ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ArrowRight className="w-4 h-4" />
                        )}
                        <span>
                          {adminMode
                            ? selectedDomain?.toLowerCase() === result.domain.toLowerCase()
                              ? "Selected for Client"
                              : "Register for Client"
                            : orderingDomain === result.domain
                            ? "Ordering..."
                            : "Buy Domain"}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )
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
                Note: First year registration prices are valid for 3 days.
              </p>
              <p className="text-gray-400/80">
                * Renewal fees are estimated values and may adjust slightly based on standard registry and market rates at the time of renewal.
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
                              onClick={() => {
                                if (adminMode && onSelectForAdmin) {
                                  const pUsd = parseFloat(s.reg_price_usd || 0);
                                  const rUsd = parseFloat(s.renew_price_usd || 0);
                                  onSelectForAdmin({
                                    domain: s.domain,
                                    packageType: "global",
                                    priceLkr: roundToNearest10(pUsd * lkrRate),
                                    costLkr: roundToNearest10(parseFloat(s.actual_cost_usd || s.reg_price_usd || 0) * lkrRate),
                                    renewPriceLkr: roundToNearest10(rUsd * lkrRate),
                                    priceUsd: pUsd,
                                    renewPriceUsd: rUsd,
                                    registrar: "Cloudflare",
                                    currency: "LKR",
                                  });
                                  return;
                                }
                                handleOrderDomain(s.domain);
                              }}
                              disabled={isOrdering}
                              className={`px-4 py-2 text-xs font-semibold rounded-2xl transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 ${
                                selectedDomain?.toLowerCase() === s.domain.toLowerCase()
                                  ? "bg-brand-500 text-white border border-brand-400 shadow-md shadow-brand-500/20"
                                  : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              }`}
                            >
                              {isOrdering ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <ArrowRight className="w-3.5 h-3.5" />
                              )}
                              <span>
                                {adminMode
                                  ? selectedDomain?.toLowerCase() === s.domain.toLowerCase()
                                    ? "Selected"
                                    : "Register for Client"
                                  : isOrdering
                                  ? "Ordering..."
                                  : "Buy"}
                              </span>
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
