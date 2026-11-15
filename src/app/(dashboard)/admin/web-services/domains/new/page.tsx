"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Upload,
  Unlink,
  ExternalLink,
  Check,
  AlertCircle,
  Loader2,
  FileText,
  Search,
  Sparkles,
  ArrowRight,
  CheckCircle,
  X,
  Sliders,
  ChevronLeft,
  User,
  CreditCard,
  Building,
  Phone,
  Mail,
  ShieldCheck,
  Globe,
} from "lucide-react";
import {
  addDomainOrder,
  getInvoicesForLinking,
  uploadProviderInvoice,
} from "@/app/(dashboard)/admin/actions/domains";
import ClientCombobox from "@/app/(dashboard)/admin/components/ClientCombobox";
import { getClients, createClient, createInvoice } from "@/app/(dashboard)/admin/actions/actions";
import DomainSearch, { DomainSelectionAdminData } from "@/components/services/DomainSearch";

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

  // Mode: "search" (Default client search experience) vs "manual" (Direct DB entry form)
  const [viewMode, setViewMode] = useState<"search" | "manual">("search");
  const [lkrRate, setLkrRate] = useState<number>(310);

  // Clients
  const [clients, setClients] = useState<any[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);

  // Modal State for Ordering Domain from Search
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [modalDomainData, setModalDomainData] = useState<DomainSelectionAdminData | null>(null);

  // Modal Client selection state
  const [modalClientId, setModalClientId] = useState("");
  const [modalIsNewClient, setModalIsNewClient] = useState(false);
  const [modalNewClient, setModalNewClient] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
  });

  // Modal Pricing & Invoicing State
  const [modalSellingPrice, setModalSellingPrice] = useState<string>("");
  const [modalCostPrice, setModalCostPrice] = useState<string>("");
  const [modalRenewalPrice, setModalRenewalPrice] = useState<string>("");
  const [modalCurrency, setModalCurrency] = useState<"LKR" | "USD">("LKR");
  const [modalAutoInvoice, setModalAutoInvoice] = useState(true);
  const [modalPaymentStatus, setModalPaymentStatus] = useState<"unpaid" | "paid">("unpaid");
  const [modalOrderStatus, setModalOrderStatus] = useState<string>("active");
  const [modalAutoRenew, setModalAutoRenew] = useState(true);
  const [modalNotes, setModalNotes] = useState("");
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Manual Form States (for legacy/custom manual database entry)
  const [email, setEmail] = useState("");
  const [domainName, setDomainName] = useState("");
  const [registrar, setRegistrar] = useState("Cloudflare");
  const [status, setStatus] = useState("active");
  const [expiry, setExpiry] = useState(() => {
    const exp = new Date();
    exp.setFullYear(exp.getFullYear() + 1);
    return exp.toISOString().split("T")[0];
  });
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

  // Manual Registration Pricing
  const [actualPriceCurrency, setActualPriceCurrency] = useState("USD");
  const [regCost, setRegCost] = useState("");
  const [regBankLkr, setRegBankLkr] = useState("");
  const [regRate, setRegRate] = useState("310.00");
  const [regPrice, setRegPrice] = useState("");
  const [regPriceLkr, setRegPriceLkr] = useState("");

  // Manual Renewal Pricing
  const [renewCostCurrency, setRenewCostCurrency] = useState("USD");
  const [renewCost, setRenewCost] = useState("");
  const [renewBankLkr, setRenewBankLkr] = useState("");
  const [renewRate, setRenewRate] = useState("310.00");
  const [renewPrice, setRenewPrice] = useState("");
  const [renewPriceLkr, setRenewPriceLkr] = useState("");

  // Manual Invoice linking & uploads
  const [invoiceId, setInvoiceId] = useState("");
  const [modalInvoices, setModalInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [providerInvoiceUrl, setProviderInvoiceUrl] = useState<string | null>(null);
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [autoCreateInvoice, setAutoCreateInvoice] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fetch initial data
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

    setClientsLoading(true);
    getClients()
      .then((cls) => setClients(cls || []))
      .catch((err) => console.error(err))
      .finally(() => setClientsLoading(false));
  }, []);

  // Handler when admin clicks "Register for Client" on any domain search result
  const handleSelectForAdmin = (data: DomainSelectionAdminData) => {
    setModalDomainData(data);

    // Populate modal pricing
    const isLk = data.domain.endsWith(".lk");
    if (isLk) {
      setModalCurrency("LKR");
      setModalSellingPrice(String(data.priceLkr || 10000));
      setModalCostPrice(String(data.costLkr || 8000));
      setModalRenewalPrice(String(data.renewPriceLkr || data.priceLkr || 10000));
    } else {
      // Global domain
      setModalCurrency("LKR");
      setModalSellingPrice(String(data.priceLkr || Math.ceil((data.priceUsd || 14.12) * lkrRate)));
      setModalCostPrice(String(data.costLkr || Math.ceil((data.priceUsd || 10.46) * lkrRate)));
      setModalRenewalPrice(String(data.renewPriceLkr || Math.ceil((data.renewPriceUsd || 14.12) * lkrRate)));
    }

    // Prepare informative notes
    let notes = "";
    if (data.packageType === "standard" && data.reservedNames && data.reservedNames.length > 0) {
      notes = `LK Domain Registry Standard Package. Auto-reserved sibling domains: ${data.reservedNames.join(", ")}. Order placed on client behalf via Frametoque admin.`;
    } else if (data.packageType === "economy") {
      notes = `LK Domain Registry Economy Package. Order placed on client behalf via Frametoque admin.`;
    } else if (data.packageType === "second_level") {
      notes = `LK Domain Registry Second-Level Budget Package. Order placed on client behalf via Frametoque admin.`;
    } else {
      notes = `Global Domain registered via Cloudflare. Order placed on client behalf via Frametoque admin.`;
    }
    setModalNotes(notes);

    // Default order status
    setModalOrderStatus(isLk ? "pending_manual_registration" : "active");
    setModalPaymentStatus("unpaid");
    setModalAutoInvoice(true);

    setIsOrderModalOpen(true);
  };

  // Switch from modal to manual form
  const handleSwitchToManualForm = () => {
    if (!modalDomainData) return;
    setDomainName(modalDomainData.domain);
    setRegistrar(modalDomainData.registrar || (modalDomainData.domain.endsWith(".lk") ? "LK Domain Registry" : "Cloudflare"));
    
    if (modalCurrency === "LKR") {
      setActualPriceCurrency("LKR");
      setRenewCostCurrency("LKR");
      setRegPriceLkr(modalSellingPrice);
      setRegCost(modalCostPrice);
      setRegBankLkr(modalCostPrice);
      setRenewPriceLkr(modalRenewalPrice);
      setRenewCost(modalCostPrice);
      setRenewBankLkr(modalCostPrice);
    } else {
      setActualPriceCurrency("USD");
      setRenewCostCurrency("USD");
      setRegPrice(modalSellingPrice);
      setRegCost(modalCostPrice);
      setRenewPrice(modalRenewalPrice);
      setRenewCost(modalCostPrice);
    }

    if (modalClientId && modalClientId !== "new") {
      setClientId(modalClientId);
      const sel = clients.find((c) => String(c.id) === String(modalClientId));
      if (sel) setEmail(sel.email || "");
    }

    setIsOrderModalOpen(false);
    setViewMode("manual");
  };

  // Submit order for client from the Search Modal
  const handleConfirmModalOrder = async () => {
    if (!modalDomainData) return;

    if (!modalClientId && !modalIsNewClient) {
      alert("Please select a client or create a new client.");
      return;
    }

    if (modalIsNewClient && (!modalNewClient.name || !modalNewClient.email)) {
      alert("Please enter the new client's name and email address.");
      return;
    }

    setModalSubmitting(true);

    try {
      let clientEmail = "";
      let clientName = "";
      let finalClientId: string | undefined = undefined;

      if (modalIsNewClient) {
        finalClientId = await createClient({
          name: modalNewClient.name,
          email: modalNewClient.email,
          phone: modalNewClient.phone || null,
          company: modalNewClient.company || null,
        });
        clientEmail = modalNewClient.email;
        clientName = modalNewClient.name;

        // Add to local state
        const createdObj = {
          id: finalClientId,
          name: modalNewClient.name,
          email: modalNewClient.email,
          phone: modalNewClient.phone || "",
          company: modalNewClient.company || "",
        };
        setClients((prev) => [createdObj, ...prev]);
        setClientId(finalClientId);
      } else {
        const selected = clients.find((c) => String(c.id) === String(modalClientId));
        if (!selected) {
          alert("Selected client could not be found.");
          setModalSubmitting(false);
          return;
        }
        clientEmail = selected.email;
        clientName = selected.name || selected.full_name || clientEmail.split("@")[0];
        finalClientId = String(selected.id);
      }

      const domain = modalDomainData.domain;
      const registrarName = modalDomainData.registrar || (domain.endsWith(".lk") ? "LK Domain Registry" : "Cloudflare");
      const isLkr = modalCurrency === "LKR";
      const sellPrice = parseFloat(modalSellingPrice) || 0;
      const costPrice = parseFloat(modalCostPrice) || 0;
      const renPrice = parseFloat(modalRenewalPrice) || sellPrice;
      const profitVal = sellPrice - costPrice;
      const effRate = lkrRate || 310;

      let linkedInvoiceId: string | null = null;

      // Auto-create client invoice if checked
      if (modalAutoInvoice) {
        try {
          const invRes = await createInvoice(
            {
              clientId: finalClientId,
              clientName: clientName,
              userEmail: clientEmail,
              projectName: `Domain Registration: ${domain}`,
              date: new Date().toISOString().split("T")[0],
              subtotal: sellPrice,
              discount: 0,
              total: sellPrice,
              advance: 0,
              totalDue: modalPaymentStatus === "paid" ? 0 : sellPrice,
              workStatus: modalOrderStatus === "active" ? "completed" : "pending",
              paymentStatus: modalPaymentStatus === "paid" ? "paid" : "unpaid",
              currency: modalCurrency,
              category: "Domain",
            },
            [
              {
                description: `1 Year Domain Registration for ${domain} (${registrarName})${
                  modalDomainData.packageType ? ` - ${modalDomainData.packageType.toUpperCase()} Package` : ""
                }`,
                quantity: 1,
                rate: sellPrice,
              },
            ]
          );
          if (invRes?.invoiceId) {
            linkedInvoiceId = invRes.invoiceId;
          }
        } catch (invErr: any) {
          console.warn("Invoice creation notice:", invErr);
        }
      }

      const expDate = new Date();
      expDate.setFullYear(expDate.getFullYear() + 1);
      const expiryStr = expDate.toISOString().split("T")[0] + " 00:00:00";

      const sellPriceLkr = isLkr ? sellPrice : sellPrice * effRate;
      const costPriceLkr = isLkr ? costPrice : costPrice * effRate;
      const renPriceLkr = isLkr ? renPrice : renPrice * effRate;

      const orderPayload = {
        client_email: clientEmail,
        domain_name: domain,
        actual_price: isLkr ? (costPrice / effRate) : costPrice,
        actual_price_currency: modalCurrency,
        selling_price: isLkr ? (sellPrice / effRate) : sellPrice,
        profit: isLkr ? (profitVal / effRate) : profitVal,
        renewal_cost: isLkr ? (costPrice / effRate) : costPrice,
        renewal_price: isLkr ? (renPrice / effRate) : renPrice,
        renewal_cost_currency: modalCurrency,
        renewal_lkr_cost: costPriceLkr,
        renewal_lkr_price: renPriceLkr,
        renewal_lkr_rate: effRate,
        registrar: registrarName,
        expiry_date: expiryStr,
        status: modalPaymentStatus === "paid" ? modalOrderStatus : "pending",
        invoice_id: linkedInvoiceId,
        activation_lkr_cost: costPriceLkr,
        activation_lkr_price: sellPriceLkr,
        activation_lkr_rate: effRate,
        auto_renew: modalAutoRenew,
      };

      const res = await addDomainOrder(orderPayload);
      if (res.success) {
        setIsOrderModalOpen(false);
        router.push("/admin/web-services/domains");
      } else {
        alert("Failed to place domain order: " + ((res as any).error || "Unknown error"));
        setModalSubmitting(false);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
      setModalSubmitting(false);
    }
  };

  // Manual client combo change
  const handleClientChange = (e: any) => {
    const val = e.target.value;
    if (val === "new") {
      setClientId("new");
      setShowNewClientForm(true);
      setEmail("");
    } else {
      setClientId(val);
      setShowNewClientForm(false);
      const selected = clients.find((c) => String(c.id) === String(val));
      if (selected) {
        setEmail(selected.email || "");
      }
    }
  };

  // Manual client creation
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

  // Manual Form submit
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

    let linkedInvoiceId = invoiceId.trim() || null;

    if (autoCreateInvoice && !linkedInvoiceId && email) {
      try {
        const clientObj = clients.find((c) => String(c.id) === String(clientId));
        const invoiceTotal = isLkrCurr ? (parseFloat(regPriceLkr) || rawCost) : (regSellLkr || regSellUsd * effRate);
        const invRes = await createInvoice(
          {
            clientId: clientId && clientId !== "new" ? clientId : undefined,
            clientName: clientObj?.name || clientObj?.full_name || email.split("@")[0],
            userEmail: email,
            projectName: `Domain Registration: ${domainName}`,
            date: new Date().toISOString().split("T")[0],
            subtotal: invoiceTotal,
            discount: 0,
            total: invoiceTotal,
            advance: 0,
            totalDue: invoiceTotal,
            workStatus: status === "active" ? "completed" : "pending",
            paymentStatus: status === "active" ? "paid" : "unpaid",
            currency: isLkrCurr ? "LKR" : "USD",
            category: "Domain",
          },
          [
            {
              description: `1 Year Domain Registration for ${domainName}`,
              quantity: 1,
              rate: invoiceTotal,
            },
          ]
        );
        if (invRes?.invoiceId) {
          linkedInvoiceId = invRes.invoiceId;
        }
      } catch (invErr: any) {
        console.warn("Auto-invoice generation notice:", invErr);
      }
    }

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
        invoice_id: linkedInvoiceId,
        provider_invoice_url: providerInvoiceUrl,
        activation_lkr_cost: bankDeductionLkr,
        activation_lkr_price: regSellLkr,
        activation_lkr_rate: effRate,
      });

      if (res.success) {
        router.push("/admin/web-services/domains");
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
    <div className="space-y-6 pb-8 w-full max-w-[1600px] mx-auto min-h-[calc(100vh-140px)]">
      {/* Top Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin/web-services/domains"
              className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back to Domains</span>
            </Link>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
            Register Domain for Client
          </h1>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-2xl border border-white/10 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("search")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              viewMode === "search"
                ? "bg-brand-500 text-white shadow-lg shadow-brand-500/25"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Live Domain Search</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("manual")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              viewMode === "manual"
                ? "bg-brand-500 text-white shadow-lg shadow-brand-500/25"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Manual / Legacy Entry</span>
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: CLIENT DOMAIN SEARCH */}
      {viewMode === "search" && (
        <div className="space-y-6">
          <DomainSearch
            lkrRate={lkrRate}
            adminMode={true}
            onSelectForAdmin={handleSelectForAdmin}
            selectedDomain={modalDomainData?.domain}
          />
        </div>
      )}

      {/* VIEW MODE 2: MANUAL FORM */}
      {viewMode === "manual" && (
        <form onSubmit={handleManualSubmit} className="space-y-4">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-3.5 relative z-20">
            <div className="border-b border-white/5 pb-2.5">
              <h2 className="text-sm font-semibold text-white">Domain &amp; Client Details</h2>
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
                  placeholder="e.g. acmecorp.com or selexprime.lk"
                  value={domainName}
                  onChange={(e) => setDomainName(e.target.value.toLowerCase().trim())}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-500 transition-colors text-white font-mono"
                />
              </div>
            </div>

            {showNewClientForm && (
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-2.5">
                <span className="text-xs font-semibold text-brand-400">New Client Details</span>
                <div className="grid sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    placeholder="Full Name *"
                    value={newClientData.name}
                    onChange={(e) => setNewClientData({ ...newClientData, name: e.target.value })}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                  />
                  <input
                    type="email"
                    placeholder="Email Address *"
                    value={newClientData.email}
                    onChange={(e) => setNewClientData({ ...newClientData, email: e.target.value })}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Company"
                    value={newClientData.company}
                    onChange={(e) => setNewClientData({ ...newClientData, company: e.target.value })}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Phone"
                    value={newClientData.phone}
                    onChange={(e) => setNewClientData({ ...newClientData, phone: e.target.value })}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowNewClientForm(false)}
                    className="px-3 py-1 bg-white/5 rounded-lg text-xs text-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateNewClient}
                    disabled={creatingClient}
                    className="px-3 py-1 bg-brand-600 rounded-lg text-xs font-semibold text-white"
                  >
                    {creatingClient ? "Saving..." : "Create Client"}
                  </button>
                </div>
              </div>
            )}

            <div className="grid sm:grid-cols-3 gap-4 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300 block">Registrar</label>
                <select
                  value={registrar}
                  onChange={(e) => setRegistrar(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white"
                >
                  <option value="Cloudflare">Cloudflare</option>
                  <option value="LK Domain Registry">LK Domain Registry (.lk)</option>
                  <option value="Internet.bs">Internet.bs</option>
                  <option value="Namecheap">Namecheap</option>
                  <option value="GoDaddy">GoDaddy</option>
                  <option value="Other">Other Registrar</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300 block">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white"
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="pending_manual_registration">Pending Manual Registration</option>
                  <option value="expired">Expired</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300 block">Expiry Date</label>
                <input
                  type="date"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white"
                />
              </div>
            </div>
          </div>

          {/* Pricing Details Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-3.5">
            <div className="border-b border-white/5 pb-2.5">
              <h2 className="text-sm font-semibold text-white">Pricing &amp; Rates</h2>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300 block">Cost Price ({actualPriceCurrency})</label>
                <input
                  type="number"
                  step="0.01"
                  value={regCost}
                  onChange={(e) => setRegCost(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300 block">Retail Price LKR</label>
                <input
                  type="number"
                  step="0.01"
                  value={regPriceLkr}
                  onChange={(e) => setRegPriceLkr(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300 block">Renewal Price LKR</label>
                <input
                  type="number"
                  step="0.01"
                  value={renewPriceLkr}
                  onChange={(e) => setRenewPriceLkr(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/admin/web-services/domains"
              className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl font-medium text-xs text-gray-300"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-semibold text-xs disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>Save Domain Order</span>
            </button>
          </div>
        </form>
      )}

      {/* REGISTER DOMAIN FOR CLIENT MODAL */}
      {isOrderModalOpen && modalDomainData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0b0c10] border border-white/15 rounded-3xl w-full max-w-4xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-white/10 flex items-start justify-between gap-4 shrink-0">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-brand-400 bg-brand-500/10 px-2.5 py-0.5 rounded-full border border-brand-500/20">
                    Domain Order Configuration
                  </span>
                  <span className="text-xs font-medium text-gray-400 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">
                    {modalDomainData.registrar || (modalDomainData.domain.endsWith(".lk") ? "LK Domain Registry" : "Cloudflare")}
                  </span>
                  {modalDomainData.packageType === "standard" && (
                    <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/30">
                      Standard Multi-Tier Bundle
                    </span>
                  )}
                </div>
                <h3 className="text-2xl font-black text-white font-mono tracking-tight">
                  {modalDomainData.domain}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOrderModalOpen(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              {/* Standard Reserved Sibling Names Notice */}
              {modalDomainData.packageType === "standard" &&
                modalDomainData.reservedNames &&
                modalDomainData.reservedNames.length > 0 && (
                  <div className="p-4 rounded-2xl bg-brand-500/5 border border-brand-500/20 space-y-2">
                    <span className="text-xs font-bold text-brand-300 block">
                      Auto-Reserved Domain Variants Included:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {modalDomainData.reservedNames.map((resName) => (
                        <span
                          key={resName}
                          className="font-mono text-xs text-gray-200 bg-black/40 px-2.5 py-1 rounded-md border border-white/10"
                        >
                          {resName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {/* STEP 1: CLIENT SELECTION */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-brand-400" />
                    <span>Choose Client *</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setModalIsNewClient(!modalIsNewClient);
                      if (!modalIsNewClient) {
                        setModalClientId("");
                      }
                    }}
                    className="text-xs text-brand-400 hover:text-brand-300 font-semibold transition-colors cursor-pointer"
                  >
                    {modalIsNewClient ? "Select existing client" : "+ Create New Client"}
                  </button>
                </div>

                {!modalIsNewClient ? (
                  <ClientCombobox
                    name="modalClientId"
                    value={modalClientId}
                    onChange={(e) => setModalClientId(e.target.value)}
                    clients={clients}
                    loading={clientsLoading}
                  />
                ) : (
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                    <span className="text-xs font-bold text-brand-400 block">Enter New Client Details</span>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Full Name *"
                        value={modalNewClient.name}
                        onChange={(e) => setModalNewClient({ ...modalNewClient, name: e.target.value })}
                        className="bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-brand-500"
                      />
                      <input
                        type="email"
                        placeholder="Email Address *"
                        value={modalNewClient.email}
                        onChange={(e) => setModalNewClient({ ...modalNewClient, email: e.target.value })}
                        className="bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-brand-500"
                      />
                      <input
                        type="text"
                        placeholder="Phone Number"
                        value={modalNewClient.phone}
                        onChange={(e) => setModalNewClient({ ...modalNewClient, phone: e.target.value })}
                        className="bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-brand-500"
                      />
                      <input
                        type="text"
                        placeholder="Company / Organization"
                        value={modalNewClient.company}
                        onChange={(e) => setModalNewClient({ ...modalNewClient, company: e.target.value })}
                        className="bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 2: PRICING & PROFIT */}
              <div className="space-y-3 pt-2 border-t border-white/5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-brand-400" />
                  <span>Pricing &amp; Margins ({modalCurrency})</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <span className="text-[11px] text-gray-400 block">Retail Selling Price</span>
                    <input
                      type="number"
                      step="0.01"
                      value={modalSellingPrice}
                      onChange={(e) => setModalSellingPrice(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono outline-none focus:border-brand-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] text-gray-400 block">Wholesale Cost Price</span>
                    <input
                      type="number"
                      step="0.01"
                      value={modalCostPrice}
                      onChange={(e) => setModalCostPrice(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono outline-none focus:border-brand-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] text-gray-400 block">Annual Renewal Price</span>
                    <input
                      type="number"
                      step="0.01"
                      value={modalRenewalPrice}
                      onChange={(e) => setModalRenewalPrice(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                {/* Profit Margin Indicator */}
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs text-emerald-300">
                  <span>Net Estimated Profit Margin:</span>
                  <strong className="text-emerald-400 font-mono text-sm">
                    +{modalCurrency === "LKR"
                      ? formatLKR((parseFloat(modalSellingPrice) || 0) - (parseFloat(modalCostPrice) || 0))
                      : formatUSD((parseFloat(modalSellingPrice) || 0) - (parseFloat(modalCostPrice) || 0))}
                  </strong>
                </div>
              </div>

              {/* STEP 3: INVOICE & ORDER SETTINGS */}
              <div className="space-y-4 pt-2 border-t border-white/5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-300 block">
                  Invoice &amp; Order Settings
                </label>

                {/* Auto create invoice toggle */}
                <label className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modalAutoInvoice}
                    onChange={(e) => setModalAutoInvoice(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-500 border-white/20 bg-white/5 focus:ring-0 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="text-white font-semibold block">Generate and link client invoice automatically</span>
                    <span className="text-gray-400 text-[11px]">
                      Creates official invoice with line item and tracks payment in client dashboard.
                    </span>
                  </div>
                </label>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[11px] text-gray-400 block">Payment Status</span>
                    <select
                      value={modalPaymentStatus}
                      onChange={(e) => setModalPaymentStatus(e.target.value as any)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-500 cursor-pointer"
                    >
                      <option value="unpaid">Unpaid (Send Invoice to Client)</option>
                      <option value="paid">Paid (Payment Received via Phone/Bank)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] text-gray-400 block">Order Status</span>
                    <select
                      value={modalOrderStatus}
                      onChange={(e) => setModalOrderStatus(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-500 cursor-pointer"
                    >
                      <option value="active">Active (Ready &amp; Configured)</option>
                      <option value="pending_manual_registration">Pending Manual Registration (Registry)</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                </div>

                {/* Internal Notes */}
                <div className="space-y-1">
                  <span className="text-[11px] text-gray-400 block">Internal Order Notes</span>
                  <textarea
                    rows={2}
                    value={modalNotes}
                    onChange={(e) => setModalNotes(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-gray-200 outline-none focus:border-brand-500 leading-relaxed font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 bg-black/40 shrink-0">
              <button
                type="button"
                onClick={handleSwitchToManualForm}
                className="text-xs text-brand-400 hover:text-brand-300 transition-colors font-medium cursor-pointer"
              >
                Switch to Advanced Form →
              </button>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsOrderModalOpen(false)}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl font-medium text-xs text-gray-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmModalOrder}
                  disabled={modalSubmitting}
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-2"
                >
                  {modalSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Placing Order...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm &amp; Register Domain</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
