"use client";

import React, { useState, useEffect } from "react";
import { X, CreditCard, AlertCircle, Upload, Check, Loader2, Landmark, Copy, CheckCircle2 } from "lucide-react";
import { submitBankSlip } from "@/app/(dashboard)/admin/actions/actions";

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
  } | null;
}

export default function PayModal({ isOpen, onClose, invoice }: PayModalProps) {
  const [payAmount, setPayAmount] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'bank'>('bank');
  
  // Bank Slip States
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [submittingSlip, setSubmittingSlip] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [convertingPdf, setConvertingPdf] = useState(false);

  useEffect(() => {
    if (invoice) {
      setPayAmount(invoice.total_due.toFixed(2));
      setError(null);
      setSlipFile(null);
      setSlipPreview(null);
      setSubmittedSuccess(false);
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
        resolve(convertedFile);
      }, "image/png");
    });
  };

  if (!isOpen || !invoice) return null;

  const currencyLabel = invoice.currency === "LKR" ? "Rs." : invoice.currency;
  const maxDue = invoice.total_due;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPayAmount(val);

    const parsed = parseFloat(val);
    if (isNaN(parsed)) {
      setError("Please enter a valid amount");
    } else if (parsed <= 0) {
      setError("Amount must be greater than 0");
    } else if (parsed > maxDue) {
      setError(`Amount cannot exceed the total due (${currencyLabel} ${maxDue.toLocaleString("en-US", { minimumFractionDigits: 2 })})`);
    } else {
      setError(null);
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
            // Trigger refresh event
            window.dispatchEvent(new Event("domains:refresh"));
            window.dispatchEvent(new Event("invoices:refresh"));
            // Hard reload fallback
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

  const bankDetails = invoice && invoice.bank_account_id ? {
    bankName: invoice.bank_account_bank || invoice.bank_account_name || "Bank Transfer",
    branch: invoice.bank_account_branch || "",
    accNumber: invoice.bank_account_number || "",
    accName: invoice.bank_account_name || ""
  } : null;

  const isDomainInvoice = (invoice?.category || "").toLowerCase() === "domain" || /domain/i.test(invoice?.project_name || "");
  const allowCustomAmount = !isDomainInvoice;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      {/* Modal Card */}
      <div className="relative w-full max-w-lg overflow-hidden bg-zinc-950 border border-white/10 rounded-3xl shadow-2xl">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="p-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="text-blue-400 font-semibold text-sm">Payment Gateway</span>
          </div>

          <h3 className="text-2xl font-bold text-white mb-1">
            Pay Invoice
          </h3>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            Invoice ID: <span className="text-white font-semibold">#{invoice.invoice_id}</span> | {invoice.project_name}
          </p>

          {submittedSuccess ? (
            <div className="py-10 text-center space-y-4">
              <div className="w-16 h-16 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <Check className="w-8 h-8" />
              </div>
              <h4 className="text-xl font-bold text-white">Slip Uploaded Successfully</h4>
              <p className="text-gray-400 text-sm max-w-xs mx-auto">
                Our accounts department is currently reviewing your payment transfer. Your invoice payment status has been set to <strong>On Review</strong>.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Payment Methods Tabs */}
              <div className="grid grid-cols-2 gap-2 bg-white/5 p-1 rounded-2xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setSelectedMethod('bank')}
                  className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    selectedMethod === 'bank'
                      ? 'bg-white text-black shadow'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Landmark className="w-4 h-4" />
                  Bank Transfer / Slip
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMethod('card')}
                  className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    selectedMethod === 'card'
                      ? 'bg-white text-black shadow'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  Card Payment
                </button>
              </div>

              {selectedMethod === 'card' ? (
                <div className="py-10 text-center bg-white/5 border border-white/10 rounded-2xl p-6">
                  <CreditCard className="w-10 h-10 text-gray-500 mx-auto mb-4" />
                  <p className="text-white font-semibold text-sm">Credit / Debit Card Checkout</p>
                  <p className="text-gray-400 text-xs mt-1">Visa, Mastercard and Amex online payments are currently being configured.</p>
                  <span className="inline-block mt-4 px-3 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase rounded border border-blue-500/20">
                    Coming Soon
                  </span>
                </div>
              ) : (
                <div className="space-y-5">
                  {bankDetails ? (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3 relative overflow-hidden">
                      <div className="flex justify-between items-center pb-2 border-b border-white/5">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Transfer Details</span>
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
                            <span className="text-white font-mono font-bold text-sm tracking-wide">{bankDetails.accNumber || "—"}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => bankDetails.accNumber && handleCopy(bankDetails.accNumber, 'acc')}
                            className="p-2 hover:bg-white/5 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                          >
                            {copiedField === 'acc' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                        <div className="col-span-2 flex justify-between items-center bg-zinc-900 border border-white/5 p-2.5 rounded-xl">
                          <div>
                            <span className="text-gray-400 block mb-0.5">Account Name</span>
                            <span className="text-white font-semibold">{bankDetails.accName || "—"}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => bankDetails.accName && handleCopy(bankDetails.accName, 'name')}
                            className="p-2 hover:bg-white/5 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                          >
                            {copiedField === 'name' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="">
                    </div>
                  )}

                  {/* Upload Form */}
                  <form onSubmit={handleSubmitSlip} className="space-y-4">
                    {!isDomainInvoice && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Payment Amount</label>
                          <span className={`text-[10px] font-semibold uppercase tracking-wider ${allowCustomAmount ? 'text-brand-400' : 'text-amber-400'}`}>
                            {allowCustomAmount ? 'Custom Amount' : 'Fixed Full Amount'}
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
                            ? `Enter any amount up to ${currencyLabel} ${maxDue.toLocaleString("en-US", { minimumFractionDigits: 2 })} for a partial payment.`
                            : 'Domain invoices must be paid in full, so this payment amount is fixed to the remaining balance.'}
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Upload Transfer Slip</label>
                      <div className="relative border-2 border-dashed border-white/10 hover:border-blue-500/40 rounded-2xl p-6 transition-all bg-white/[0.01] hover:bg-white/[0.03] text-center flex flex-col items-center justify-center min-h-[140px]">
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          required
                          onChange={handleFileChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        {slipFile ? (
                          <div className="space-y-2">
                            {slipPreview ? (
                              <img src={slipPreview} alt="Slip preview" className="w-16 h-16 object-cover rounded-xl border border-white/20 mx-auto" />
                            ) : (
                              <div className="p-3 bg-white/5 border border-white/10 rounded-xl inline-block">
                                <Landmark className="w-6 h-6 text-blue-400" />
                              </div>
                            )}
                            <p className="text-sm font-semibold text-white truncate max-w-xs">{slipFile.name}</p>
                            <p className="text-xs text-gray-400">{(slipFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                            {convertingPdf && (
                              <p className="text-xs text-brand-400">Converting PDF page to image...</p>
                            )}
                          </div>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-gray-400 mb-3" />
                            <p className="text-sm font-semibold text-white">Drag & drop or click to upload</p>
                            <p className="text-xs text-gray-400 mt-1">Supports JPEG, PNG or PDF (Max 5MB)</p>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submittingSlip || !slipFile || convertingPdf}
                      className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-brand-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  </form>
                </div>
              )}
            </div>
          )}

          {/* Cancel Button */}
          {!submittedSuccess && (
            <div className="mt-5 border-t border-white/5 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 text-sm font-semibold text-gray-400 hover:text-white bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all cursor-pointer"
              >
                Close Gateway
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
