"use client";

import React, { useState } from "react";
import { ArrowRightLeft, KeyRound, Loader2, Check, X, AlertTriangle } from "lucide-react";

interface DomainTransferInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userEmail: string;
}

export default function DomainTransferInModal({
  isOpen,
  onClose,
  onSuccess,
  userEmail,
}: DomainTransferInModalProps) {
  const [domain, setDomain] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/services/domains/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: domain.trim().toLowerCase(),
          auth_code: authCode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to initiate domain transfer");

      setSuccessMsg(data.message || "Domain transfer initiated successfully!");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-[#0c0d12] border border-white/10 rounded-3xl shadow-2xl p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Transfer Domain In</h3>
              <p className="text-xs text-gray-400">Move your domain to Frametoque Digital</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-gray-400 mb-1 font-medium">Domain Name to Transfer</label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="e.g. mycompany.com"
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-brand-400"
            />
          </div>

          <div>
            <label className="block text-gray-400 mb-1 font-medium">
              Authorization / EPP Code
            </label>
            <input
              type="text"
              value={authCode}
              onChange={(e) => setAuthCode(e.target.value)}
              placeholder="Enter transfer code from your current registrar"
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white font-mono focus:outline-none focus:border-brand-400"
            />
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5 text-gray-400">
            <span className="font-semibold text-white">Transfer Checklist:</span>
            <ul className="list-disc pl-4 space-y-1 text-[11px]">
              <li>Domain must be unlocked at your current registrar.</li>
              <li>WHOIS Privacy must be turned off or allow authorization emails.</li>
              <li>Domain must not have been registered or transferred within the past 60 days (ICANN rule).</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold flex items-center gap-2 cursor-pointer shadow-lg shadow-brand-500/20"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
              <span>Initiate Inbound Transfer</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

