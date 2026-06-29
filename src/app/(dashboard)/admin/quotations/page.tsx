"use client";

import { useEffect, useState } from "react";
import { Wallet, TrendingUp, Plus, Edit2, Trash2, Eye, Loader2, CheckCircle2, FolderOpen, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  getQuotations, 
  deleteQuotation, 
  confirmQuotation
} from "../actions/actions";

const filters = ["All", "Web dev", "Graphic design", "Video editing", "Photography", "Videography"];

const formatLKR = (amount: number) => {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
  }).format(amount || 0);
};

export default function QuotationsPage() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState("All");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewingReceipt, setViewingReceipt] = useState<any | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [confirmingLoading, setConfirmingLoading] = useState(false);
  const [dateRange, setDateRange] = useState("lifetime");

  // Project name modal state
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [pendingConfirmRow, setPendingConfirmRow] = useState<any | null>(null);
  const [projectNameInput, setProjectNameInput] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getQuotations(dateRange);
      setData(res);
    } catch (e) {
      console.error("Failed to load quotations", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateRange]);

  // Step 1: open modal to ask for project name
  const handleConfirmProject = (quotationId: number, quotationData: any) => {
    setPendingConfirmRow({ id: quotationId, ...quotationData });
    setProjectNameInput(quotationData.desc || "");
    setShowProjectModal(true);
  };

  // Step 2: submit after admin enters project name
  const handleConfirmSubmit = async () => {
    if (!pendingConfirmRow) return;
    if (!projectNameInput.trim()) {
      alert("Please enter a project name.");
      return;
    }
    setConfirmingId(pendingConfirmRow.id);
    setConfirmingLoading(true);
    setShowProjectModal(false);
    try {
      await confirmQuotation(pendingConfirmRow.id, pendingConfirmRow, projectNameInput.trim());
      await loadData();
      alert("Quotation confirmed! Invoice and project have been created.");
    } catch (e) {
      console.error("Failed to confirm quotation", e);
      alert("Failed to confirm quotation");
    } finally {
      setConfirmingLoading(false);
      setConfirmingId(null);
      setPendingConfirmRow(null);
      setProjectNameInput("");
    }
  };

