"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Save,
  Check,
  Loader2,
  Sliders,
  History,
  AlertTriangle,
  Globe,
  Search,
  RefreshCw,
} from "lucide-react";
import {
  getTldPricing,
  updateTldPricing,
  syncAllTldPricingFromCloudflare,
  getAdminAuditLogs,
  TldPricingItem,
} from "../actions/domains";

/**
 * TLD Pricing Management Modal
 */
export function TldPricingModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [pricings, setPricings] = useState<TldPricingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingTld, setSavingTld] = useState<string | null>(null);
  const [syncingLive, setSyncingLive] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [form, setForm] = useState<TldPricingItem>({
    tld: "",
    cost_price: 10.46,
    markup: 5.50,
    selling_price: 15.96,
    renewal_cost: 10.46,
    renewal_price: 15.96,
    provider: "Cloudflare",
    is_active: true,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getTldPricing();
      setPricings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (item: TldPricingItem) => {
    setSavingTld(item.tld);
    try {
      const res = await updateTldPricing(item);
      if (!res.success) throw new Error(res.error || "Failed to update pricing");
      await loadData();
      setIsAddingNew(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingTld(null);
    }
  };

  const handleSyncCloudflare = async () => {
    setSyncingLive(true);
    setSyncNotice(null);
    try {
      const res = await syncAllTldPricingFromCloudflare();
      if (!res.success) throw new Error(res.error || "Failed to sync pricing with Cloudflare");
      setPricings(res.pricings);
      setSyncNotice(`Synced live wholesale cost rates for ${res.syncedCount} TLDs from Cloudflare.`);
      setTimeout(() => setSyncNotice(null), 5000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSyncingLive(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-4xl bg-[#0c0d12] border border-white/10 rounded-3xl shadow-2xl p-6 space-y-6 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-brand-500/10 text-brand-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">TLD Pricing</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Realtime Cloudflare Sync
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {syncNotice && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncNotice}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Active Extensions ({pricings.length})</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncCloudflare}
              disabled={syncingLive || loading}
              className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
              title="Query Cloudflare Registrar API for real-time wholesale cost rates"
            >
              {syncingLive ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span>{syncingLive ? "Syncing..." : "Sync Live Cloudflare Rates"}</span>
            </button>

            <button
              onClick={() => {
                setIsAddingNew(true);
                setForm({
                  tld: "",
                  cost_price: 10.0,
                  markup: 5.5,
                  selling_price: 15.5,
                  renewal_cost: 10.0,
                  renewal_price: 15.5,
                  provider: "Cloudflare",
                  is_active: true,
                });
              }}
              className="px-3 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Extension</span>
            </button>
          </div>
        </div>

        {/* Add New Form */}
        {isAddingNew && (
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-brand-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white">Add New TLD</h4>
              <button
                onClick={() => setIsAddingNew(false)}
                className="text-gray-400 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs">
              <div>
                <label className="block text-gray-400 mb-1">TLD (e.g. com)</label>
                <input
                  type="text"
                  value={form.tld}
                  onChange={(e) => setForm({ ...form, tld: e.target.value.replace(/^\./, "") })}
                  placeholder="com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Cost ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.cost_price}
                  onChange={(e) => {
                    const cost = parseFloat(e.target.value) || 0;
                    setForm({
                      ...form,
                      cost_price: cost,
                      selling_price: parseFloat((cost + form.markup).toFixed(2)),
                    });
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Markup ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.markup}
                  onChange={(e) => {
                    const markup = parseFloat(e.target.value) || 0;
                    setForm({
                      ...form,
                      markup,
                      selling_price: parseFloat((form.cost_price + markup).toFixed(2)),
                    });
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Selling ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.selling_price}
                  onChange={(e) => setForm({ ...form, selling_price: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Renewal ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.renewal_price}
                  onChange={(e) => setForm({ ...form, renewal_price: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Provider</label>
                <select
                  value={form.provider}
                  onChange={(e) => setForm({ ...form, provider: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-white"
                >
                  <option value="Cloudflare">Cloudflare</option>
                  <option value="LK Domain Registry">LK Domain Registry</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => handleSave(form)}
                disabled={!form.tld || savingTld === form.tld}
                className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs flex items-center gap-2 cursor-pointer"
              >
                {savingTld === form.tld ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save New TLD</span>
              </button>
            </div>
          </div>
        )}

        {/* Pricing Table */}
        <div className="flex-1 overflow-y-auto rounded-2xl border border-white/5 bg-white/[0.01]">
          <table className="w-full text-xs text-left">
            <thead className="bg-white/5 text-gray-400">
              <tr>
                <th className="px-4 py-3">TLD</th>
                <th className="px-4 py-3 text-right">Cost Price</th>
                <th className="px-4 py-3 text-right">Markup</th>
                <th className="px-4 py-3 text-right">Selling Price</th>
                <th className="px-4 py-3 text-right">Renewal Price</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-brand-400" />
                    Loading pricing catalog...
                  </td>
                </tr>
              ) : (
                pricings.map((p) => (
                  <tr key={p.tld} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 font-bold text-white">.{p.tld}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-300">
                      <div className="flex items-center justify-end gap-1.5">
                        <span>${p.cost_price.toFixed(2)}</span>
                        {p.tld.toLowerCase() !== "lk" ? (
                          <span
                            className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"
                            title="Live Realtime Cloudflare Rate"
                          />
                        ) : (
                          <span
                            className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400/80"
                            title="Local Registry Rate"
                          />
                        )}
                      </div>
                      {p.updated_at && (
                        <span className="text-[9px] text-gray-500 block">
                          synced {new Date(p.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-brand-400">+${p.markup.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-400">${p.selling_price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-300">${p.renewal_price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-400">{p.provider || "Cloudflare"}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          const newMarkup = prompt(`Update markup for .${p.tld}:`, String(p.markup));
                          if (newMarkup !== null) {
                            const m = parseFloat(newMarkup) || 0;
                            handleSave({
                              ...p,
                              markup: m,
                              selling_price: parseFloat((p.cost_price + m).toFixed(2)),
                              renewal_price: parseFloat((p.renewal_cost + m).toFixed(2)),
                            });
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-[11px]"
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/**
 * Domain Audit Log Viewer Modal
 */
export function AdminAuditLogsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDomain, setFilterDomain] = useState("");

  const loadLogs = async (domainName?: string) => {
    setLoading(true);
    try {
      const data = await getAdminAuditLogs(domainName || undefined, 80);
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadLogs(filterDomain);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-5xl bg-[#0c0d12] border border-white/10 rounded-3xl shadow-2xl p-6 space-y-6 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-brand-500/10 text-brand-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Domain Operations Audit Log</h3>
              <p className="text-xs text-gray-400">
                Security trail of all domain registrations, DNS updates, transfer locks, and provider calls.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter input */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={filterDomain}
              onChange={(e) => setFilterDomain(e.target.value)}
              placeholder="Filter by domain name..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-400"
            />
          </div>
          <button
            onClick={() => loadLogs(filterDomain)}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>
        </div>

        {/* Log Entries Table */}
        <div className="flex-1 overflow-y-auto rounded-2xl border border-white/5 bg-white/[0.01]">
          <table className="w-full text-xs text-left">
            <thead className="bg-white/5 text-gray-400">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Domain</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-brand-400" />
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-500">
                    No audit records found matching criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-white">{log.userEmail}</td>
                    <td className="px-4 py-3 font-semibold text-brand-400">{log.domainName}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 text-gray-300 border border-white/10">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-gray-400 text-[11px]">
                      {JSON.stringify(log.details)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-[11px]">
                      {log.ipAddress || "system"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

