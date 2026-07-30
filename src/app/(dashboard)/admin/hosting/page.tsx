"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  getHostingOrders,
  addHostingOrder,
  updateHostingOrder,
  deleteHostingOrder,
  uploadRenewalInvoiceForHosting,
  addHostingRenewalInvoiceUrl,
  HostingOrder
} from "../actions/hosting";
import { uploadProviderInvoice } from "../actions/domains";
import {
  Server, Shield, HardDrive, Cpu, Cloud, Settings, Plus, Edit2, Trash2, X, FileText, Globe, Mail, Clock, Check, Search, AlertTriangle, TrendingUp, ChevronLeft, ChevronRight, Upload, Lock, RefreshCw
} from "lucide-react";

const formatLKR = (amount: number) =>
  new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR" }).format(amount || 0);

const formatUSD = (amount: number) => `$${amount.toFixed(2)}`;

const convertPdfToImage = async (file: File): Promise<File> => {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return file;

  console.log("PDF file detected, initiating image conversion:", file.name);

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
      console.log("PDF successfully converted to image file:", newFilename);
      resolve(convertedFile);
    }, "image/png");
  });
};

/** Shows USD price + live or locked LKR conversion. Amber = locked at activation rate, gray = live */
function PricePair({
  usd,
  lockedRate,
  liveRate,
  dimmed = false,
}: {
  usd: number;
  lockedRate?: number | null;
  liveRate: number;
  dimmed?: boolean;
}) {
  const rate = lockedRate != null ? lockedRate : liveRate;
  const lkrValue = usd * rate;
  const isFixed = lockedRate != null;

  return (
    <div className={`text-sm ${dimmed ? "text-gray-400" : "text-white font-medium"}`}>
      {formatUSD(usd)}
      <span className={`text-xs font-normal ml-1 ${isFixed ? "text-amber-300/80" : "text-gray-500"}`}>
        ({formatLKR(lkrValue)}
        <span className={`${isFixed ? "text-amber-300/80" : "text-gray-500"} text-[9px] ml-0.5`}>@{Math.round(rate)}</span>)
      </span>
    </div>
  );
}

