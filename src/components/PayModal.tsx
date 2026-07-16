"use client";

import React, { useState, useEffect } from "react";
import { X, CreditCard, Sparkles, AlertCircle } from "lucide-react";

interface PayModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: {
    invoice_id: string;
    project_name: string;
    total_due: number;
    currency: string;
  } | null;
}

export default function PayModal({ isOpen, onClose, invoice }: PayModalProps) {
  const [payAmount, setPayAmount] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (invoice) {
      setPayAmount(invoice.total_due.toFixed(2));
      setError(null);
    }
  }, [invoice, isOpen]);

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

  const handlePayClick = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      {/* Modal Card */}
      <div className="relative w-full max-w-lg overflow-hidden bg-zinc-950 border border-white/10 rounded-3xl shadow-2xl">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
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

          <h3 className="text-2xl font-bold text-white mb-2">
            Pay Invoice
          </h3>
          <p className="text-gray-400 text-sm mb-6">
            Make a payment for <span className="text-white font-medium">{invoice.project_name}</span> (Invoice #{invoice.invoice_id})
          </p>

          {/* Amount Box */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span>Total Outstanding Due</span>
              <span className="font-semibold text-white">
                {currencyLabel} {maxDue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            
            <form onSubmit={handlePayClick} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Enter Amount to Pay ({currencyLabel})</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">
                    {currencyLabel}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={payAmount}
                    onChange={handleAmountChange}
                    className="w-full pl-14 pr-4 py-3 bg-zinc-900 border border-white/10 rounded-xl outline-none text-white font-semibold focus:border-blue-500/40 transition-colors"
                    placeholder="0.00"
                  />
                </div>
                {error && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-red-400">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              {/* Gateway Options */}
              <div className="pt-2">
                <p className="text-xs text-gray-400 mb-2 font-medium">Select Payment Method</p>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="submit"
                    disabled={!!error || !payAmount}
                    className="flex items-center justify-between p-4 bg-zinc-900 border border-white/10 rounded-2xl hover:border-blue-500/30 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <div>
                      <p className="text-white font-semibold text-sm">Visa / Mastercard</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Pay securely using credit or debit cards</p>
                    </div>
                    <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
                      Coming Soon
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 py-3 text-sm font-semibold text-gray-400 hover:text-white bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
