"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Upload,
  Unlink,
  ExternalLink,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  addDomainOrder,
  getInvoicesForLinking,
  uploadProviderInvoice,
} from "@/app/(dashboard)/admin/actions/domains";

// Formatters
const formatLKR = (amount: number) =>
  new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR" }).format(amount || 0);

const formatUSD = (amount: number) => `$${(amount || 0).toFixed(2)}`;

// PDF to Image Converter helper
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
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({ canvasContext: context, viewport }).promise;

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Canvas conversion to Blob failed"));
        return;
      }
      const imageFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".png", {
        type: "image/png",
      });
      resolve(imageFile);
    }, "image/png");
  });
};

export default function NewDomainOrderPage() {
  const router = useRouter();

  const [lkrRate, setLkrRate] = useState<number>(310);

  // Form states
  const [email, setEmail] = useState("");
  const [domainName, setDomainName] = useState("");
  const [registrar, setRegistrar] = useState("Cloudflare");
  const [status, setStatus] = useState("active");
  const [expiry, setExpiry] = useState(() => {
    const exp = new Date();
    exp.setFullYear(exp.getFullYear() + 1);
    return exp.toISOString().split("T")[0];
  });

  // Registration Pricing
  const [actualPriceCurrency, setActualPriceCurrency] = useState("USD");
  const [regCost, setRegCost] = useState("");
  const [regBankLkr, setRegBankLkr] = useState("");
  const [regRate, setRegRate] = useState("310.00");
  const [regPrice, setRegPrice] = useState("");
  const [regPriceLkr, setRegPriceLkr] = useState("");

  // Renewal Pricing
  const [renewCostCurrency, setRenewCostCurrency] = useState("USD");
  const [renewCost, setRenewCost] = useState("");
  const [renewBankLkr, setRenewBankLkr] = useState("");
  const [renewRate, setRenewRate] = useState("310.00");
  const [renewPrice, setRenewPrice] = useState("");
  const [renewPriceLkr, setRenewPriceLkr] = useState("");

  // Invoice linking
  const [invoiceId, setInvoiceId] = useState("");
  const [modalInvoices, setModalInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Provider Invoice
  const [providerInvoiceUrl, setProviderInvoiceUrl] = useState<string | null>(null);
  const [uploadingInvoice, setUploadingInvoice] = useState(false);

  // Search & submission
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch exchange rate and invoices
  useEffect(() => {
    fetch("/api/services/domains/rate")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.rate) {
          setLkrRate(data.rate);
          setRegRate(String(Number(data.rate).toFixed(2)));
          setRenewRate(String(Number(data.rate).toFixed(2)));
        }
      })
      .catch(() => {});

    setLoadingInvoices(true);
    getInvoicesForLinking()
      .then((invs) => setModalInvoices(invs))
      .catch((err) => console.error(err))
      .finally(() => setLoadingInvoices(false));
  }, []);

  // Dynamic calculations for registration
  const isLkr = actualPriceCurrency === "LKR";
  const costNum = parseFloat(regCost) || 0;
  const bankLkrNum = parseFloat(regBankLkr) || 0;
  const effRateNum = parseFloat(regRate) || (isLkr ? 1 : (costNum > 0 && bankLkrNum > 0 ? bankLkrNum / costNum : lkrRate));
  const regPriceLkrNum = parseFloat(regPriceLkr) || (parseFloat(regPrice) ? parseFloat(regPrice) * effRateNum : 0);
  const regPriceUsdNum = parseFloat(regPrice) || (effRateNum > 0 ? regPriceLkrNum / effRateNum : 0);
  const costUsdNum = isLkr ? (effRateNum > 0 ? costNum / effRateNum : 0) : costNum;
  const profitUsd = regPriceUsdNum - costUsdNum;
  const profitLkr = regPriceLkrNum - (isLkr ? costNum : (bankLkrNum || costNum * effRateNum));

  // Dynamic calculations for renewal
  const isRenLkr = renewCostCurrency === "LKR";
  const renCostNum = parseFloat(renewCost) || 0;
  const renBankLkrNum = parseFloat(renewBankLkr) || 0;
  const renRateNum = parseFloat(renewRate) || (isRenLkr ? 1 : (renCostNum > 0 && renBankLkrNum > 0 ? renBankLkrNum / renCostNum : effRateNum));
  const renPriceLkrNum = parseFloat(renewPriceLkr) || (parseFloat(renewPrice) ? parseFloat(renewPrice) * renRateNum : 0);
  const renPriceUsdNum = parseFloat(renewPrice) || (renRateNum > 0 ? renPriceLkrNum / renRateNum : 0);
  const renCostUsdNum = isRenLkr ? (renRateNum > 0 ? renCostNum / renRateNum : 0) : renCostNum;
  const renProfitUsd = renPriceUsdNum - renCostUsdNum;
  const renProfitLkr = renPriceLkrNum - (isRenLkr ? renCostNum : (renBankLkrNum || renCostNum * renRateNum));

  const checkDomainAvailability = async () => {
    if (!domainName || !domainName.includes(".")) {
      alert("Please enter a valid domain name");
      return;
    }
    setSearchLoading(true);
    setSearchResults(null);
    try {
      const res = await fetch(`/api/services/domains/check?domain=${encodeURIComponent(domainName)}`);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error(data?.error || "Failed to check domain");
      setSearchResults(data);
      if (data.available) {
        const costUsd = data.reg_price_usd || 10.46;
        const renCostUsd = data.renew_price_usd || 10.46;
        setRegCost(String(costUsd));
        setRenewCost(String(renCostUsd));
        const rate = parseFloat(regRate) || lkrRate;
        const bankLkr = (costUsd * rate).toFixed(2);
        setRegBankLkr(bankLkr);
        setRenewBankLkr((renCostUsd * rate).toFixed(2));

        const sellUsd = Number((costUsd * 1.35).toFixed(2));
        const renSellUsd = Number((renCostUsd * 1.35).toFixed(2));
        setRegPrice(String(sellUsd));
        setRegPriceLkr(String((sellUsd * rate).toFixed(2)));
        setRenewPrice(String(renSellUsd));
        setRenewPriceLkr(String((renSellUsd * rate).toFixed(2)));
      } else {
        alert("Domain is already registered according to WHOIS, but you can still record it manually.");
      }
    } catch (err: any) {
      alert("WHOIS search error: " + err.message);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const isLkrCurr = actualPriceCurrency === "LKR";
    const rawCost = parseFloat(regCost) || 0;
    const bankDeductionLkr = parseFloat(regBankLkr) || (isLkrCurr ? rawCost : rawCost * lkrRate);

    const effRate = isLkrCurr
      ? lkrRate
      : (rawCost > 0 && bankDeductionLkr > 0 ? bankDeductionLkr / rawCost : (parseFloat(regRate) || lkrRate));

    const regSellLkr = parseFloat(regPriceLkr) || (parseFloat(regPrice) ? parseFloat(regPrice) * effRate : 0);
    const regSellUsd = parseFloat(regPrice) || (effRate > 0 ? regSellLkr / effRate : 0);
    const regCostUsd = isLkrCurr ? (effRate > 0 ? rawCost / effRate : 0) : rawCost;
    const calcProfitUsd = regSellUsd - regCostUsd;

    const isRenewalLkr = renewCostCurrency === "LKR";
    const rawRenCost = parseFloat(renewCost) || 0;
    const renBankLkr = parseFloat(renewBankLkr) || (isRenewalLkr ? rawRenCost : rawRenCost * effRate);
    const finalRenRate = isRenewalLkr
      ? effRate
      : (rawRenCost > 0 && renBankLkr > 0 ? renBankLkr / rawRenCost : (parseFloat(renewRate) || effRate));
    const renSellLkr = parseFloat(renewPriceLkr) || (parseFloat(renewPrice) ? parseFloat(renewPrice) * finalRenRate : 0);
    const renSellUsd = parseFloat(renewPrice) || (finalRenRate > 0 ? renSellLkr / finalRenRate : 0);

    try {
      const res = await addDomainOrder({
        client_email: email,
        domain_name: domainName,
        actual_price: isLkrCurr ? rawCost : regCostUsd,
        actual_price_currency: actualPriceCurrency,
        selling_price: isLkrCurr ? (effRate > 0 ? regSellLkr / effRate : regSellLkr) : regSellUsd,
        profit: calcProfitUsd,
        renewal_cost: isRenewalLkr ? rawRenCost : (parseFloat(renewCost) || 0),
        renewal_price: isRenewalLkr ? (finalRenRate > 0 ? renSellLkr / finalRenRate : renSellLkr) : renSellUsd,
        renewal_cost_currency: renewCostCurrency,
        renewal_lkr_cost: renBankLkr,
        renewal_lkr_price: renSellLkr,
        renewal_lkr_rate: finalRenRate,
        registrar,
        expiry_date: expiry ? expiry + " 00:00:00" : "",
        status,
        invoice_id: invoiceId.trim() || null,
        provider_invoice_url: providerInvoiceUrl,
        activation_lkr_cost: bankDeductionLkr,
        activation_lkr_price: regSellLkr,
        activation_lkr_rate: effRate,
      });

      if (res.success) {
        router.push("/admin/web-services?tab=domains");
      } else {
        alert("Failed to add domain order: " + ((res as any).error || "Unknown error"));
        setSubmitting(false);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 w-full">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/web-services?tab=domains"
            className="p-2.5 hover:bg-white/10 rounded-2xl transition-colors text-gray-400 hover:text-white border border-white/5 flex items-center justify-center cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">
              Add Domain Order
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Record domain registration, lock exact bank exchange rates &amp; link billing
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Domain Information Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="text-base font-semibold text-white">Domain &amp; Client Details</h2>
            <span className="text-xs text-gray-400">Step 1 of 3</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300 block">Client Email</label>
              <input
                type="email"
                required
                placeholder="client@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300 block">Domain Name</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="example.com or company.lk"
                  value={domainName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDomainName(val);
                    if (val.toLowerCase().endsWith(".lk")) {
                      setActualPriceCurrency("LKR");
                      setRenewCostCurrency("LKR");
                      if (registrar === "Cloudflare") {
                        setRegistrar("LK Domain Registry");
                      }
                    }
                  }}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white font-mono"
                />
                <button
                  type="button"
                  onClick={checkDomainAvailability}
                  disabled={searchLoading}
                  className="px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap flex items-center gap-1.5"
                >
                  {searchLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{searchLoading ? "Checking..." : "Check API"}</span>
                </button>
              </div>
            </div>
          </div>

          {searchResults && (
            <div
              className={`p-3.5 rounded-2xl border text-xs ${
                searchResults.available
                  ? "bg-green-500/10 border-green-500/20 text-green-400"
                  : "bg-red-500/10 border-red-500/20 text-red-400"
              }`}
            >
              {searchResults.available
                ? `✓ Domain is available! Registrar Cost: $${searchResults.reg_price_usd} (Renews: $${searchResults.renew_price_usd}). Prices auto-filled below.`
                : `✗ WHOIS: Domain is already registered.`}
            </div>
          )}

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300 block">Registrar</label>
              <input
                type="text"
                required
                placeholder="Cloudflare, Internet.bs, LK Domain..."
                value={registrar}
                onChange={(e) => setRegistrar(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300 block">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white cursor-pointer"
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300 block">Expiry Date</label>
              <input
                type="date"
                required
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white"
              />
            </div>
          </div>
        </div>

        {/* Registration Pricing & Bank Cost */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div>
              <h2 className="text-base font-semibold text-white">
                1. Registration Pricing &amp; Bank Cost
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {isLkr
                  ? "Registrar costs in LKR (.lk domain)"
                  : "Registrar costs in USD; exact bank charge deducted in LKR"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-400 font-medium">Registrar Currency:</label>
              <select
                value={actualPriceCurrency}
                onChange={(e) => {
                  const curr = e.target.value;
                  setActualPriceCurrency(curr);
                  if (curr === "LKR") {
                    setRegBankLkr(regCost || "3500");
                  } else {
                    const costUsd = parseFloat(regCost) || 10.46;
                    setRegBankLkr((costUsd * lkrRate).toFixed(2));
                  }
                }}
                className="bg-neutral-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-brand-500 cursor-pointer"
              >
                <option value="USD">USD ($)</option>
                <option value="LKR">LKR (Rs.)</option>
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300 block">
                Registrar Showing Cost ({isLkr ? "Rs." : "$"})
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={regCost}
                onChange={(e) => {
                  const val = e.target.value;
                  setRegCost(val);
                  const num = parseFloat(val) || 0;
                  if (isLkr) {
                    setRegBankLkr(val);
                  } else {
                    const rate = parseFloat(regRate) || lkrRate;
                    setRegBankLkr((num * rate).toFixed(2));
                  }
                }}
                placeholder={isLkr ? "3500.00" : "10.46"}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors font-mono text-white"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-amber-300 block">
                  Bank Deduction (LKR)
                </label>
                {!isLkr && costNum > 0 && bankLkrNum > 0 && (
                  <span className="text-[10px] text-amber-400 font-mono">
                    @{Math.round(effRateNum)}
                  </span>
                )}
              </div>
              <input
                type="number"
                step="0.01"
                required
                value={regBankLkr}
                onChange={(e) => {
                  const val = e.target.value;
                  setRegBankLkr(val);
                  const bankNum = parseFloat(val) || 0;
                  if (!isLkr && costNum > 0 && bankNum > 0) {
                    const newRate = bankNum / costNum;
                    setRegRate(newRate.toFixed(4));
                    if (regPriceLkr) {
                      setRegPrice((parseFloat(regPriceLkr) / newRate).toFixed(2));
                    }
                  }
                }}
                placeholder="e.g. 3571.00"
                className="w-full bg-white/5 border border-amber-500/30 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-amber-400 transition-colors font-mono text-amber-200"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300 block">
                Exchange Rate (LKR/USD)
              </label>
              <input
                type="number"
                step="0.01"
                value={regRate}
                onChange={(e) => {
                  const val = e.target.value;
                  setRegRate(val);
                  const r = parseFloat(val) || lkrRate;
                  if (!isLkr && costNum > 0) {
                    setRegBankLkr((costNum * r).toFixed(2));
                  }
                  if (regPrice) {
                    setRegPriceLkr((parseFloat(regPrice) * r).toFixed(2));
                  }
                }}
                placeholder={String(lkrRate)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors font-mono text-white"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-200 block">
                Selling Price in LKR (Client Price)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={regPriceLkr}
                onChange={(e) => {
                  const val = e.target.value;
                  setRegPriceLkr(val);
                  const lkrP = parseFloat(val) || 0;
                  if (effRateNum > 0) {
                    setRegPrice((lkrP / effRateNum).toFixed(2));
                  }
                }}
                placeholder="e.g. 5260.91 or 5000"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors font-mono text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 block">
                Equivalent Price in USD ($)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={regPrice}
                onChange={(e) => {
                  const val = e.target.value;
                  setRegPrice(val);
                  const usdP = parseFloat(val) || 0;
                  setRegPriceLkr((usdP * effRateNum).toFixed(2));
                }}
                placeholder="e.g. 15.41"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors font-mono text-gray-300"
              />
            </div>
          </div>

          {/* Live Profit Preview */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-xs">
            <span className="text-gray-300 font-medium">Estimated Registration Profit:</span>
            <span className="font-bold text-brand-400">
              +{formatUSD(profitUsd)} ({formatLKR(profitLkr)})
            </span>
          </div>
        </div>

        {/* Renewal Pricing */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div>
              <h2 className="text-base font-semibold text-white">
                2. Renewal Pricing (Same Flow)
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Configure future renewal cost &amp; client selling price</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-400 font-medium">Renewal Currency:</label>
              <select
                value={renewCostCurrency}
                onChange={(e) => setRenewCostCurrency(e.target.value)}
                className="bg-neutral-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-brand-500 cursor-pointer"
              >
                <option value="USD">USD ($)</option>
                <option value="LKR">LKR (Rs.)</option>
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300 block">
                Renewal Cost ({renewCostCurrency === "LKR" ? "Rs." : "$"})
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={renewCost}
                onChange={(e) => {
                  const val = e.target.value;
                  setRenewCost(val);
                  const num = parseFloat(val) || 0;
                  if (renewCostCurrency === "LKR") {
                    setRenewBankLkr(val);
                  } else {
                    setRenewBankLkr((num * renRateNum).toFixed(2));
                  }
                }}
                placeholder={renewCostCurrency === "LKR" ? "3500.00" : "10.46"}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors font-mono text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-amber-300 block">
                Renewal Bank Deduction (LKR)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={renewBankLkr}
                onChange={(e) => setRenewBankLkr(e.target.value)}
                placeholder="e.g. 3571.00"
                className="w-full bg-white/5 border border-amber-500/30 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-amber-400 transition-colors font-mono text-amber-200"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-200 block">
                Renewal Selling Price in LKR (Client Price)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={renewPriceLkr}
                onChange={(e) => {
                  const val = e.target.value;
                  setRenewPriceLkr(val);
                  const lkrP = parseFloat(val) || 0;
                  if (renRateNum > 0) {
                    setRenewPrice((lkrP / renRateNum).toFixed(2));
                  }
                }}
                placeholder="e.g. 5260.91 or 5000"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors font-mono text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 block">
                Renewal Price in USD ($)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={renewPrice}
                onChange={(e) => {
                  const val = e.target.value;
                  setRenewPrice(val);
                  const usdP = parseFloat(val) || 0;
                  setRenewPriceLkr((usdP * renRateNum).toFixed(2));
                }}
                placeholder="e.g. 15.41"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors font-mono text-gray-300"
              />
            </div>
          </div>

          {/* Live Renewal Profit Preview */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-xs">
            <span className="text-gray-300 font-medium">Estimated Renewal Profit:</span>
            <span className="font-bold text-brand-400">
              +{formatUSD(renProfitUsd)} ({formatLKR(renProfitLkr)})
            </span>
          </div>
        </div>

        {/* Invoice Linking Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div>
              <h2 className="text-base font-semibold text-white">
                3. Link Invoice (Order Billing)
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Optional: attach an existing invoice to this new domain order
              </p>
            </div>
            {invoiceId && (
              <button
                type="button"
                onClick={() => setInvoiceId("")}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
              >
                <Unlink className="w-3.5 h-3.5" />
                Clear Link
              </button>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300 block">Select Existing Invoice</label>
              <select
                value={invoiceId}
                onChange={(e) => setInvoiceId(e.target.value)}
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-brand-500 cursor-pointer"
              >
                <option value="">-- No Linked Invoice --</option>
                {modalInvoices.map((inv) => (
                  <option key={inv.invoice_id} value={inv.invoice_id}>
                    {inv.invoice_id} - {inv.user_email} ({formatLKR(inv.total)}) [{inv.payment_status}]
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300 block">Or Enter Invoice ID Directly</label>
              <input
                type="text"
                value={invoiceId}
                onChange={(e) => setInvoiceId(e.target.value)}
                placeholder="e.g. INV-00049"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 font-mono text-white"
              />
            </div>
          </div>

          {invoiceId && (
            <div className="flex items-center gap-2 pt-1 text-xs text-blue-400">
              <Check className="w-4 h-4" />
              <span>
                Will link to invoice: <strong>{invoiceId}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Provider Invoice Upload */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4">
          <div className="border-b border-white/5 pb-3">
            <h2 className="text-base font-semibold text-white">
              Provider Invoice (Admin Only - Optional)
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Upload PDF or receipt from registrar (Cloudflare, LK Domain, etc.)
            </p>
          </div>

          <div className="flex items-center gap-4">
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
                  setProviderInvoiceUrl(url);
                } catch (err: any) {
                  alert("Failed to upload: " + err.message);
                } finally {
                  setUploadingInvoice(false);
                }
              }}
              className="hidden"
              id="provider-invoice-page-upload"
            />
            <label
              htmlFor="provider-invoice-page-upload"
              className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-semibold cursor-pointer transition-colors text-white flex items-center gap-2"
            >
              <Upload className="w-4 h-4 text-brand-400" />
              <span>{uploadingInvoice ? "Uploading..." : providerInvoiceUrl ? "Change Invoice" : "Upload Invoice"}</span>
            </label>

            {providerInvoiceUrl && (
              <div className="flex items-center gap-3">
                <a
                  href={providerInvoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand-400 hover:underline flex items-center gap-1"
                >
                  <span>View Uploaded Invoice</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => setProviderInvoiceUrl(null)}
                  className="text-xs text-red-400 hover:underline cursor-pointer"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/admin/web-services?tab=domains"
            className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-2xl font-semibold transition-colors text-sm text-gray-300 cursor-pointer"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting || uploadingInvoice}
            className="px-7 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-semibold transition-colors text-sm disabled:opacity-50 cursor-pointer flex items-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{submitting ? "Saving..." : "Add Domain Order"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