const handleDelete = async (id: number) => {
  const quotation = data.items.find((q: any) => q.id === id);
  const isConfirmed = quotation?.status === 'confirmed';
  const message = isConfirmed
    ? "This quotation has a linked invoice. Deleting it will also delete the invoice. Are you sure?"
    : "Are you sure you want to delete this quotation?";

  if (confirm(message)) {
    try {
      await deleteQuotation(id);
      await loadData();
    } catch (e) {
      console.error("Failed to delete", e);
      alert("Failed to delete quotation");
    }
  }
};

  if (loading || !data) {
    return <div className="p-8 text-center text-gray-400 animate-pulse">Loading quotations data...</div>;
  }

  const stats = [
    { label: "Total Quotations", value: data.items.length.toString(), icon: Wallet, color: "text-blue-400", bg: "bg-blue-400/10" },
    { label: "Confirmed", value: data.confirmedCount.toString(), icon: CheckCircle2, color: "text-green-400", bg: "bg-green-400/10" },
    { label: "Total Value", value: formatLKR(data.totalValue), icon: TrendingUp, color: "text-brand-400", bg: "bg-brand-400/10" },
  ];

  const filteredQuotations = data.items.filter((row: any) => 
    activeFilter === "All" || row.category === activeFilter
  );

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'confirmed': return 'bg-green-500/10 border-green-500/30 text-green-400';
      case 'sent': return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
      case 'draft': return 'bg-gray-500/10 border-gray-500/30 text-gray-400';
      default: return 'bg-gray-500/10 border-gray-500/30 text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">Quotations</h1>
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-brand-500 transition-colors appearance-none cursor-pointer text-sm font-medium"
          >
            <option value="lifetime" className="bg-black">Lifetime</option>
            <option value="this year" className="bg-black">This Year</option>
            <option value="6 months" className="bg-black">Last 6 Months</option>
            <option value="three months" className="bg-black">Last 3 Months</option>
            <option value="one month" className="bg-black">Last Month</option>
          </select>
        </div>
        <Link
          href="/admin/quotations/new"
          className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-3xl font-semibold transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Quotation
        </Link>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeFilter === f 
                ? "bg-white text-black" 
                : "bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 text-sm">
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Amount</th>
                <th className="p-4 font-medium">Client</th>
                <th className="p-4 font-medium">Project</th>
                <th className="p-4 font-medium">Category</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredQuotations.map((row: any) => (
                <tr key={row.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 text-sm">{row.date}</td>
                  <td className="p-4 font-semibold text-blue-400">{formatLKR(row.amount)}</td>
                  <td className="p-4 text-sm">{row.client || '-'}</td>
                  <td className="p-4 text-sm text-gray-300">{row.desc}</td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-white/10 border border-white/10">
                      {row.category}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full border capitalize ${getStatusColor(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="p-4 flex items-center justify-end gap-2">
                    {row.status !== 'confirmed' && (
                      <button 
                        onClick={() => handleConfirmProject(row.id, row)}
                        //disabled={confirmingLoading && confirmingId === row.id}
                        className="p-2 hover:bg-green-400/10 rounded-xl transition-colors text-gray-400 hover:text-green-400 disabled:opacity-50"
                        title="Confirm project & create invoice"
                      >
                        {confirmingLoading && confirmingId === row.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    {row.status === 'confirmed' && (
                      <span className="p-2 text-green-400">
                        <CheckCircle2 className="w-4 h-4" />
                      </span>
                    )}
                    {row.receiptUrl && (
                      <button onClick={() => setViewingReceipt(row)} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-blue-400 hover:text-blue-300">
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      onClick={() => router.push(`/admin/quotations/${row.id}/edit`)}
                      className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed" 
                      disabled={row.status === 'confirmed'}
                      title={row.status === 'confirmed' ? 'Confirmed quotations cannot be edited' : 'Edit quotation'}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(row.id)} 
                      className="p-2 hover:bg-red-400/10 rounded-xl transition-colors text-gray-400 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed" 
                      disabled={row.status === 'confirmed'}
                      title={row.status === 'confirmed' ? 'Confirmed quotations cannot be deleted' : 'Delete quotation'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredQuotations.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-gray-500">No quotations found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Viewer Modal */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={() => setViewingReceipt(null)}>
          <div className="relative flex flex-col md:flex-row bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden max-w-5xl w-full max-h-[90vh] shadow-2xl" onClick={e => e.stopPropagation()}>
            <button className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-white/20 rounded-full text-white transition-colors backdrop-blur-md" onClick={() => setViewingReceipt(null)}>
              ✕
            </button>
            
            <div className="w-full md:w-1/3 bg-white/5 p-6 sm:p-8 flex flex-col gap-6 border-b md:border-b-0 md:border-r border-white/10 overflow-y-auto">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Quotation Details</h3>
                <p className="text-sm text-gray-400">Quote Information</p>
              </div>
              
              <div className="space-y-5">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Amount</p>
                  <p className="text-3xl font-bold text-blue-400">{formatLKR(viewingReceipt.amount)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Date</p>
                  <p className="text-sm font-medium text-white">{viewingReceipt.date}</p>
                </div>
                {viewingReceipt.client && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Client</p>
                    <p className="text-sm font-medium text-white">{viewingReceipt.client}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Category</p>
                  <span className="px-3 py-1 text-xs font-medium rounded-full bg-white/10 border border-white/10 inline-block">
                    {viewingReceipt.category}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Status</p>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full border capitalize inline-block ${getStatusColor(viewingReceipt.status)}`}>
                    {viewingReceipt.status}
                  </span>
                </div>
                {viewingReceipt.desc && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Description</p>
                    <p className="text-sm font-medium text-gray-300">{viewingReceipt.desc}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="w-full md:w-2/3 bg-black/50 flex items-center justify-center p-6 min-h-[300px] overflow-hidden">
              <img 
                src={viewingReceipt.receiptUrl} 
                alt="Quotation Attachment" 
                className="max-w-full max-h-full object-contain rounded-xl shadow-lg border border-white/5"
              />
            </div>
          </div>
        </div>
      )}

      {/* Project Name Modal */}
      {showProjectModal && pendingConfirmRow && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setShowProjectModal(false)}
        >
          <div
            className="relative bg-[#0d0d0d] border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setShowProjectModal(false)}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon + heading */}
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-2xl bg-brand-500/10">
                <FolderOpen className="w-6 h-6 text-brand-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Confirm Quotation</h2>
                <p className="text-sm text-gray-400 mt-0.5">Enter a project name to proceed</p>
              </div>
            </div>

            {/* Quotation summary */}
            <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Client</span>
                <span className="text-white font-medium">{pendingConfirmRow.client || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Quotation</span>
                <span className="text-white font-medium">{pendingConfirmRow.desc || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Amount</span>
                <span className="text-blue-400 font-semibold">{formatLKR(pendingConfirmRow.amount)}</span>
              </div>
            </div>

            {/* Project name input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Project Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={projectNameInput}
                onChange={(e) => setProjectNameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirmSubmit()}
                placeholder="e.g. Company Website Redesign"
                autoFocus
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-brand-500 focus:bg-white/8 transition-colors text-sm"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowProjectModal(false)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSubmit}
                disabled={!projectNameInput.trim()}
                className="flex-1 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors text-sm font-semibold flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirm & Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}