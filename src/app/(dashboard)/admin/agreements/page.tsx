"use client";

import { useState, useEffect, useMemo } from "react";
import useSWR from 'swr';
import {
  FilePenLine, Plus, Eye, Download, Trash2, Edit2,
  Clock, CheckCircle2, AlertCircle, X,
  Loader2, User, Calendar, Tag, FileText
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  getAgreements, 
  deleteAgreement, 
  AgreementData 
} from "../actions/agreements";
import AnimatedNumber from "../components/AnimatedNumber";
import WebDevAgreementPDF from "@/components/WebDevAgreementPDF";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  signed:  { label: "Signed",  color: "text-green-400 bg-green-400/10 border-green-400/20",  icon: CheckCircle2 },
  pending: { label: "Pending", color: "text-amber-400 bg-amber-400/10 border-amber-400/20",  icon: AlertCircle },
  expired: { label: "Expired", color: "text-red-400 bg-red-400/10 border-red-400/20",       icon: X },
  draft:   { label: "Draft",   color: "text-gray-400 bg-gray-400/10 border-gray-400/20",    icon: FileText },
};

const agreementTypes = ["All Types", "Service Agreement", "Web Development Agreement"];
const statusFilters = ["All", "signed", "pending", "expired", "draft"];

const formatLKR = (amount: number) =>
  new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR" }).format(amount || 0);

const formatDate = (d: string) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

