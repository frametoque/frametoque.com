"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  CreditCard,
  AlertCircle,
  Upload,
  Check,
  Loader2,
  Landmark,
  Copy,
  CheckCircle2,
  Lock,
  ArrowRight,
} from "lucide-react";
import { submitBankSlip } from "@/app/(dashboard)/admin/actions/actions";
import {
  createCardPaymentCheckout,
  getCardPaymentAvailability,
} from "@/app/(dashboard)/admin/actions/payments";

interface PayModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: {
    invoice_id: string;
    project_name: string;
    total_due: number;
    currency: string;
    bank_account_id?: number | null;
    bank_account_name?: string | null;
    bank_account_number?: string | null;
    bank_account_bank?: string | null;
    bank_account_branch?: string | null;
    category?: string | null;
    client_name?: string | null;
    client_email?: string | null;
  } | null;
}

export default function PayModal({ isOpen, onClose, invoice }: PayModalProps) {
  const [payAmount, setPayAmount] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  // Default to 'card' as the 1st option
  const [selectedMethod, setSelectedMethod] = useState<"card" | "bank">("card");

  // Card Payment States
  const [processingCard, setProcessingCard] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardAvailable, setCardAvailable] = useState<boolean>(true);
  const [cardDisabledReason, setCardDisabledReason] = useState<string | null>(null);
  const [liveDue, setLiveDue] = useState<number>(invoice?.total_due || 0);
  const [liveBankDetails, setLiveBankDetails] = useState<{
    bankName: string;
    branch?: string;
    accNumber: string;
    accName: string;
  } | null>(null);

  // Bank Slip States
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [submittingSlip, setSubmittingSlip] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [convertingPdf, setConvertingPdf] = useState(false);

  useEffect(() => {
    if (invoice && isOpen) {
      const initialDue = invoice.total_due != null ? invoice.total_due : 0;
      setLiveDue(initialDue);
      setPayAmount(initialDue.toFixed(2));
      setError(null);
      setCardError(null);
      setProcessingCard(false);
      setSlipFile(null);
      setSlipPreview(null);
      setSubmittedSuccess(false);

      // Initialize bank details if passed in props
      if (invoice.bank_account_number || invoice.bank_account_bank || invoice.bank_account_name) {
        setLiveBankDetails({
          bankName: invoice.bank_account_bank || invoice.bank_account_name || "Bank Transfer",
          branch: invoice.bank_account_branch || "",
          accNumber: invoice.bank_account_number || "",
          accName: invoice.bank_account_name || "",
        });
      } else {
        setLiveBankDetails(null);
      }

      // Re-fetch live remaining due and bank details from the server to prevent stale balance conflicts
      fetch(`/api/invoice/${invoice.invoice_id}?t=${Date.now()}`, { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => {
          if (data) {
            if (typeof data.total_due === "number") {
              setLiveDue(data.total_due);
              setPayAmount((prev) => {
                const parsed = parseFloat(prev);
                if (isNaN(parsed) || parsed >= initialDue - 0.01) {
                  return data.total_due.toFixed(2);
                }
                return Math.min(parsed, data.total_due).toFixed(2);
              });
            }

            if (data.bank_account_number || data.bank_account_bank || data.bank_account_name) {
              setLiveBankDetails({
                bankName: data.bank_account_bank || data.bank_account_name || "Bank Transfer",
                branch: data.bank_account_branch || "",
                accNumber: data.bank_account_number || "",
                accName: data.bank_account_name || "",
              });
            }
          }
        })
        .catch(() => {});

      // Check card payment availability (disabled if sk_test_ on live)
      getCardPaymentAvailability()
        .then((res) => {
          if (!res.available) {
            setCardAvailable(false);
            setCardDisabledReason(res.reason || "Card payment is disabled on live.");
            setSelectedMethod("bank");
          } else {
            setCardAvailable(true);
            setCardDisabledReason(null);
            setSelectedMethod("card");
          }
        })
        .catch(() => {
          setSelectedMethod("card");
        });
    }
  }, [invoice, isOpen]);

  const convertPdfToImage = async (file: File): Promise<File> => {
    if (file.type !== "application/pdf") return file;

    if (!(window as any).pdfjsLib) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load PDF.js"));
        document.head.appendChild(script);
      });
    }

    const pdfjsLib = (window as any).pdfjsLib;
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";

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
        resolve(convertedFile);
      }, "image/png");
    });
  };

  if (!isOpen || !invoice) return null;

  const rawCur = (invoice.currency || "LKR").trim().toUpperCase();
  const currencyLabel =
    !rawCur || rawCur === "RS." || rawCur === "RS" || rawCur === "RUPEES" ? "LKR" : rawCur;
  const maxDue = liveDue;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPayAmount(val);
    setCardError(null);

    const parsed = parseFloat(val);
    if (isNaN(parsed)) {
      setError("Please enter a valid amount");
    } else if (parsed <= 0) {
      setError("Amount must be greater than 0");
    } else if (parsed > maxDue + 0.0001) {
      setError(
        `Amount cannot exceed the total due (${currencyLabel} ${maxDue.toLocaleString("en-US", {
          minimumFractionDigits: 2,
        })})`
      );
    } else {
      setError(null);
    }
  };

  const handleCardPayment = async () => {
    if (!invoice) return;
    setCardError(null);

    const parsed = parseFloat(payAmount);
    const amountToPay = allowCustomAmount ? parsed : maxDue;

    if (isNaN(amountToPay) || amountToPay <= 0) {
      setCardError("Please enter a valid payment amount greater than zero.");
      return;
    }

    if (amountToPay > maxDue + 0.0001) {
      setCardError(
        `Amount cannot exceed the total due (${currencyLabel} ${maxDue.toLocaleString("en-US", {
          minimumFractionDigits: 2,
        })})`
      );
      return;
    }

    setProcessingCard(true);
    try {
      const currentPath = typeof window !== "undefined" ? window.location.pathname : undefined;
      const res = await createCardPaymentCheckout({
        invoiceId: invoice.invoice_id,
        amount: amountToPay,
        returnUrl: currentPath,
      });

      if (!res.success || !res.url) {
        let msg = res.error || "Failed to initialize payment. Please try again.";
        const lower = msg.toLowerCase();
        if (
          lower.includes("plan's limit") ||
          lower.includes("plan limit") ||
          lower.includes("limit of rs") ||
          lower.includes("upgrade in the dashboard") ||
          lower.includes("request an upgrade") ||
          lower.includes("card payments past your plan") ||
          lower.includes("not available")
        ) {
          msg = "Card payments not available right now. Please use Bank Transfer.";
        }
        setCardError(msg);
        setProcessingCard(false);
        return;
      }

      // Redirect browser to Payments.lk hosted 3D-secure checkout page
      window.location.href = res.url;
    } catch (err: any) {
      console.error("[PayModal] Card payment initiation failed:", err);
      let msg = err.message || "Failed to connect to Payments.lk. Please try again or use Bank Transfer.";
      const lower = msg.toLowerCase();
      if (
        lower.includes("plan's limit") ||
        lower.includes("plan limit") ||
        lower.includes("limit of rs") ||
        lower.includes("upgrade in the dashboard") ||
        lower.includes("request an upgrade") ||
        lower.includes("card payments past your plan")
      ) {
        msg = "Card payments not available right now. Please use Bank Transfer.";
      }
      setCardError(msg);
      setProcessingCard(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit. Please upload a smaller file.");
      return;
    }

    if (file.type === "application/pdf") {
      setConvertingPdf(true);
      try {
        const convertedFile = await convertPdfToImage(file);
        setSlipFile(convertedFile);
        const reader = new FileReader();
        reader.onloadend = () => {
          setSlipPreview(reader.result as string);
        };
        reader.readAsDataURL(convertedFile);
      } catch (err: any) {
        console.error(err);
        alert("Failed to convert PDF to image. Please upload a standard image file.");
        setSlipFile(null);
        setSlipPreview(null);
      } finally {
        setConvertingPdf(false);
      }
      return;
    }

    setSlipFile(file);

    // If image, create preview
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSlipPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSlipPreview(null);
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSubmitSlip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slipFile) {
      alert("Please select or drag a bank transfer receipt file.");
      return;
    }

    setSubmittingSlip(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const amountToSubmit = allowCustomAmount ? payAmount : maxDue.toFixed(2);
        const res = await submitBankSlip(invoice.invoice_id, base64String, amountToSubmit);
        if (res.success) {
          setSubmittedSuccess(true);
          setTimeout(() => {
            onClose();
            // Trigger refresh events
            window.dispatchEvent(new Event("domains:refresh"));
            window.dispatchEvent(new Event("invoices:refresh"));
            window.location.reload();
          }, 2000);
        } else {
          alert("Submission failed: " + res.error);
        }
      };
      reader.readAsDataURL(slipFile);
    } catch (err: any) {
      console.error(err);
      alert("Error: " + err.message);
    } finally {
      setSubmittingSlip(false);
    }
  };

  const bankDetails =
    liveBankDetails ||
    (invoice && (invoice.bank_account_id || invoice.bank_account_number)
      ? {
          bankName: invoice.bank_account_bank || invoice.bank_account_name || "Bank Transfer",
          branch: invoice.bank_account_branch || "",
          accNumber: invoice.bank_account_number || "",
          accName: invoice.bank_account_name || "",
        }
      : null);

  const isDomainInvoice =
    (invoice?.category || "").toLowerCase() === "domain" ||
    /domain/i.test(invoice?.project_name || "");
  const allowCustomAmount = !isDomainInvoice;

  const currentPayValue = parseFloat(payAmount) || 0;
  const remainingAfterPayment = Math.max(0, maxDue - currentPayValue);
  // Gross-up surcharge formula: total = base / (1 - 0.0229)
  // Ensures that after Payments.lk deducts its 2.29% fee from the gross charge, the business receives 100% of the base amount
  const totalChargedWithFee =
    currentPayValue > 0 ? Math.ceil((currentPayValue / (1 - 0.0229)) * 100) / 100 : 0;
  const cardServiceFee =
    currentPayValue > 0 ? parseFloat((totalChargedWithFee - currentPayValue).toFixed(2)) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      {/* Modal Card */}
      <div className="relative w-full max-w-lg overflow-hidden bg-zinc-950 border border-white/10 rounded-3xl shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={processingCard || submittingSlip}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer z-10 disabled:opacity-40"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="p-7 sm:p-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="text-blue-400 font-semibold text-sm">Payment</span>
          </div>

          <h3 className="text-2xl font-bold text-white mb-1">Pay Invoice</h3>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            Invoice ID: <span className="text-white font-semibold">#{invoice.invoice_id}</span> |{" "}
            {invoice.project_name}
          </p>

            {submittedSuccess ? (
              <div className="py-10 text-center space-y-4">
                <div className="w-16 h-16 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full flex items-center justify-center mx-auto animate-bounce">
                  <Check className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-bold text-white">Slip Uploaded Successfully</h4>
                <p className="text-gray-400 text-sm max-w-xs mx-auto">
                  Our accounts department is currently reviewing your payment transfer. Your invoice
                  payment status has been set to <strong>On Review</strong>.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Payment Methods Tabs: 1st Option = Card Payment (if enabled), 2nd Option = Bank Transfer */}
                <div className="grid grid-cols-2 gap-2 bg-white/5 p-1 rounded-2xl border border-white/10">
                  <button
                    type="button"
                    disabled={!cardAvailable}
                    onClick={() => cardAvailable && setSelectedMethod("card")}
                    title={
                      !cardAvailable
                        ? cardDisabledReason || "Card payment is disabled on live in test mode"
                        : undefined
                    }
                    className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      !cardAvailable
                        ? "text-gray-500 opacity-40 cursor-not-allowed"
                        : selectedMethod === "card"
                        ? "bg-white text-black shadow cursor-pointer"
                        : "text-gray-400 hover:text-white cursor-pointer"
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Card Payment</span>
                    {!cardAvailable && (
                      <span className="text-[10px] text-amber-400 font-normal">(Disabled)</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMethod("bank")}
                    className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      selectedMethod === "bank"
                        ? "bg-white text-black shadow"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <Landmark className="w-4 h-4" />
                    Bank Transfer / Slip
                  </button>
                </div>

                {/* TAB 1: CARD PAYMENT */}
                {selectedMethod === "card" ? (
                  <div className="space-y-6">
                    {/* Amount Input */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          Payment Amount
                        </label>
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wider ${
                            allowCustomAmount ? "text-brand-400" : "text-amber-400"
                          }`}
                        >
                          {allowCustomAmount ? "Custom Amount" : "Fixed Full Amount"}
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          max={maxDue}
                          value={payAmount}
                          onChange={handleAmountChange}
                          disabled={!allowCustomAmount || processingCard}
                          className="w-full rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-3 pr-16 text-sm font-semibold text-white outline-none transition focus:border-blue-500/60 disabled:cursor-not-allowed disabled:opacity-60"
                          placeholder="Enter amount"
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-semibold text-gray-400">
                          {currencyLabel}
                        </span>
                      </div>

                      {error && (
                        <p className="text-xs text-red-400 flex items-center gap-1.5 mt-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          {error}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
                        <span>
                          Total Due:{" "}
                          <strong className="text-white">
                            {currencyLabel} {maxDue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </strong>
                        </span>
                        {allowCustomAmount && currentPayValue > 0 && currentPayValue < maxDue && (
                          <span>
                            Remaining:{" "}
                            <strong className="text-zinc-300">
                              {currencyLabel}{" "}
                              {remainingAfterPayment.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </strong>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Processing Fee Breakdown */}
                    {currentPayValue > 0 && (
                      <div className="p-3.5 bg-white/[0.04] border border-white/10 rounded-2xl space-y-2 text-xs">
                        <div className="flex items-center justify-between text-gray-300">
                          <span>Invoice Payment</span>
                          <span className="font-semibold text-white">
                            {currencyLabel} {currentPayValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-gray-400">
                          <span>Gateway Service Fee</span>
                          <span className="text-zinc-300">
                            + {currencyLabel} {cardServiceFee.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-sm font-bold text-white">
                          <span>Total Charged</span>
                          <span className="text-cyan-400 font-extrabold">
                            {currencyLabel} {totalChargedWithFee.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3 pt-1">
                      {cardError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start justify-between gap-2 text-xs text-red-400">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{cardError}</span>
                          </div>
                          {cardError.toLowerCase().includes("bank transfer") && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedMethod("bank");
                                setCardError(null);
                              }}
                              className="text-cyan-400 hover:text-cyan-300 font-semibold underline shrink-0 cursor-pointer ml-2"
                            >
                              Use Bank Transfer
                            </button>
                          )}
                        </div>
                      )}

                      {/* Checkout Action Button */}
                      <button
                        type="button"
                        onClick={handleCardPayment}
                        disabled={
                          processingCard ||
                          !!error ||
                          !payAmount ||
                          parseFloat(payAmount) <= 0 ||
                          parseFloat(payAmount) > maxDue + 0.0001
                        }
                        className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {processingCard ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Connecting to Payments.lk...
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4" />
                            Pay{" "}
                            {currencyLabel}{" "}
                            {totalChargedWithFee.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                            })}{" "}
                            with Card
                            <ArrowRight className="w-4 h-4 ml-1" />
                          </>
                        )}
                      </button>

                      <p className="text-[11px] text-center text-gray-400 flex items-center justify-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>
                          Avoid fees by paying with{" "}
                          <button
                            type="button"
                            onClick={() => setSelectedMethod("bank")}
                            className="text-cyan-400 hover:underline font-semibold cursor-pointer"
                          >
                            Bank Transfer
                          </button>
                        </span>
                      </p>
                    </div>
                  </div>
                ) : (
                  /* TAB 2: BANK TRANSFER / SLIP */
                  <div className="space-y-6">
                    <div className="space-y-4">
                      {bankDetails ? (
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3 relative overflow-hidden">
                          <div className="flex justify-between items-center pb-2 border-b border-white/5">
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                              Transfer Details
                            </span>
                            <span className="text-white font-black text-sm bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 rounded">
                              {currencyLabel} {maxDue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <span className="text-gray-400 block mb-0.5">Bank Name</span>
                              <span className="text-white font-semibold">{bankDetails.bankName}</span>
                            </div>
                            <div>
                              <span className="text-gray-400 block mb-0.5">Branch</span>
                              <span className="text-white font-semibold">{bankDetails.branch || "—"}</span>
                            </div>
                            <div className="col-span-2 flex justify-between items-center bg-zinc-900 border border-white/5 p-2.5 rounded-xl">
                              <div>
                                <span className="text-gray-400 block mb-0.5">Account Number</span>
                                <span className="text-white font-mono font-bold text-sm tracking-wide">
                                  {bankDetails.accNumber || "—"}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  bankDetails.accNumber && handleCopy(bankDetails.accNumber, "acc")
                                }
                                className="p-2 hover:bg-white/5 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                              >
                                {copiedField === "acc" ? (
                                  <Check className="w-4 h-4 text-green-400" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                            <div className="col-span-2 flex justify-between items-center bg-zinc-900 border border-white/5 p-2.5 rounded-xl">
                              <div>
                                <span className="text-gray-400 block mb-0.5">Account Name</span>
                                <span className="text-white font-semibold">{bankDetails.accName || "—"}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  bankDetails.accName && handleCopy(bankDetails.accName, "name")
                                }
                                className="p-2 hover:bg-white/5 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                              >
                                {copiedField === "name" ? (
                                  <Check className="w-4 h-4 text-green-400" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {/* Upload Form */}
                      <form id="bank-slip-form" onSubmit={handleSubmitSlip} className="space-y-4">
                        {!isDomainInvoice && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Payment Amount
                              </label>
                              <span
                                className={`text-[10px] font-semibold uppercase tracking-wider ${
                                  allowCustomAmount ? "text-brand-400" : "text-amber-400"
                                }`}
                              >
                                {allowCustomAmount ? "Custom Amount" : "Fixed Full Amount"}
                              </span>
                            </div>
                            <div className="relative">
                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                max={maxDue}
                                value={payAmount}
                                onChange={handleAmountChange}
                                disabled={!allowCustomAmount}
                                className="w-full rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-3 pr-16 text-sm font-semibold text-white outline-none transition focus:border-brand-500/50 disabled:cursor-not-allowed disabled:opacity-60"
                                placeholder="Enter amount"
                              />
                              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-semibold text-gray-400">
                                {currencyLabel}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400">
                              {allowCustomAmount
                                ? `Enter any amount up to ${currencyLabel} ${maxDue.toLocaleString(
                                    "en-US",
                                    { minimumFractionDigits: 2 }
                                  )} for a partial payment.`
                                : "Domain invoices must be paid in full, so this payment amount is fixed to the remaining balance."}
                            </p>
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Upload Transfer Slip
                          </label>
                          <div className="relative border-2 border-dashed border-white/10 hover:border-blue-500/40 rounded-2xl p-4 transition-all bg-white/[0.01] hover:bg-white/[0.03] text-center flex flex-col items-center justify-center min-h-[120px]">
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              required
                              onChange={handleFileChange}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            {slipFile ? (
                              <div className="space-y-1.5">
                                {slipPreview ? (
                                  <img
                                    src={slipPreview}
                                    alt="Slip preview"
                                    className="w-14 h-14 object-cover rounded-xl border border-white/20 mx-auto"
                                  />
                                ) : (
                                  <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl inline-block">
                                    <Landmark className="w-5 h-5 text-blue-400" />
                                  </div>
                                )}
                                <p className="text-sm font-semibold text-white truncate max-w-xs">
                                  {slipFile.name}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {(slipFile.size / (1024 * 1024)).toFixed(2)} MB
                                </p>
                                {convertingPdf && (
                                  <p className="text-xs text-brand-400">
                                    Converting PDF page to image...
                                  </p>
                                )}
                              </div>
                            ) : (
                              <>
                                <Upload className="w-6 h-6 text-gray-400 mb-2" />
                                <p className="text-sm font-semibold text-white">
                                  Drag & drop or click to upload
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  Supports JPEG, PNG or PDF (Max 5MB)
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      </form>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        form="bank-slip-form"
                        disabled={submittingSlip || !slipFile || convertingPdf}
                        className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {submittingSlip ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Submitting Transfer Slip...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            Submit Transfer Slip
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
