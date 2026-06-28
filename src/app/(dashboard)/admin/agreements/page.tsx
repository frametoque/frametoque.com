"use client";

import { useState } from "react";
import {
  FilePenLine, Plus, Eye, Download, Trash2, Edit2,
  Clock, CheckCircle2, XCircle, AlertCircle, X,
  Loader2, User, Calendar, Tag, FileText
} from "lucide-react";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mockAgreements = [
  {
    id: 1,
    title: "Web Development Agreement",
    client: "Ashen Perera",
    clientEmail: "ashen@example.com",
    type: "Service Agreement",
    status: "signed",
    startDate: "2025-01-10",
    endDate: "2025-06-10",
    value: 450000,
    notes: "Full website redesign and development for Ashen's e-commerce brand.",
    createdAt: "2025-01-08",
  },
  {
    id: 2,
    title: "Brand Identity Package",
    client: "Sahan Wijesinghe",
    clientEmail: "sahan@creativeco.lk",
    type: "Design Contract",
    status: "pending",
    startDate: "2025-03-01",
    endDate: "2025-04-30",
    value: 180000,
    notes: "Logo, brand guide, stationery design.",
    createdAt: "2025-02-20",
  },
  {
    id: 3,
    title: "Video Production — Q2 Campaign",
    client: "Nimasha Rodrigo",
    clientEmail: "nimasha@brand.lk",
    type: "Production Agreement",
    status: "active",
    startDate: "2025-04-01",
    endDate: "2025-05-31",
    value: 320000,
    notes: "3 promotional videos for social media campaigns.",
    createdAt: "2025-03-28",
  },
  {
    id: 4,
    title: "Photography Retainer",
    client: "Kavindi Fonseka",
    clientEmail: "kav@fonseka.com",
    type: "Retainer Agreement",
    status: "expired",
    startDate: "2024-07-01",
    endDate: "2024-12-31",
    value: 240000,
    notes: "Monthly product photography sessions.",
    createdAt: "2024-06-25",
  },
  {
    id: 5,
    title: "SEO & Web Analytics Consulting",
    client: "Dilshan Mendis",
    clientEmail: "dilshan@techsol.lk",
    type: "Consulting Agreement",
    status: "draft",
    startDate: "2025-06-01",
    endDate: "2025-08-31",
    value: 135000,
    notes: "Three-month SEO and analytics consulting engagement.",
    createdAt: "2025-05-30",
  },
];

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  signed:  { label: "Signed",  color: "text-green-400 bg-green-400/10 border-green-400/20",  icon: CheckCircle2 },
  active:  { label: "Active",  color: "text-brand-400 bg-brand-400/10 border-brand-400/20",  icon: Clock },
  pending: { label: "Pending", color: "text-amber-400 bg-amber-400/10 border-amber-400/20",  icon: AlertCircle },
  expired: { label: "Expired", color: "text-red-400 bg-red-400/10 border-red-400/20",       icon: XCircle },
  draft:   { label: "Draft",   color: "text-gray-400 bg-gray-400/10 border-gray-400/20",    icon: FileText },
};

const agreementTypes = ["All Types", "Service Agreement", "Design Contract", "Production Agreement", "Retainer Agreement", "Consulting Agreement"];
const statusFilters = ["All", "signed", "active", "pending", "expired", "draft"];

const formatLKR = (amount: number) =>
  new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR" }).format(amount || 0);

const formatDate = (d: string) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

// ─── Blank Form ───────────────────────────────────────────────────────────────

