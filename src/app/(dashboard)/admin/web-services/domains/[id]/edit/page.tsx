"use client";

import React, { useState, useEffect, use } from "react";
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
  FileText,
} from "lucide-react";
import {
  getDomainOrderById,
  updateDomainOrder,
  getInvoicesForLinking,
  uploadProviderInvoice,
  DomainOrder,
} from "@/app/(dashboard)/admin/actions/domains";
import ClientCombobox from "@/app/(dashboard)/admin/components/ClientCombobox";
import { getClients, createClient } from "@/app/(dashboard)/admin/actions/actions";

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

export default function EditDomainOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const orderId = Number(resolvedParams.id);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [initialOrder, setInitialOrder] = useState<DomainOrder | null>(null);
  const [lkrRate, setLkrRate] = useState<number>(310);

  // Form states
  const [email, setEmail] = useState("");
  const [domainName, setDomainName] = useState("");
  const [registrar, setRegistrar] = useState("Cloudflare");
  const [status, setStatus] = useState("active");
  const [expiry, setExpiry] = useState("");

  // Client Selection
  const [clients, setClients] = useState<any[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientId, setClientId] = useState("");
  const [manualEmail, setManualEmail] = useState(false);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientData, setNewClientData] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
  });
  const [creatingClient, setCreatingClient] = useState(false);

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

  // Expiry Billing Options
  const [createRenewalInvoiceOnExpire, setCreateRenewalInvoiceOnExpire] = useState(true);
  const [expireCurrency, setExpireCurrency] = useState<"USD" | "LKR">("USD");

  // Invoice linking
  const [invoiceId, setInvoiceId] = useState("");
  const [modalInvoices, setModalInvoices] = useState<any[]>([]);

  // Provider Invoice
  const [providerInvoiceUrl, setProviderInvoiceUrl] = useState<string | null>(null);
  const [uploadingInvoice, setUploadingInvoice] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // Load order data and exchange rate
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const rateRes = await fetch("/api/services/domains/rate").catch(() => null);
        const rateData = rateRes && rateRes.ok ? await rateRes.json().catch(() => null) : null;
        const currentRate = rateData?.rate || 310;
        if (isMounted) setLkrRate(currentRate);

        const order = await getDomainOrderById(orderId);
        if (!order) {
          if (isMounted) setLoading(false);
          return;
        }

        if (isMounted) {
          setInitialOrder(order);
          const isLkr = order.actual_price_currency === "LKR";
          const orderRate = order.activation_lkr_rate || currentRate;

          setEmail(order.client_email);
          setDomainName(order.domain_name);
          setRegistrar(order.registrar || "Cloudflare");
          setStatus(order.status || "active");
          setExpiry(order.expiry_date ? order.expiry_date.split("T")[0] : "");

          setActualPriceCurrency(order.actual_price_currency || "USD");
          setRegCost(String(order.actual_price || ""));
          setRegBankLkr(
            order.activation_lkr_cost != null
              ? String(order.activation_lkr_cost)
              : isLkr
              ? String(order.actual_price || "")
              : String(((order.actual_price || 0) * orderRate).toFixed(2))
          );
          setRegRate(String(orderRate.toFixed(2)));
          setRegPrice(String(order.selling_price || ""));
          setRegPriceLkr(
            order.activation_lkr_price != null
              ? String(order.activation_lkr_price)
              : String(((order.selling_price || 0) * orderRate).toFixed(2))
          );

          const isRenLkr = order.renewal_cost_currency === "LKR";
          const renRateVal = order.renewal_lkr_rate || orderRate;
          setRenewCost(String(order.renewal_cost || (isRenLkr ? 3500 : 14.25)));
          setRenewCostCurrency(order.renewal_cost_currency || (isLkr ? "LKR" : "USD"));
          setRenewBankLkr(
            order.renewal_lkr_cost != null
              ? String(order.renewal_lkr_cost)
              : isRenLkr
              ? String(order.renewal_cost || 3500)
              : String(((order.renewal_cost || 14.25) * renRateVal).toFixed(2))
          );
          setRenewRate(String(renRateVal.toFixed(2)));
          setRenewPrice(String(order.renewal_price || (isRenLkr ? 5000 : 19.99)));
          setRenewPriceLkr(
            order.renewal_lkr_price != null
              ? String(order.renewal_lkr_price)
              : String(((order.renewal_price || (isRenLkr ? 5000 : 19.99)) * renRateVal).toFixed(2))
          );

          setInvoiceId(order.invoice_id || "");
          setProviderInvoiceUrl(order.provider_invoice_url || null);

          // Fetch linking invoices
          getInvoicesForLinking(order.client_email)
            .then((invs) => {
              if (isMounted) setModalInvoices(invs);
            })
            .catch((err) => console.error(err));

          // Fetch clients
          setClientsLoading(true);
          getClients()
            .then((cls) => {
              if (isMounted) {
                setClients(cls || []);
                setClientsLoading(false);
                if (order.client_email) {
                  const match = cls?.find(
                    (c: any) => c.email && c.email.toLowerCase() === order.client_email.toLowerCase()
                  );
                  if (match) {
                    setClientId(String(match.id));
                  } else {
                    setManualEmail(true);
                  }
                }
              }
            })
            .catch((err) => {
              console.error(err);
              if (isMounted) setClientsLoading(false);
            });

          setLoading(false);
        }
      } catch (e) {
        console.error("Failed to load order:", e);
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  // Calculations
  const isLkr = actualPriceCurrency === "LKR";
  const costNum = parseFloat(regCost) || 0;
  const bankLkrNum = parseFloat(regBankLkr) || 0;
  const effRateNum =
    parseFloat(regRate) || (isLkr ? 1 : costNum > 0 && bankLkrNum > 0 ? bankLkrNum / costNum : lkrRate);
  const regPriceLkrNum =
    parseFloat(regPriceLkr) || (parseFloat(regPrice) ? parseFloat(regPrice) * effRateNum : 0);
  const regPriceUsdNum = parseFloat(regPrice) || (effRateNum > 0 ? regPriceLkrNum / effRateNum : 0);
  const costUsdNum = isLkr ? (effRateNum > 0 ? costNum / effRateNum : 0) : costNum;
  const profitUsd = regPriceUsdNum - costUsdNum;
  const profitLkr = regPriceLkrNum - (isLkr ? costNum : bankLkrNum || costNum * effRateNum);

  const isRenLkr = renewCostCurrency === "LKR";
  const renCostNum = parseFloat(renewCost) || 0;
  const renBankLkrNum = parseFloat(renewBankLkr) || 0;
  const renRateNum =
    parseFloat(renewRate) ||
    (isRenLkr ? 1 : renCostNum > 0 && renBankLkrNum > 0 ? renBankLkrNum / renCostNum : effRateNum);
  const renPriceLkrNum =
    parseFloat(renewPriceLkr) || (parseFloat(renewPrice) ? parseFloat(renewPrice) * renRateNum : 0);
  const renPriceUsdNum = parseFloat(renewPrice) || (renRateNum > 0 ? renPriceLkrNum / renRateNum : 0);
  const renCostUsdNum = isRenLkr ? (renRateNum > 0 ? renCostNum / renRateNum : 0) : renCostNum;
  const renProfitUsd = renPriceUsdNum - renCostUsdNum;
  const renProfitLkr = renPriceLkrNum - (isRenLkr ? renCostNum : renBankLkrNum || renCostNum * renRateNum);

  const handleClientChange = (e: any) => {
    const val = e.target.value;
    if (val === "new") {
      setClientId("new");
      setShowNewClientForm(true);
    } else {
      setClientId(val);
      setShowNewClientForm(false);
      const selected = clients.find((c) => String(c.id) === String(val));
      if (selected) {
        setEmail(selected.email || "");
      }
    }
  };

  const handleCreateNewClient = async () => {
    if (!newClientData.name || !newClientData.email) {
      alert("Please enter a name and email for the new client.");
      return;
    }
    setCreatingClient(true);
    try {
      const newId = await createClient({
        name: newClientData.name,
        email: newClientData.email,
        company: newClientData.company || null,
        phone: newClientData.phone || null,
      });
      const created = {
        id: newId,
        name: newClientData.name,
        email: newClientData.email,
        company: newClientData.company || "",
        phone: newClientData.phone || "",
      };
      setClients((prev) => [created, ...prev]);
      setClientId(newId);
      setEmail(newClientData.email);
      setShowNewClientForm(false);
      setNewClientData({ name: "", email: "", company: "", phone: "" });
    } catch (err: any) {
      alert("Failed to create client: " + err.message);
    } finally {
      setCreatingClient(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialOrder) return;
    if (!email) {
      alert("Please select or enter a client email");
      return;
    }
    setSubmitting(true);

    const isLkrCurr = actualPriceCurrency === "LKR";
    const rawCost = parseFloat(regCost) || 0;
    const bankDeductionLkr = parseFloat(regBankLkr) || (isLkrCurr ? rawCost : rawCost * lkrRate);

    const effRate = isLkrCurr
      ? lkrRate
      : rawCost > 0 && bankDeductionLkr > 0
      ? bankDeductionLkr / rawCost
      : parseFloat(regRate) || lkrRate;

    const regSellLkr = parseFloat(regPriceLkr) || (parseFloat(regPrice) ? parseFloat(regPrice) * effRate : 0);
    const regSellUsd = parseFloat(regPrice) || (effRate > 0 ? regSellLkr / effRate : 0);
    const regCostUsd = isLkrCurr ? (effRate > 0 ? rawCost / effRate : 0) : rawCost;
    const calcProfitUsd = regSellUsd - regCostUsd;

    const isRenewalLkr = renewCostCurrency === "LKR";
    const rawRenCost = parseFloat(renewCost) || 0;
    const renBankLkr = parseFloat(renewBankLkr) || (isRenewalLkr ? rawRenCost : rawRenCost * effRate);
    const finalRenRate = isRenewalLkr
      ? effRate
      : rawRenCost > 0 && renBankLkr > 0
      ? renBankLkr / rawRenCost
      : parseFloat(renewRate) || effRate;
    const renSellLkr = parseFloat(renewPriceLkr) || (parseFloat(renewPrice) ? parseFloat(renewPrice) * finalRenRate : 0);
    const renSellUsd = parseFloat(renewPrice) || (finalRenRate > 0 ? renSellLkr / finalRenRate : 0);

    const isBecomingExpired =
      status.toLowerCase() === "expired" &&
      initialOrder.status.toLowerCase() !== "expired";

    try {
      const res = await updateDomainOrder(
        initialOrder.id,
        {
          client_email: email,
          domain_name: domainName,
          actual_price: isLkrCurr ? rawCost : regCostUsd,
          actual_price_currency: actualPriceCurrency,
          selling_price: isLkrCurr ? (effRate > 0 ? regSellLkr / effRate : regSellLkr) : regSellUsd,
          profit: calcProfitUsd,
          renewal_cost: isRenewalLkr ? rawRenCost : parseFloat(renewCost) || 0,
          renewal_price: isRenewalLkr ? (finalRenRate > 0 ? renSellLkr / finalRenRate : renSellLkr) : renSellUsd,
          renewal_cost_currency: renewCostCurrency,
          renewal_lkr_cost: renBankLkr,
          renewal_lkr_price: renSellLkr,
          renewal_lkr_rate: finalRenRate,
          registrar,
          expiry_date: expiry,
          status,
          provider_invoice_url: providerInvoiceUrl,
          activation_lkr_rate: effRate,
          activation_lkr_price: regSellLkr,
          activation_lkr_cost: bankDeductionLkr,
          invoice_id: invoiceId.trim() || null,
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
            alert(`Domain marked as expired. Renewal invoice #${res.invoiceId} created automatically!`);
          }
        }
        router.push("/admin/web-services/domains");
      } else {
        alert("Failed to update domain order: " + ((res as any).error || "Unknown error"));
        setSubmitting(false);
      }
    } catch (err: any) {
      alert("Error updating order: " + err.message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
        <p className="text-sm text-gray-400">Loading domain order details...</p>
      </div>
    );
  }

  if (!initialOrder) {
    return (
      <div className="max-w-xl mx-auto text-center py-20 space-y-4">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Domain Order Not Found</h2>
        <p className="text-sm text-gray-400">The requested domain order #{orderId} could not be located.</p>
        <Link
          href="/admin/web-services/domains"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 rounded-2xl text-white font-medium text-sm transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Domains</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4 w-full max-w-[1600px] mx-auto min-h-[calc(100vh-140px)] flex flex-col justify-between">
      <form id="domain-order-edit-form" onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col justify-between">
        {/* Basic Domain Information Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-3.5 relative z-20">
          <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
            <h2 className="text-sm font-semibold text-white">
              Domain &amp; Client Details: {initialOrder.domain_name}
            </h2>
            <span className="text-xs font-mono text-brand-400">Order #{initialOrder.id}</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-300 block">Client</label>
                <button
                  type="button"
                  onClick={() => {
                    const nextManual = !manualEmail;
                    setManualEmail(nextManual);
                    if (!nextManual && clientId) {
                      const selected = clients.find((c) => String(c.id) === String(clientId));
                      if (selected) setEmail(selected.email || "");
                    }
                  }}
                  className="text-[11px] text-brand-400 hover:text-brand-300 transition-colors cursor-pointer"
                >
                  {manualEmail ? "Select from list" : "Enter email manually"}
                </button>
              </div>

              {manualEmail ? (
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-500 transition-colors text-white"
                />
              ) : (
                <ClientCombobox
                  name="clientId"
                  value={clientId}
                  onChange={handleClientChange}
                  clients={clients}
                  loading={clientsLoading}
                />
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300 block">Domain Name</label>
              <input
                type="text"
                required
                value={domainName}
                onChange={(e) => setDomainName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-500 transition-colors text-white font-mono"
              />
            </div>
          </div>

          {showNewClientForm && (
            <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-brand-400">New Client Details</span>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewClientForm(false);
                    setClientId("");
                  }}
                  className="text-xs text-gray-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  placeholder="Client Name *"
                  value={newClientData.name}
                  onChange={(e) => setNewClientData((prev) => ({ ...prev, name: e.target.value }))}
                  className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-brand-500"
                />
                <input
                  type="email"
                  placeholder="Client Email *"
                  value={newClientData.email}
                  onChange={(e) => setNewClientData((prev) => ({ ...prev, email: e.target.value }))}
                  className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-brand-500"
                />
                <input
                  type="text"
                  placeholder="Company (Optional)"
                  value={newClientData.company}
                  onChange={(e) => setNewClientData((prev) => ({ ...prev, company: e.target.value }))}
                  className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-brand-500"
                />
                <input
                  type="text"
                  placeholder="Phone (Optional)"
                  value={newClientData.phone}
                  onChange={(e) => setNewClientData((prev) => ({ ...prev, phone: e.target.value }))}
                  className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-brand-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCreateNewClient}
                  disabled={creatingClient}
                  className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {creatingClient && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>{creatingClient ? "Saving..." : "Save & Select Client"}</span>
                </button>
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300 block">Registrar</label>
              <input
                type="text"
                required
                value={registrar}
                onChange={(e) => setRegistrar(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-500 transition-colors text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300 block">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-500 transition-colors text-white cursor-pointer"
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300 block">Expiry Date</label>
              <input
                type="date"
                required
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-500 transition-colors text-white"
              />
            </div>
          </div>

          {/* Expiry billing option if marked expired */}
          {status.toLowerCase() === "expired" && initialOrder.status.toLowerCase() !== "expired" && (
            <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-3.5 space-y-2 text-xs">
              <div>
                <p className="text-xs font-semibold text-red-300">Expiry Billing</p>
                <p className="text-xs text-gray-400">
                  Choose whether to generate a renewal invoice so the client can pay again.
                </p>
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createRenewalInvoiceOnExpire}
                  onChange={(e) => setCreateRenewalInvoiceOnExpire(e.target.checked)}
                  className="mt-0.5 rounded border-white/20 bg-white/5"
                />
                <span className="text-xs text-gray-300">
                  Create renewal invoice at {expireCurrency === "LKR" ? formatLKR(renPriceLkrNum) : formatUSD(renPriceUsdNum)}
                </span>
              </label>

              {createRenewalInvoiceOnExpire && (
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-semibold text-gray-400 block">Renewal Invoice Currency</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setExpireCurrency("USD")}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
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
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        expireCurrency === "LKR"
                          ? "border-brand-500 bg-brand-500/10 text-white"
                          : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      LKR (Rs.)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Registration Pricing & Bank Cost */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <h2 className="text-sm font-semibold text-white">
                1. Registration Pricing &amp; Bank Cost
              </h2>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400 font-medium">Currency:</label>
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
                  className="bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-brand-500 cursor-pointer"
                >
                  <option value="USD">USD ($)</option>
                  <option value="LKR">LKR (Rs.)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300 block truncate">
                  Cost ({isLkr ? "Rs." : "$"})
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
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-brand-500 transition-colors font-mono text-white"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-300 block truncate">
                    Bank Deduction (LKR)
                  </label>
                  {!isLkr && costNum > 0 && bankLkrNum > 0 && (
                    <span className="text-[10px] text-gray-400 font-mono">
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
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-brand-500 transition-colors font-mono text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300 block truncate">
                  Exchange Rate
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
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-brand-500 transition-colors font-mono text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1.5 border-t border-white/5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-200 block truncate">
                  Selling Price (LKR)
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
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-brand-500 transition-colors font-mono text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 block truncate">
                  Equivalent USD ($)
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
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-brand-500 transition-colors font-mono text-gray-300"
                />
              </div>
            </div>

            {/* Live Profit Preview */}
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-xs">
              <span className="text-gray-300 font-medium">Estimated Registration Profit:</span>
              <span className="font-bold text-brand-400">
                +{formatUSD(profitUsd)} ({formatLKR(profitLkr)})
              </span>
            </div>
          </div>

          {/* Renewal Pricing */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <h2 className="text-sm font-semibold text-white">
                2. Renewal Pricing
              </h2>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400 font-medium">Currency:</label>
                <select
                  value={renewCostCurrency}
                  onChange={(e) => setRenewCostCurrency(e.target.value)}
                  className="bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-brand-500 cursor-pointer"
                >
                  <option value="USD">USD ($)</option>
                  <option value="LKR">LKR (Rs.)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300 block truncate">
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
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-brand-500 transition-colors font-mono text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300 block truncate">
                  Renewal Bank Deduction (LKR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={renewBankLkr}
                  onChange={(e) => setRenewBankLkr(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-brand-500 transition-colors font-mono text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1.5 border-t border-white/5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-200 block truncate">
                  Renewal Selling Price (LKR)
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
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-brand-500 transition-colors font-mono text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 block truncate">
                  Equivalent USD ($)
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
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-brand-500 transition-colors font-mono text-gray-300"
                />
              </div>
            </div>

            {/* Live Renewal Profit Preview */}
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-xs">
              <span className="text-gray-300 font-medium">Estimated Renewal Profit:</span>
              <span className="font-bold text-brand-400">
                +{formatUSD(renProfitUsd)} ({formatLKR(renProfitLkr)})
              </span>
            </div>
          </div>
        </div>

        {/* Invoicing & Provider Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Invoice Linking Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <h2 className="text-sm font-semibold text-white">
                3. Link Invoice (Order Billing)
              </h2>
              {invoiceId && (
                <button
                  type="button"
                  onClick={() => setInvoiceId("")}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  Unlink Invoice
                </button>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300 block">Select Invoice</label>
                <select
                  value={invoiceId}
                  onChange={(e) => setInvoiceId(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-brand-500 cursor-pointer"
                >
                  <option value="">-- No Linked Invoice --</option>
                  {modalInvoices.map((inv) => (
                    <option key={inv.invoice_id} value={inv.invoice_id}>
                      {inv.invoice_id} - {inv.user_email} ({formatLKR(inv.total)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300 block">Or Invoice ID</label>
                <input
                  type="text"
                  value={invoiceId}
                  onChange={(e) => setInvoiceId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-brand-500 font-mono text-white"
                />
              </div>
            </div>

            {invoiceId ? (
              <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-400">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>
                    Order is linked to: <strong className="font-mono text-white">{invoiceId}</strong>
                  </span>
                </div>
                <a
                  href={`/admin/invoices?search=${encodeURIComponent(invoiceId)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline flex items-center gap-1 text-brand-400 font-medium"
                >
                  View Invoice <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ) : (
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-xs text-gray-400">
                No invoice linked. You can link an existing client invoice or link one later.
              </div>
            )}
          </div>

          {/* Provider Invoice Upload */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
            <div className="border-b border-white/5 pb-2.5">
              <h2 className="text-sm font-semibold text-white">
                Provider Invoice (Admin Only - Optional)
              </h2>
            </div>

            <div className="flex-1 flex flex-col justify-center">
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
                id="provider-invoice-edit-upload"
              />
              <label
                htmlFor="provider-invoice-edit-upload"
                className="border-2 border-dashed border-white/10 hover:border-brand-500/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-white/[0.02] hover:bg-white/[0.04] group"
              >
                <div className="w-9 h-9 rounded-xl bg-brand-500/10 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <Upload className="w-4 h-4 text-brand-400" />
                </div>
                <p className="text-xs font-medium text-gray-200">
                  {uploadingInvoice ? "Uploading invoice..." : providerInvoiceUrl ? "Replace provider invoice" : "Click to upload registrar receipt or invoice"}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">Supports PDF, PNG, JPG</p>
              </label>

              {providerInvoiceUrl && (
                <div className="flex items-center justify-between mt-2.5 px-3 py-2 bg-brand-500/10 border border-brand-500/20 rounded-xl text-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-brand-400" />
                    <a
                      href={providerInvoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-300 hover:underline flex items-center gap-1 font-medium"
                    >
                      <span>View Current Invoice</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProviderInvoiceUrl(null)}
                    className="text-red-400 hover:text-red-300 cursor-pointer font-medium"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="flex items-center justify-end pt-1">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/web-services/domains"
              className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-colors text-xs text-gray-300 cursor-pointer"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || uploadingInvoice}
              className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-semibold transition-colors text-xs disabled:opacity-50 cursor-pointer flex items-center gap-2 shadow-lg shadow-brand-500/20"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{submitting ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