export default function HostingPage() {
  const [orders, setOrders] = useState<HostingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [viewingInvoice, setViewingInvoice] = useState<any | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<HostingOrder | null>(null);

  // Add form states
  const [addEmail, setAddEmail] = useState("");
  const [addDomain, setAddDomain] = useState("");
  const [addProvider, setAddProvider] = useState("Other");
  const [addActualPrice, setAddActualPrice] = useState("");
  const [addActualCurrency, setAddActualCurrency] = useState("USD");
  const [addSellingPrice, setAddSellingPrice] = useState("");
  const [addSellingCurrency, setAddSellingCurrency] = useState("LKR");
  const [addRenewalCost, setAddRenewalCost] = useState("");
  const [addRenewalPrice, setAddRenewalPrice] = useState("");
  const [addBillingCycle, setAddBillingCycle] = useState("yearly");
  const [addPurchaseDate, setAddPurchaseDate] = useState("");
  const [addExpiryDate, setAddExpiryDate] = useState("");
  const [addInvoiceId, setAddInvoiceId] = useState("");
  const [addProviderInvoiceUrl, setAddProviderInvoiceUrl] = useState<string | null>(null);
  const [uploadingAddInvoice, setUploadingAddInvoice] = useState(false);

  // activation_lkr_rate states
  const [addActivationLkrRate, setAddActivationLkrRate] = useState<number | null>(null);
  const [editActivationLkrRate, setEditActivationLkrRate] = useState<string>("");

  // Free / Vercel hosting states
  const [addIsFree, setAddIsFree] = useState(false);
  const [addVercelEmail, setAddVercelEmail] = useState("");
  const [editIsFree, setEditIsFree] = useState(false);
  const [editVercelEmail, setEditVercelEmail] = useState("");

  // Edit form states
  const [editEmail, setEditEmail] = useState("");
  const [editDomain, setEditDomain] = useState("");
  const [editProvider, setEditProvider] = useState("");
  const [editActualPrice, setEditActualPrice] = useState("");
  const [editActualCurrency, setEditActualCurrency] = useState("USD");
  const [editSellingPrice, setEditSellingPrice] = useState("");
  const [editSellingCurrency, setEditSellingCurrency] = useState("LKR");
  const [editRenewalCost, setEditRenewalCost] = useState("");
  const [editRenewalPrice, setEditRenewalPrice] = useState("");
  const [editBillingCycle, setEditBillingCycle] = useState("yearly");
  const [editPurchaseDate, setEditPurchaseDate] = useState("");
  const [editExpiryDate, setEditExpiryDate] = useState("");
  const [editStatus, setEditStatus] = useState("active");
  const [editInvoiceId, setEditInvoiceId] = useState("");
  const [editProviderInvoiceUrl, setEditProviderInvoiceUrl] = useState<string | null>(null);
  const [uploadingEditInvoice, setUploadingEditInvoice] = useState(false);

  const [saving, setSaving] = useState(false);
  const [lkrRate, setLkrRate] = useState(300.0);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Fetch LKR rate and orders in parallel
      const [rateRes, data] = await Promise.all([
        fetch("https://open.er-api.com/v6/latest/USD").then(r => r.json()).catch(() => null),
        getHostingOrders(),
      ]);
      if (rateRes?.rates?.LKR) setLkrRate(rateRes.rates.LKR);
      setOrders(data);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [rateRes, data] = await Promise.all([
          fetch("https://open.er-api.com/v6/latest/USD").then(r => r.json()).catch(() => null),
          getHostingOrders(),
        ]);
        if (!cancelled) {
          if (rateRes?.rates?.LKR) setLkrRate(rateRes.rates.LKR);
          setOrders(data);
        }
      } catch (_) {}
      if (!cancelled) setLoading(false);
    }
    load();

    const handleOpenAdd = () => handleOpenAddModal();
    window.addEventListener("hosting:open-add", handleOpenAdd);
    return () => {
      cancelled = true;
      window.removeEventListener("hosting:open-add", handleOpenAdd);
    };
  }, []);

  const handleOpenAddModal = () => {
    setAddEmail("");
    setAddDomain("");
    setAddProvider("Other");
    setAddActualPrice("");
    setAddActualCurrency("USD");
    setAddSellingPrice("");
    setAddSellingCurrency("LKR");
    setAddRenewalCost("");
    setAddRenewalPrice("");
    setAddBillingCycle("yearly");
    setAddPurchaseDate("");
    setAddExpiryDate("");
    setAddInvoiceId("");
    setAddProviderInvoiceUrl(null);
    setAddIsFree(false);
    setAddVercelEmail("");
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (order: HostingOrder) => {
    setSelectedOrder(order);
    setEditEmail(order.client_email);
    setEditDomain(order.domain_name);
    setEditProvider(order.hosting_provider);
    setEditActualPrice(String(order.actual_price));
    setEditActualCurrency(order.actual_price_currency || "USD");
    setEditSellingPrice(String(order.selling_price));
    setEditSellingCurrency(order.selling_price_currency || "LKR");
    setEditRenewalCost(String(order.renewal_cost || ""));
    setEditRenewalPrice(String(order.renewal_price || ""));
    setEditBillingCycle(order.billing_cycle || "yearly");
    setEditPurchaseDate(order.purchase_date ? order.purchase_date.split("T")[0] : "");
    setEditExpiryDate(order.expiry_date ? order.expiry_date.split("T")[0] : "");
    setEditStatus(order.status);
    setEditInvoiceId(order.invoice_id || "");
    setEditProviderInvoiceUrl(order.provider_invoice_url || null);
    setEditActivationLkrRate(order.activation_lkr_rate != null ? String(order.activation_lkr_rate) : String(lkrRate));
    const isFreeOrder = !!order.is_free || String(order.hosting_provider).toLowerCase().includes('vercel') || order.billing_cycle === 'free';
    setEditIsFree(isFreeOrder);
    setEditVercelEmail(order.vercel_email || "");
    setIsEditModalOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const actPrice = addIsFree ? 0 : (parseFloat(addActualPrice) || 0);
    const sellPrice = addIsFree ? 0 : (parseFloat(addSellingPrice) || 0);
    const profit = sellPrice - actPrice;

    const res = await addHostingOrder({
      client_email: addEmail,
      domain_name: addDomain,
      hosting_provider: addIsFree && (!addProvider || addProvider === "Other") ? "Vercel" : addProvider,
      actual_price: actPrice,
      actual_price_currency: addActualCurrency,
      selling_price: sellPrice,
      selling_price_currency: addSellingCurrency,
      profit: profit,
      billing_cycle: addIsFree ? "free" : addBillingCycle,
      purchase_date: addPurchaseDate,
      expiry_date: addIsFree ? "" : addExpiryDate,
      status: "active",
      invoice_id: addInvoiceId || null,
      provider_invoice_url: addProviderInvoiceUrl,
      renewal_cost: addIsFree ? 0 : (parseFloat(addRenewalCost) || 0),
      renewal_price: addIsFree ? 0 : (parseFloat(addRenewalPrice) || 0),
      activation_lkr_rate: addActualCurrency === "USD" ? lkrRate : null,
      is_free: addIsFree,
      vercel_email: addIsFree ? addVercelEmail : null,
    });

    if (res.success) {
      alert("Hosting order added successfully!");
      setIsAddModalOpen(false);
      fetchOrders();
    } else {
      alert("Failed to add order: " + res.error);
    }
    setSaving(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setSaving(true);
    const actPrice = editIsFree ? 0 : (parseFloat(editActualPrice) || 0);
    const sellPrice = editIsFree ? 0 : (parseFloat(editSellingPrice) || 0);
    const profit = sellPrice - actPrice;

    const res = await updateHostingOrder(selectedOrder.id, {
      client_email: editEmail,
      domain_name: editDomain,
      hosting_provider: editIsFree && (!editProvider || editProvider === "Other") ? "Vercel" : editProvider,
      actual_price: actPrice,
      actual_price_currency: editActualCurrency,
      selling_price: sellPrice,
      selling_price_currency: editSellingCurrency,
      profit: profit,
      billing_cycle: editIsFree ? "free" : editBillingCycle,
      purchase_date: editPurchaseDate,
      expiry_date: editIsFree ? "" : editExpiryDate,
      status: editStatus,
      invoice_id: editInvoiceId || null,
      provider_invoice_url: editProviderInvoiceUrl,
      renewal_cost: editIsFree ? 0 : (parseFloat(editRenewalCost) || 0),
      renewal_price: editIsFree ? 0 : (parseFloat(editRenewalPrice) || 0),
      activation_lkr_rate: editActualCurrency === "USD" ? (parseFloat(editActivationLkrRate) || lkrRate) : null,
      is_free: editIsFree,
      vercel_email: editIsFree ? editVercelEmail : null,
    });

    if (res.success) {
      alert("Hosting order updated successfully!");
      setIsEditModalOpen(false);
      fetchOrders();
    } else {
      alert("Failed to update order: " + res.error);
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this hosting order?")) return;
    const res = await deleteHostingOrder(id);
    if (res.success) {
      alert("Deleted successfully!");
      fetchOrders();
    } else {
      alert("Failed to delete: " + res.error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "text-green-400 bg-green-400/10 border border-green-400/20";
      case "suspended":
        return "text-red-400 bg-red-400/10 border border-red-400/20";
      default:
        return "text-gray-400 bg-gray-400/10 border border-gray-400/20";
    }
  };

  // Metrics
  const activeCount = orders.filter((o) => o.status.toLowerCase() === "active").length;
  const suspendedCount = orders.filter((o) => o.status.toLowerCase() === "suspended").length;

  const totalProfitLkr = orders.reduce((acc, o) => {
    if (o.status.toLowerCase() !== "active") return acc;
    // Calculate setup profit
    const setupCostLkr = o.actual_price_currency === "USD" ? o.actual_price * lkrRate : o.actual_price;
    const setupPriceLkr = o.selling_price_currency === "USD" ? o.selling_price * lkrRate : o.selling_price;
    const setupProfit = setupPriceLkr - setupCostLkr;

    // Calculate renewal profit
    const renCostLkr = o.actual_price_currency === "USD" ? (o.renewal_cost || 0) * lkrRate : (o.renewal_cost || 0);
    const renPriceLkr = o.selling_price_currency === "USD" ? (o.renewal_price || 0) * lkrRate : (o.renewal_price || 0);
    const renewalProfit = renPriceLkr - renCostLkr;

    return acc + setupProfit + renewalProfit;
  }, 0);

  const totalCostLkr = orders.reduce((acc, o) => {
    if (o.status.toLowerCase() !== "active") return acc;
    const setupCostLkr = o.actual_price_currency === "USD" ? o.actual_price * lkrRate : o.actual_price;
    return acc + setupCostLkr;
  }, 0);

  const filteredOrders = orders.filter((o) => {
    const statusMatch = activeFilter === "All" || o.status.toLowerCase() === activeFilter.toLowerCase();
    const searchMatch =
      o.domain_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.client_email.toLowerCase().includes(searchQuery.toLowerCase());
    return statusMatch && searchMatch;
  });

  if (loading) {
    return (
      <div className="space-y-6 pb-10 mt-2">
        {/* Skeleton Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3].map((idx) => (
            <div key={idx} className="bg-white/5 border border-white/10 rounded-3xl p-6 flex items-center justify-between h-[104px]">
              <div className="space-y-2.5">
                <div className="h-3 w-24 bg-white/10 rounded-full" />
                <div className="h-7 w-12 bg-white/10 rounded-full" />
              </div>
              <div className="p-3 bg-white/5 rounded-2xl w-12 h-12" />
            </div>
          ))}
        </div>
        {/* Skeleton Table */}
        <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden animate-pulse h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 mt-2">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-gray-400 font-medium block">Active Hosting</span>
            <span className="text-3xl font-bold text-white">{activeCount}</span>
          </div>
          <div className="p-3 bg-green-400/10 rounded-2xl text-green-400">
            <Server className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-gray-400 font-medium block">Suspended Hosting</span>
            <span className="text-3xl font-bold text-white">{suspendedCount}</span>
          </div>
          <div className="p-3 bg-red-400/10 rounded-2xl text-red-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-gray-400 font-medium block">Est. Profit (LKR)</span>
            <span className="text-2xl font-bold text-brand-400">{formatLKR(totalProfitLkr)}</span>
          </div>
          <div className="p-3 bg-brand-400/10 rounded-2xl text-brand-400">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search domain or client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-full pl-11 pr-4 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-brand-500 transition-colors"
            />
          </div>
          <div className="flex bg-white/5 border border-white/10 rounded-full p-1 self-start sm:self-auto">
            {["All", "Active", "Suspended"].map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  activeFilter === filter
                    ? "bg-white text-black shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 bg-white/[0.02] text-xs font-semibold uppercase tracking-wider">
                <th className="p-4 font-medium">Domain & Client</th>
                <th className="p-4 font-medium">Provider</th>
                <th className="p-4 font-medium text-right">Setup Cost / Retail</th>
                <th className="p-4 font-medium text-right">Selling Price / Retail</th>
                <th className="p-4 font-medium text-right text-brand-400">Profit</th>
                <th className="p-4 font-medium">Cycle</th>
                <th className="p-4 font-medium">Expiry Date</th>
                <th className="p-4 font-medium text-center">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((o) => {
                const isUsd = o.actual_price_currency === "USD";
                const lockedRate = o.activation_lkr_rate ?? null;
                const effectiveRate = lockedRate != null ? lockedRate : lkrRate;

                const isFreeOrder = !!o.is_free || String(o.hosting_provider).toLowerCase().includes('vercel') || o.billing_cycle === 'free';

                // Setup cost in LKR (using locked rate if USD and locked)
                const setupCostLkr = isUsd ? o.actual_price * effectiveRate : o.actual_price;
                // Setup price in LKR (selling is always LKR for now)
                const setupPriceLkr = o.selling_price_currency === "USD" ? o.selling_price * effectiveRate : o.selling_price;
                const profitSetup = setupPriceLkr - setupCostLkr;

                // Renewal cost/price in LKR
                const renCostLkr = isUsd ? (o.renewal_cost || 0) * effectiveRate : (o.renewal_cost || 0);
                const renPriceLkr = o.selling_price_currency === "USD" ? (o.renewal_price || 0) * effectiveRate : (o.renewal_price || 0);
                const profitRen = renPriceLkr - renCostLkr;

                return (
                  <tr key={o.id} className="hover:bg-white/5 transition-colors border-t border-white/5">
                    <td className="p-4">
                      <div className="font-semibold text-white flex items-center gap-1.5 flex-wrap">
                        <Globe className="w-4 h-4 text-brand-400" />
                        {o.domain_name}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-gray-500" />
                        {o.client_email}
                      </div>
                      {o.vercel_email && (
                        <div className="text-[11px] text-brand-300 bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 rounded-lg mt-1 inline-flex items-center gap-1">
                          <Mail className="w-3 h-3 text-brand-400" />
                          <span>Vercel: {o.vercel_email}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-gray-300 font-medium">
                      {o.hosting_provider}
                      {isFreeOrder && (
                        <span className="ml-1.5 px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          FREE
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right space-y-1">
                      {isFreeOrder ? (
                        <div className="text-sm text-gray-400 font-medium">Free ($0.00)</div>
                      ) : isUsd ? (
                        <PricePair usd={o.actual_price} lockedRate={lockedRate} liveRate={lkrRate} />
                      ) : (
                        <div className="text-sm text-white font-medium">{formatLKR(o.actual_price)}</div>
                      )}
                      {!isFreeOrder && (
                        <div className="text-xs text-gray-500 font-normal">
                          Ren: {isUsd ? (
                            <PricePair usd={o.renewal_cost || 0} lockedRate={lockedRate} liveRate={lkrRate} dimmed />
                          ) : formatLKR(o.renewal_cost || 0)}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-right text-white space-y-1">
                      {isFreeOrder ? (
                        <div className="text-sm text-gray-400 font-medium">Free</div>
                      ) : (
                        <>
                          <div className="text-sm font-medium">{formatLKR(o.selling_price)}</div>
                          <div className="text-xs text-gray-500 font-normal">Ren: {formatLKR(o.renewal_price || 0)}</div>
                        </>
                      )}
                    </td>
                    <td className="p-4 text-right font-semibold text-brand-400 space-y-1">
                      {isFreeOrder ? (
                        <div className="text-xs text-gray-500 font-normal">—</div>
                      ) : (
                        <>
                          <div>
                            {formatLKR(profitSetup)}
                          </div>
                          <div className="text-xs text-gray-500 font-normal">Ren: {formatLKR(profitRen)}</div>
                        </>
                      )}
                    </td>
                    <td className="p-4 text-gray-400 capitalize">{isFreeOrder ? 'Free' : o.billing_cycle}</td>
                    <td className="p-4 text-gray-300">
                      {isFreeOrder && !o.expiry_date ? (
                        <span className="inline-flex px-2.5 py-0.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
                          Lifetime / Free
                        </span>
                      ) : o.expiry_date ? (
                        new Date(o.expiry_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full border ${getStatusColor(o.status)}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {o.provider_invoice_url && (
                          <button
                            onClick={() => setViewingInvoice({ order: o, type: 'hosting' })}
                            title="View Provider Invoice"
                            className="p-2 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-colors flex items-center justify-center cursor-pointer"
                          >
                            <FileText className="w-4 h-4 text-brand-400" />
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEditModal(o)}
                          className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(o.id)}
                          className="p-2 hover:bg-red-500/10 rounded-xl text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-black border border-white/10 rounded-3xl w-full max-w-xl p-6 relative shadow-2xl overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold mb-4 text-white">Add Hosting Order</h3>
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
                  <input
                    type="text"
                    required
                    value={addDomain}
                    onChange={(e) => setAddDomain(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white"
                  />
                </div>
              </div>

              {/* Free Hosting Toggle */}
              <div className="flex items-center justify-between p-3.5 bg-white/5 border border-white/10 rounded-2xl">
                <div>
                  <p className="text-xs font-semibold text-white">Free Hosting (e.g. Vercel, Netlify)</p>
                  <p className="text-[11px] text-gray-400">No expiration date, no cost or selling price</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !addIsFree;
                    setAddIsFree(nextVal);
                    if (nextVal && (!addProvider || addProvider === "Other")) {
                      setAddProvider("Vercel");
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    addIsFree ? "bg-brand-500" : "bg-white/10"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      addIsFree ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {addIsFree && (
                <div className="space-y-1 p-3.5 bg-brand-500/10 border border-brand-500/20 rounded-2xl">
                  <label className="text-xs font-semibold text-brand-300 block">Vercel / Platform Account Email</label>
                  <input
                    type="email"
                    placeholder="account@vercel.com"
                    value={addVercelEmail}
                    onChange={(e) => setAddVercelEmail(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white"
                  />
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Hosting Provider</label>
                  <input
                    type="text"
                    required
                    value={addProvider}
                    onChange={(e) => setAddProvider(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white"
                  />
                </div>
                {!addIsFree && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400 block">Billing Cycle</label>
                    <select
                      value={addBillingCycle}
                      onChange={(e) => setAddBillingCycle(e.target.value)}
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                )}
              </div>

              {!addIsFree && (
                <>
                  {/* Rate Info — shown when cost currency is USD */}
                  {addActualCurrency === "USD" && (
                    <div className="text-xs text-brand-300/70 bg-brand-500/5 border border-brand-500/10 rounded-xl px-3 py-2">
                      Live rate: <span className="font-bold text-brand-300">1 USD = {lkrRate.toFixed(2)} LKR</span>
                      <span className="text-gray-500 ml-2">— this rate will be locked when you save.</span>
                    </div>
                  )}

                  {/* Pricing Grid */}
                  <div className="grid sm:grid-cols-4 gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-400 block">Cost Currency</label>
                      <select
                        value={addActualCurrency}
                        onChange={(e) => setAddActualCurrency(e.target.value)}
                        className="w-full bg-neutral-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="LKR">LKR (Rs.)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-400 block">Setup Cost</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={addActualPrice}
                        onChange={(e) => setAddActualPrice(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-400 block">Selling Currency</label>
                      <select
                        value={addSellingCurrency}
                        onChange={(e) => setAddSellingCurrency(e.target.value)}
                        className="w-full bg-neutral-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="LKR">LKR (Rs.)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-400 block">Setup Price</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={addSellingPrice}
                        onChange={(e) => setAddSellingPrice(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white"
                      />
                    </div>
                  </div>

                  {/* Renewal Pricing Grid */}
                  <div className="grid sm:grid-cols-2 gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-400 block">Renewal Cost ({addActualCurrency === "USD" ? "$" : "Rs."})</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={addRenewalCost}
                        onChange={(e) => setAddRenewalCost(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-400 block">Renewal Price ({addSellingCurrency === "USD" ? "$" : "Rs."})</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={addRenewalPrice}
                        onChange={(e) => setAddRenewalPrice(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Purchase Date</label>
                  <input
                    type="date"
                    value={addPurchaseDate}
                    onChange={(e) => setAddPurchaseDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white"
                  />
                </div>
                {!addIsFree && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400 block">Expiry Date</label>
                    <input
                      type="date"
                      required
                      value={addExpiryDate}
                      onChange={(e) => setAddExpiryDate(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white"
                    />
                  </div>
                )}
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
                    id="provider-invoice-add-upload"
                  />
                  <label
                    htmlFor="provider-invoice-add-upload"
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
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-2xl font-semibold transition-colors text-sm text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || uploadingAddInvoice}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-semibold transition-colors text-sm disabled:opacity-50"
                >
                  {saving ? "Saving..." : uploadingAddInvoice ? "Uploading..." : "Add Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-black border border-white/10 rounded-3xl w-full max-w-xl p-6 relative shadow-2xl overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold mb-4 text-white">Edit Hosting Order</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Client Email</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Domain Name</label>
                  <input
                    type="text"
                    required
                    value={editDomain}
                    onChange={(e) => setEditDomain(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white"
                  />
                </div>
              </div>

              {/* Free Hosting Toggle */}
              <div className="flex items-center justify-between p-3.5 bg-white/5 border border-white/10 rounded-2xl">
                <div>
                  <p className="text-xs font-semibold text-white">Free Hosting (e.g. Vercel, Netlify)</p>
                  <p className="text-[11px] text-gray-400">No expiration date, no cost or selling price</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !editIsFree;
                    setEditIsFree(nextVal);
                    if (nextVal && (!editProvider || editProvider === "Other")) {
                      setEditProvider("Vercel");
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    editIsFree ? "bg-brand-500" : "bg-white/10"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      editIsFree ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {editIsFree && (
                <div className="space-y-1 p-3.5 bg-brand-500/10 border border-brand-500/20 rounded-2xl">
                  <label className="text-xs font-semibold text-brand-300 block">Vercel / Platform Account Email</label>
                  <input
                    type="email"
                    placeholder="account@vercel.com"
                    value={editVercelEmail}
                    onChange={(e) => setEditVercelEmail(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white"
                  />
                </div>
              )}

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Provider</label>
                  <input
                    type="text"
                    required
                    value={editProvider}
                    onChange={(e) => setEditProvider(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white"
                  />
                </div>
                {!editIsFree && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400 block">Billing Cycle</label>
                    <select
                      value={editBillingCycle}
                      onChange={(e) => setEditBillingCycle(e.target.value)}
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              {/* Exchange Rate Input — shown when cost currency is USD */}
              {editActualCurrency === "USD" && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
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

              {/* Pricing Grid */}
              <div className="grid sm:grid-cols-4 gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Cost Currency</label>
                  <select
                    value={editActualCurrency}
                    onChange={(e) => setEditActualCurrency(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="LKR">LKR (Rs.)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Setup Cost</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editActualPrice}
                    onChange={(e) => setEditActualPrice(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Selling Currency</label>
                  <select
                    value={editSellingCurrency}
                    onChange={(e) => setEditSellingCurrency(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="LKR">LKR (Rs.)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Setup Price</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editSellingPrice}
                    onChange={(e) => setEditSellingPrice(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white"
                  />
                </div>
              </div>

              {/* Renewal Pricing Grid */}
              <div className="grid sm:grid-cols-2 gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Renewal Cost ({editActualCurrency === "USD" ? "$" : "Rs."})</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editRenewalCost}
                    onChange={(e) => setEditRenewalCost(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Renewal Price ({editSellingCurrency === "USD" ? "$" : "Rs."})</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editRenewalPrice}
                    onChange={(e) => setEditRenewalPrice(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Purchase Date</label>
                  <input
                    type="date"
                    required
                    value={editPurchaseDate}
                    onChange={(e) => setEditPurchaseDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={editExpiryDate}
                    onChange={(e) => setEditExpiryDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white"
                  />
                </div>
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
                      setUploadingEditInvoice(true);
                      try {
                        const convertedFile = await convertPdfToImage(file);
                        const formData = new FormData();
                        formData.append("file", convertedFile);
                        const url = await uploadProviderInvoice(formData);
                        setEditProviderInvoiceUrl(url);
                      } catch (err: any) {
                        alert("Failed to upload: " + err.message);
                      } finally {
                        setUploadingEditInvoice(false);
                      }
                    }}
                    className="hidden"
                    id="provider-invoice-edit-upload"
                  />
                  <label
                    htmlFor="provider-invoice-edit-upload"
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold cursor-pointer transition-colors text-white"
                  >
                    {uploadingEditInvoice ? "Uploading..." : editProviderInvoiceUrl ? "Change Invoice" : "Upload Invoice"}
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

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-2xl font-semibold transition-colors text-sm text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || uploadingEditInvoice}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-semibold transition-colors text-sm disabled:opacity-50"
                >
                  {saving ? "Saving..." : uploadingEditInvoice ? "Uploading..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Viewer Modal */}
      {viewingInvoice && <HostingInvoiceModal
        order={viewingInvoice.order}
        lkrRate={lkrRate}
        onClose={() => setViewingInvoice(null)}
        onRenewalInvoiceAdded={(url, note) => {
          addHostingRenewalInvoiceUrl(viewingInvoice.order.id, url, note).then(() => {
            // Refresh orders
            getHostingOrders().then(data => setOrders(data));
            setViewingInvoice(null);
          });
        }}
      />}
    </div>
  );
}

function HostingInvoiceModal({
  order,
  lkrRate,
  onClose,
  onRenewalInvoiceAdded,
}: {
  order: HostingOrder;
  lkrRate: number;
  onClose: () => void;
  onRenewalInvoiceAdded: (url: string, note: string) => void;
}) {
  const [tab, setTab] = useState<'purchase' | 'renewals'>('purchase');
  const [renewalIdx, setRenewalIdx] = useState(0);
  const [uploadingRenewal, setUploadingRenewal] = useState(false);
  const [renewalNote, setRenewalNote] = useState('');
  const renewalFileRef = useRef<HTMLInputElement>(null);
  const renewalInvoices = order.renewal_invoices || [];

  const isUsd = order.actual_price_currency === 'USD';
  const lockedRate = order.activation_lkr_rate ?? null;
  const effectiveRate = lockedRate != null ? lockedRate : lkrRate;

  const setupCostLkr  = isUsd ? order.actual_price * effectiveRate : order.actual_price;
  const setupPriceLkr = order.selling_price_currency === 'USD' ? order.selling_price * effectiveRate : order.selling_price;
  const profitSetup   = setupPriceLkr - setupCostLkr;
  const renCostLkr    = isUsd ? (order.renewal_cost || 0) * effectiveRate : (order.renewal_cost || 0);
  const renPriceLkr   = order.selling_price_currency === 'USD' ? (order.renewal_price || 0) * effectiveRate : (order.renewal_price || 0);
  const profitRen     = renPriceLkr - renCostLkr;

  const formatLKR = (v: number) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(v || 0);
  const formatUSD = (v: number) => `$${v.toFixed(2)}`;

  async function handleRenewalUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingRenewal(true);
    try {
      // PDF → image conversion
      let uploadFile = file;
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        // PDF.js loaded via script tag below
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
      const url = await uploadRenewalInvoiceForHosting(fd);
      onRenewalInvoiceAdded(url, renewalNote);
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
            <h3 className="text-xl font-bold text-white">Hosting Provider Invoice</h3>
            <p className="text-sm text-gray-400">Transaction Information</p>
          </div>

          <div className="space-y-5">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Domain / Site</p>
              <p className="text-sm font-semibold text-white">{order.domain_name}</p>
            </div>

            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Purchase Cost</p>
              <p className="text-3xl font-bold text-green-400">
                {isUsd ? formatUSD(order.actual_price) : formatLKR(order.actual_price)}
              </p>
              {isUsd && lockedRate != null && (
                <p className="text-xs text-amber-300/70 mt-0.5">{formatLKR(setupCostLkr)} <span className="text-[10px]">@{Math.round(effectiveRate)} </span></p>
              )}
            </div>

            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Date</p>
              <p className="text-sm font-medium text-white">
                {order.purchase_date
                  ? new Date(order.purchase_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                  : order.created_at
                  ? new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                  : 'N/A'}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Client</p>
              <p className="text-sm font-medium text-white">{order.client_email}</p>
            </div>

            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Hosting Provider</p>
              <p className="text-sm font-medium text-white">{order.hosting_provider}</p>
            </div>

            <hr className="border-white/10" />

            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Financials</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Actual Price</span>
                  <span className="text-white font-medium">
                    {isUsd ? formatUSD(order.actual_price) : formatLKR(order.actual_price)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Selling Price</span>
                  <span className="text-white font-medium">
                    {order.selling_price_currency === 'USD' ? formatUSD(order.selling_price) : formatLKR(order.selling_price)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-2">
                  <span className="text-gray-400">Profit</span>
                  <span className={`font-bold ${profitSetup >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatLKR(profitSetup)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel — invoice images */}
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
              {renewalInvoices.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
                  <RefreshCw className="w-10 h-10 text-gray-700" />
                  <p className="text-gray-500 text-sm text-center">No renewal invoices yet.<br/>Upload one below.</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                  {/* Invoice image */}
                  <div className="flex-1 flex items-center justify-center p-6 bg-black/50 overflow-auto relative">
                    <img
                      src={renewalInvoices[renewalIdx]?.url}
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
                        <img src={inv.url} alt={`Thumbnail ${i+1}`} className="w-14 h-14 object-cover" />
                      </button>
                    ))}
                    <div className="ml-auto text-xs text-gray-500 shrink-0">
                      {renewalIdx + 1} / {renewalInvoices.length}
                      {renewalInvoices[renewalIdx]?.date && (
                        <div>{new Date(renewalInvoices[renewalIdx].date).toLocaleDateString()}</div>
                      )}
                      {renewalInvoices[renewalIdx]?.note && (
                        <div className="text-gray-400">{renewalInvoices[renewalIdx].note}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {/* Upload new renewal invoice */}
              <div className="p-4 border-t border-white/10 bg-black/20">
                <p className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wider">Add Renewal Invoice</p>
                <input
                  type="text"
                  placeholder="Optional note (e.g. Year 2026)"
                  value={renewalNote}
                  onChange={e => setRenewalNote(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-brand-500 transition-colors mb-2"
                />
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