const blankForm = {
  title: "",
  client: "",
  clientEmail: "",
  type: "Service Agreement",
  status: "draft",
  startDate: new Date().toISOString().split("T")[0],
  endDate: "",
  value: "",
  notes: "",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AgreementsPage() {
  const [agreements, setAgreements] = useState(mockAgreements);
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<any>(blankForm);

  // Derived
  const totalValue = agreements.filter(a => a.status !== "expired" && a.status !== "draft").reduce((s, a) => s + a.value, 0);
  const activeCount = agreements.filter(a => a.status === "active" || a.status === "signed").length;
  const pendingCount = agreements.filter(a => a.status === "pending").length;
  const expiredCount = agreements.filter(a => a.status === "expired").length;

  const stats = [
    { label: "Active Agreements", value: activeCount.toString(), icon: CheckCircle2, color: "text-green-400", bg: "bg-green-400/10" },
    { label: "Pending Signature", value: pendingCount.toString(), icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-400/10" },
    { label: "Expired", value: expiredCount.toString(), icon: XCircle, color: "text-red-400", bg: "bg-red-400/10" },
    { label: "Total Contract Value", value: formatLKR(totalValue), icon: FilePenLine, color: "text-brand-400", bg: "bg-brand-400/10" },
  ];

  const filtered = agreements.filter((a) => {
    const matchStatus = statusFilter === "All" || a.status === statusFilter;
    const matchType   = typeFilter === "All Types" || a.type === typeFilter;
    return matchStatus && matchType;
  });

  const viewing = agreements.find(a => a.id === viewingId) || null;

  const openNew = () => {
    setEditingId(null);
    setFormData(blankForm);
    setIsModalOpen(true);
  };

  const openEdit = (a: any) => {
    setEditingId(a.id);
    setFormData({
      title: a.title,
      client: a.client,
      clientEmail: a.clientEmail,
      type: a.type,
      status: a.status,
      startDate: a.startDate,
      endDate: a.endDate,
      value: a.value.toString(),
      notes: a.notes,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 700)); // simulate async
    if (editingId) {
      setAgreements(prev => prev.map(a =>
        a.id === editingId
          ? { ...a, ...formData, value: parseFloat(formData.value) || 0 }
          : a
      ));
    } else {
      setAgreements(prev => [
        ...prev,
        {
          id: Date.now(),
          ...formData,
          value: parseFloat(formData.value) || 0,
          createdAt: new Date().toISOString().split("T")[0],
        },
      ]);
    }
    setSaving(false);
    setIsModalOpen(false);
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this agreement? This cannot be undone.")) {
      setAgreements(prev => prev.filter(a => a.id !== id));
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold">Agreements</h1>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-3xl font-semibold transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Agreement
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex items-center gap-4 hover:bg-white/10 transition-colors">
            <div className={`p-4 rounded-2xl ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-gray-400 text-sm">{stat.label}</p>
              <p className="text-2xl font-semibold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
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
          className="ml-auto bg-white/5 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-brand-500 transition-colors appearance-none cursor-pointer text-sm font-medium"
        >
          {agreementTypes.map(t => <option key={t} value={t} className="bg-black">{t}</option>)}
        </select>
      </div>

      {/* Table */}
      {/* <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 text-sm">
                <th className="p-4 font-medium">Agreement</th>
                <th className="p-4 font-medium">Client</th>
                <th className="p-4 font-medium">Type</th>
                <th className="p-4 font-medium">Period</th>
                <th className="p-4 font-medium">Value</th>
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
                      <p className="text-xs text-gray-500 mt-0.5">Created {formatDate(row.createdAt)}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm font-medium">{row.client}</p>
                      <p className="text-xs text-gray-500">{row.clientEmail}</p>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-white/10 border border-white/10">
                        {row.type}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-300">
                      <p>{formatDate(row.startDate)}</p>
                      <p className="text-xs text-gray-500">→ {formatDate(row.endDate)}</p>
                    </td>
                    <td className="p-4 text-sm font-semibold text-brand-400">{formatLKR(row.value)}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full border ${sc.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {sc.label}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setViewingId(row.id)}
                          className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(row)}
                          className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(row.id)}
                          className="p-2 hover:bg-red-400/10 rounded-xl transition-colors text-gray-400 hover:text-red-400"
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
      </div> */}

      {/* ── Create / Edit Modal ───────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-black border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-semibold">{editingId ? "Edit Agreement" : "New Agreement"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-sm text-gray-400">Agreement Title</label>
                <input
                  type="text"
                  placeholder="e.g. Web Development Agreement"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">Client Name</label>
                  <input
                    type="text"
                    placeholder="Full name"
                    value={formData.client}
                    onChange={e => setFormData({ ...formData, client: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">Client Email</label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={formData.clientEmail}
                    onChange={e => setFormData({ ...formData, clientEmail: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">Agreement Type</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors appearance-none"
                  >
                    {agreementTypes.filter(t => t !== "All Types").map(t => (
                      <option key={t} value={t} className="bg-black">{t}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors appearance-none"
                  >
                    {statusFilters.filter(s => s !== "All").map(s => (
                      <option key={s} value={s} className="bg-black capitalize">{statusConfig[s]?.label ?? s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm text-gray-400">Contract Value (LKR)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={formData.value}
                  onChange={e => setFormData({ ...formData, value: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm text-gray-400">Notes</label>
                <textarea
                  rows={3}
                  placeholder="Scope of work, terms, or any relevant notes..."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-white/5">
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={saving}
                className="px-6 py-2.5 rounded-full font-medium hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-full font-medium transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? "Saving..." : editingId ? "Update Agreement" : "Save Agreement"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View / Detail Modal ───────────────────────────────────────────────── */}
      {viewing && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setViewingId(null)}
        >
          <div
            className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
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
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-4 h-4 text-gray-500" />
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Client</p>
                  </div>
                  <p className="text-sm font-semibold text-white">{viewing.client}</p>
                  <p className="text-xs text-gray-400">{viewing.clientEmail}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-2 mb-1">
                    <Tag className="w-4 h-4 text-gray-500" />
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Type</p>
                  </div>
                  <p className="text-sm font-semibold text-white">{viewing.type}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Period</p>
                  </div>
                  <p className="text-sm font-semibold text-white">{formatDate(viewing.startDate)}</p>
                  <p className="text-xs text-gray-400">→ {formatDate(viewing.endDate)}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-2 mb-1">
                    <FilePenLine className="w-4 h-4 text-gray-500" />
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Value</p>
                  </div>
                  <p className="text-2xl font-bold text-brand-400">{formatLKR(viewing.value)}</p>
                </div>
              </div>

              {viewing.notes && (
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Notes</p>
                  <p className="text-sm text-gray-300 leading-relaxed">{viewing.notes}</p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-white/10 bg-white/5 flex justify-between items-center">
              <button
                onClick={() => { setViewingId(null); handleDelete(viewing.id); }}
                className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-400/10 rounded-full text-sm font-medium transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
              <div className="flex gap-2">
                <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-full text-sm font-medium transition-colors">
                  <Download className="w-4 h-4" />
                  Export PDF
                </button>
                <button
                  onClick={() => { setViewingId(null); openEdit(viewing); }}
                  className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-full text-sm font-medium transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}