export default function AgreementsPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [exportingId, setExportingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  const fetcher = async () => {
    const data = await getAgreements();
    return { agreements: data };
  };

  const { data: swrData, isLoading: loading, mutate } = useSWR(['admin-agreements'], fetcher);
  const { agreements = [] } = swrData || {};

  // Derived stats
  const { totalValue, activeCount, pendingCount, expiredCount } = useMemo(() => ({
    totalValue: agreements.filter(a => a.status === "signed").reduce((s, a) => s + (a.total_fee || 0), 0),
    activeCount: agreements.filter(a => a.status === "signed").length,
    pendingCount: agreements.filter(a => a.status === "pending").length,
    expiredCount: agreements.filter(a => a.status === "expired").length,
  }), [agreements]);

  const stats = [
    { label: "Signed Agreements", value: activeCount.toString(), icon: CheckCircle2, color: "text-green-400", bg: "bg-green-400/10" },
    { label: "Pending Signature", value: pendingCount.toString(), icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-400/10" },
    { label: "Expired", value: expiredCount.toString(), icon: X, color: "text-red-400", bg: "bg-red-400/10" },
    { label: "Total Signed Value", value: formatLKR(totalValue), icon: FilePenLine, color: "text-brand-400", bg: "bg-brand-400/10" },
  ];

  const filtered = agreements.filter((a) => {
    const matchStatus = statusFilter === "All" || a.status === statusFilter;
    const matchType   = typeFilter === "All Types" || a.agreement_type === typeFilter;
    return matchStatus && matchType;
  });

  const viewing = agreements.find(a => a.id === viewingId) || null;

  const handleDelete = async (id: number) => {
    if (confirm("Delete this agreement? This cannot be undone.")) {
      setIsDeleting(id);
      try {
        await deleteAgreement(id);
        mutate();
        if (viewingId === id) setViewingId(null);
      } catch (error) {
        alert("Failed to delete agreement.");
      } finally {
        setIsDeleting(null);
      }
    }
  };

  const handleExportPDF = (id: number) => {
    setExportingId(id);
    // Timeout to allow DOM rendering of hidden PDF generator if needed
    setTimeout(() => {
      if ((window as any).triggerAgreementDownload) {
        (window as any).triggerAgreementDownload();
      }
      setExportingId(null);
    }, 500);
  };

  return (
    <div className="space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex items-center gap-4 hover:bg-white/10 transition-colors">
            <div className={`p-4 rounded-2xl ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-gray-400 text-sm">{stat.label}</p>
              <p className="text-2xl font-semibold">
                <AnimatedNumber value={stat.value} />
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Status pills */}
          <div className="flex flex-wrap gap-2">
            {statusFilters.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors capitalize ${
                  statusFilter === s
                    ? "bg-white text-black"
                    : "bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"
                }`}
              >
                {s === "All" ? "All Statuses" : (statusConfig[s]?.label ?? s)}
              </button>
            ))}
          </div>
          {/* Type dropdown */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-brand-500 transition-colors appearance-none cursor-pointer text-sm font-medium"
          >
            {agreementTypes.map(t => <option key={t} value={t} className="bg-black">{t}</option>)}
          </select>
        </div>

        <Link
          href="/admin/agreements/new"
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-3xl font-semibold transition-colors w-full sm:w-auto self-end lg:self-auto"
        >
          <Plus className="w-5 h-5" />
          New Agreement
        </Link>
      </div>

      {/* Table */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-12 text-gray-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
            <span>Loading agreements...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 text-sm">
                  <th className="p-4 font-medium">Agreement Title</th>
                  <th className="p-4 font-medium">Client</th>
                  <th className="p-4 font-medium">Type</th>
                  <th className="p-4 font-medium">Timeline</th>
                  <th className="p-4 font-medium">Fee</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((row) => {
                  const sc = statusConfig[row.status] || statusConfig.draft;
                  const StatusIcon = sc.icon;
                  return (
                    <tr key={row.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <p className="font-semibold text-sm text-white">{row.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Created {formatDate(row.created_at || "")}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-medium">{row.client_name}</p>
                        <p className="text-xs text-gray-500">{row.client_email}</p>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-white/10 border border-white/10 text-brand-400 border-brand-400/20">
                          {row.agreement_type}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-300">
                        <p>{formatDate(row.start_date)}</p>
                        <p className="text-xs text-gray-500">→ {formatDate(row.delivery_date)}</p>
                      </td>
                      <td className="p-4 text-sm font-semibold text-brand-400">{formatLKR(row.total_fee)}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full border ${sc.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {sc.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setViewingId(row.id!)}
                            className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <Link
                            href={`/admin/agreements/${row.id}/edit`}
                            className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(row.id!)}
                            disabled={isDeleting === row.id}
                            className="p-2 hover:bg-red-400/10 rounded-xl transition-colors text-gray-400 hover:text-red-400 disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-gray-500">No agreements found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── View / Detail Modal ───────────────────────────────────────────────── */}
      {viewing && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setViewingId(null)}
        >
          <div
            className="bg-black border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-white/10">
              <div>
                <h2 className="text-xl font-bold text-white">{viewing.title}</h2>
                <span className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1 text-xs font-bold rounded-full border ${statusConfig[viewing.status]?.color}`}>
                  {(() => { const Icon = statusConfig[viewing.status]?.icon; return Icon ? <Icon className="w-3 h-3" /> : null; })()}
                  {statusConfig[viewing.status]?.label}
                </span>
              </div>
              <button onClick={() => setViewingId(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Details */}
            <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-4 h-4 text-gray-500" />
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Client</p>
                  </div>
                  <p className="text-sm font-semibold text-white">{viewing.client_name}</p>
                  <p className="text-xs text-gray-400">{viewing.client_email}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-2 mb-1">
                    <Tag className="w-4 h-4 text-gray-500" />
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Type</p>
                  </div>
                  <p className="text-sm font-semibold text-white">{viewing.agreement_type}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Period</p>
                  </div>
                  <p className="text-sm font-semibold text-white">{formatDate(viewing.start_date)}</p>
                  <p className="text-xs text-gray-400">→ {formatDate(viewing.delivery_date)}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-2 mb-1">
                    <FilePenLine className="w-4 h-4 text-gray-500" />
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total Fee</p>
                  </div>
                  <p className="text-xl font-bold text-brand-400">{formatLKR(viewing.total_fee)}</p>
                </div>
              </div>

              {/* Extra Web Dev specific details */}
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2.5">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Agreed Terms Summary</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
                  <p>Deposit: <span className="font-semibold text-white">{formatLKR(viewing.deposit)}</span></p>
                  <p>UI Stage: <span className="font-semibold text-white">{formatLKR(viewing.ui_payment)}</span></p>
                  <p>Final Stage: <span className="font-semibold text-white">{formatLKR(viewing.final_payment)}</span></p>
                  <p>Revisions: <span className="font-semibold text-white">{viewing.revision_rounds} Rounds</span></p>
                  <p className="col-span-2">Hosting: <span className="font-semibold text-white">{viewing.hosting_preference}</span></p>
                  <p className="col-span-2">Representative: <span className="font-semibold text-white">{viewing.representative_name}</span></p>
                </div>
              </div>

              {viewing.status === "signed" && (
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Client Signature Details</p>
                  <p className="text-xs text-gray-300">Signed By: <span className="font-semibold text-white">{viewing.client_sig_name}</span></p>
                  <p className="text-xs text-gray-300">Signed On: <span className="font-semibold text-white">{formatDate(viewing.client_sig_date || "")}</span></p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-white/10 bg-white/5 flex justify-between items-center">
              <button
                onClick={() => handleDelete(viewing.id!)}
                disabled={isDeleting === viewing.id}
                className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-400/10 rounded-full text-sm font-medium transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleExportPDF(viewing.id!)}
                  disabled={exportingId === viewing.id}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-full text-sm font-medium transition-colors text-white disabled:opacity-50"
                >
                  {exportingId === viewing.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {exportingId === viewing.id ? "Exporting..." : "Export PDF"}
                </button>
                <Link
                  href={`/admin/agreements/${viewing.id}/edit`}
                  className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-full text-sm font-medium transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden container for triggering PDF downloads of selected viewing agreement */}
      {viewing && (
        <WebDevAgreementPDF 
          agreement={viewing} 
          onDownloadStart={() => {}}
          onDownloadEnd={() => {}}
        />
      )}
    </div>
  );
}