"use client";

import { useState } from "react";
import { Search, CheckCircle, XCircle, ShoppingCart, Globe, Server, ShieldCheck, Mail } from "lucide-react";
import { useCart } from "@/context/CartContext";

export default function DomainSearch() {
  const [domainInput, setDomainInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const { addToCart, cartItems } = useCart();
  const [added, setAdded] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainInput || !domainInput.includes(".")) {
      setError("Please enter a valid domain name (e.g. mycompany.com)");
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);
    setAdded(false);

    try {
      const res = await fetch(`/api/services/domains/check?domain=${encodeURIComponent(domainInput)}`);
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

  const handleAddToCart = () => {
    if (!result || !result.available) return;

    addToCart({
      id: `domain-${result.domain}`,
      serviceId: `domain-reg`,
      serviceTitle: `Domain Registration: ${result.domain}`,
      categorySlug: "domain",
      categoryName: "Domains",
      tier: `1 Year Registration (Renews at $${result.renew_price_usd}/yr)`,
      price: String(result.reg_price_usd * 300), 
      duration: "1 Year",
    });

    setAdded(true);
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
            Search domain availability and check real-time registrar rates instantly.
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
              className="w-full bg-neutral-950 border-0 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-gray-500 outline-none transition-all duration-300 text-base focus:ring-0"
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
                  </div>
                </div>
                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Price (1st Yr)</p>
                    <p className="text-2xl font-black text-white">${result.reg_price_usd}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Renews at ${result.renew_price_usd}/yr</p>
                  </div>
                  <button
                    onClick={handleAddToCart}
                    disabled={added}
                    className={`px-6 py-3 rounded-3xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      added
                        ? "bg-slate-800/45 text-gray-500 border border-slate-700/20 cursor-not-allowed"
                        : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                    }`}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>{added ? "Added to Cart" : "Buy Domain"}</span>
                  </button>
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

            {/* Price Validity Notice */}
            <p className="text-[11px] text-gray-500 text-center leading-relaxed bg-white/[0.01] border border-white/5 py-2.5 px-4 rounded-2xl">
              ⚠️ Note: Prices are valid only for 3 days. If the order is unpaid after 3 days, domain pricing may change slightly due to registrar rate fluctuations.
            </p>

            {/* Suggestions List */}
            {result.suggestions && result.suggestions.length > 0 && (
              <div className="pt-6 border-t border-neutral-900 space-y-4">
                <h4 className="text-sm font-semibold text-gray-400">Suggested domain names</h4>
                <div className="space-y-3">
                  {result.suggestions.map((s: any) => {
                    const isSuggestionAdded = cartItems.some((item) => item.id === `domain-${s.domain}`);
                    
                    return (
                      <div key={s.domain} className="flex items-center justify-between p-4 bg-white/[0.02] border border-neutral-900 rounded-xl gap-4 hover:border-neutral-800 transition-colors">
                        <div>
                          <span className="font-semibold text-white text-sm">{s.domain}</span>
                          <div className="text-[10px] text-gray-500 mt-1">Renews at ${s.renew_price_usd}/yr</div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-sm font-bold text-white">${s.reg_price_usd}</span>
                          </div>
                          <button
                            onClick={() => {
                              addToCart({
                                id: `domain-${s.domain}`,
                                serviceId: `domain-reg`,
                                serviceTitle: `Domain Registration: ${s.domain}`,
                                categorySlug: "domain",
                                categoryName: "Domains",
                                tier: `1 Year Registration (Renews at $${s.renew_price_usd}/yr)`,
                                price: String(s.reg_price_usd * 300),
                                duration: "1 Year",
                              });
                            }}
                            disabled={isSuggestionAdded}
                            className={`px-4 py-2 text-xs font-semibold rounded-2xl transition-all cursor-pointer ${
                              isSuggestionAdded
                                ? "bg-slate-800/45 text-gray-500 border border-slate-700/20 cursor-not-allowed"
                                : "bg-white hover:bg-neutral-200 text-black shadow-md"
                            }`}
                          >
                            {isSuggestionAdded ? "Added" : "Confirm"}
                          </button>
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

      {/* Selling Points / Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-black border border-neutral-900 p-6 rounded-2xl flex items-start gap-4 hover:border-neutral-800 transition-all duration-300">
          <div className="p-3 bg-brand-500/10 rounded-xl text-brand-400 shrink-0">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-white mb-2 text-lg">Free DNS Setup</h4>
            <p className="text-gray-400 text-sm leading-relaxed">
              We configure your domain’s DNS settings professionally at zero extra cost to guarantee peak speed.
            </p>
          </div>
        </div>

        <div className="bg-black border border-neutral-900 p-6 rounded-2xl flex items-start gap-4 hover:border-neutral-800 transition-all duration-300">
          <div className="p-3 bg-brand-500/10 rounded-xl text-brand-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-white mb-2 text-lg">Hosting Connection</h4>
            <p className="text-gray-400 text-sm leading-relaxed">
              Seamlessly link your domain to any web hosting platform or cloud server with our expert assistance.
            </p>
          </div>
        </div>

        <div className="bg-black border border-neutral-900 p-6 rounded-2xl flex items-start gap-4 hover:border-neutral-800 transition-all duration-300">
          <div className="p-3 bg-brand-500/10 rounded-xl text-brand-400 shrink-0">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-white mb-2 text-lg">Renewal Reminders</h4>
            <p className="text-gray-400 text-sm leading-relaxed">
              Never lose ownership of your domain. Receive automated notifications and reminders before expiration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
