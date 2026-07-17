"use client";

import { useEffect, useState } from "react";
import { Receipt, Calendar, CreditCard, Plus, Edit2, Trash2, X, UploadCloud, Loader2, Eye, RefreshCw } from "lucide-react";
import { 
  getExpenses, createExpense, deleteExpense, updateExpense, uploadReceipt,
  getScheduledExpenses, deleteScheduledExpense
} from "../actions/actions";
import { useAdminDateRange } from "../context/AdminDateRangeContext";

const filters = ["All", "Software", "Equipment", "Freelancers", "Transport", "Other"];

const formatLKR = (amount: number) => {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0);
};

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

export default function ExpensesPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Data loading state
  const [data, setData] = useState<any>(null);
  const [scheduledExpenses, setScheduledExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Date context
  const { startDate, endDate } = useAdminDateRange();
  
  // Receipt processing state
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [convertingPdf, setConvertingPdf] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<any | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    description: '',
    category: filters[1],
    paymentMethod: 'Corporate Card',
    receiptUrl: '',
    isScheduled: false,
    frequency: 'monthly'
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [res, schedRes] = await Promise.all([
        getExpenses(startDate, endDate),
        getScheduledExpenses().catch(() => [])
      ]);
      setData(res);
      setScheduledExpenses(schedRes);
    } catch (e) {
      console.error("Failed to load expenses data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  // Handle actual expense save
  const handleSave = async () => {
    setSaving(true);
    try {
      let uploadedUrl = formData.receiptUrl;
      if (receiptFile) {
        const fileData = new FormData();
        fileData.append('file', receiptFile);
        uploadedUrl = await uploadReceipt(fileData, 'expenses');
      }

      const payload = { 
        ...formData, 
        amount: parseFloat(formData.amount) || 0, 
        receiptUrl: uploadedUrl 
      };
      if (editingId) {
        await updateExpense(editingId, payload);
      } else {
        await createExpense(payload);
      }
      setIsModalOpen(false);
      setEditingId(null);
      setReceiptFile(null);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        description: '',
        category: filters[1],
        paymentMethod: 'Corporate Card',
        receiptUrl: '',
        isScheduled: false,
        frequency: 'monthly'
      });
      await loadData();
    } catch (e) {
      console.error(e);
      alert("Failed to save expense");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (row: any) => {
    let formattedDate = new Date().toISOString().split('T')[0];
    try { if (row.date) formattedDate = new Date(row.date).toISOString().split('T')[0]; } catch(e) {}
    
    setEditingId(row.id);
    setFormData({
      date: formattedDate,
      amount: row.amount.toString(),
      description: row.desc || '',
      category: row.category || filters[1],
      paymentMethod: row.paidVia || 'Corporate Card',
      receiptUrl: row.receiptUrl || '',
      isScheduled: false,
      frequency: 'monthly'
    });
    setReceiptFile(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this record?")) {
      try {
        await deleteExpense(id);
        await loadData();
      } catch (e) {
        console.error("Failed to delete", e);
      }
    }
  };

  const handleDeleteScheduled = async (id: number) => {
    if (confirm("Stop and delete this recurring expense schedule? Future auto-transactions for this schedule will be disabled.")) {
      try {
        await deleteScheduledExpense(id);
        await loadData();
      } catch (e) {
        console.error("Failed to delete scheduled expense", e);
      }
    }
  };

  if (loading || !data) {
    return <div className="p-8 text-center text-gray-400 animate-pulse">Loading expenses data...</div>;
  }

  const stats = [
    { label: "This Month", value: formatLKR(data.thisMonth), icon: Receipt, color: "text-red-400", bg: "bg-red-400/10" },
    { label: "Last Month", value: formatLKR(data.lastMonth), icon: Calendar, color: "text-blue-400", bg: "bg-blue-400/10" },
    { label: "Year to Date", value: formatLKR(data.ytd), icon: CreditCard, color: "text-brand-400", bg: "bg-brand-400/10" },
  ];

  const filteredExpenses = data.items.filter((row: any) => 
    activeFilter === "All" || row.category === activeFilter
  );

  return (
    <div className="space-y-6">
      
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

      {/* Active Recurring Schedules Panel */}
      {scheduledExpenses.length > 0 && (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-indigo-400">
            <RefreshCw className="w-5 h-5 animate-[spin_10s_linear_infinite]" />
            <h2 className="text-lg font-semibold text-white">Active Recurring Schedules</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scheduledExpenses.map((item) => (
              <div key={item.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <p className="font-semibold text-sm text-white truncate">{item.title}</p>
                  <p className="text-xs text-gray-400">
                    {formatLKR(item.amount)} • <span className="capitalize">{item.frequency}</span>
                  </p>
                  <p className="text-[10px] text-indigo-300">Next Auto-Pay: {item.next_due_date}</p>
                </div>
                <button
                  onClick={() => handleDeleteScheduled(item.id)}
                  className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl transition-all cursor-pointer flex-shrink-0"
                  title="Remove Schedule"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                activeFilter === f 
                  ? "bg-white text-black" 
                  : "bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <button 
          onClick={() => {
            setEditingId(null);
            setFormData({
              date: new Date().toISOString().split('T')[0],
              amount: '',
              description: '',
              category: filters[1],
              paymentMethod: 'Corporate Card',
              receiptUrl: '',
              isScheduled: false,
              frequency: 'monthly'
            });
            setReceiptFile(null);
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-3xl font-semibold transition-colors cursor-pointer w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          Record Expense
        </button>
      </div>

      {/* Expenses History Table */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 text-sm">
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Amount</th>
                <th className="p-4 font-medium">Description</th>
                <th className="p-4 font-medium w-36">Category</th>
                <th className="p-4 font-medium">Paid via</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredExpenses.map((row: any) => (
                <tr key={row.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 text-sm">{row.date}</td>
                  <td className="p-4 font-semibold text-red-400">{formatLKR(row.amount)}</td>
                  <td className="p-4 text-sm text-gray-300">{row.desc}</td>
                  <td className="p-4 w-36">
                    <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-white/10 border border-white/10 whitespace-nowrap block max-w-[120px] truncate text-center">
                      {row.category}
                    </span>
                  </td>
                  <td className="p-4 text-sm">{row.paidVia}</td>
                  <td className="p-4 flex items-center justify-end gap-2">
                    {row.receiptUrl && (
                      <button onClick={() => setViewingReceipt(row)} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-blue-400 hover:text-blue-300 cursor-pointer">
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => handleEdit(row)} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white cursor-pointer">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(row.id)} className="p-2 hover:bg-red-400/10 rounded-xl transition-colors text-gray-400 hover:text-red-400 cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-500">No expense records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Expense Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-black border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-semibold">{editingId ? 'Edit Expense' : 'Record Expense'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
             <div className="p-6 space-y-4">
              {/* Recurring / Scheduled Switch Toggle - ONLY show on creating new expense */}
              {!editingId && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                    <div>
                      <p className="text-sm font-semibold text-white">Mark as Scheduled Recurring Expense</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, isScheduled: !formData.isScheduled})}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        formData.isScheduled ? "bg-brand-500" : "bg-white/10"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          formData.isScheduled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                  {formData.isScheduled && (
                    <div className="grid grid-cols-2 gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl animate-fade-in">
                      <div className="space-y-1">
                        <label className="text-xs text-gray-400 font-semibold uppercase">Repeat Interval</label>
                        <select 
                          value={formData.frequency} 
                          onChange={e => setFormData({...formData, frequency: e.target.value})}
                          className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-500 transition-colors appearance-none cursor-pointer"
                        >
                          <option value="weekly" className="bg-black">Every Week</option>
                          <option value="monthly" className="bg-black">Every Month</option>
                          <option value="yearly" className="bg-black">Every Year</option>
                        </select>
                      </div>
                      <div className="flex items-end text-xs text-gray-400 pb-2">
                        Next transaction date will calculate from the selected expense date.
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">Date</label>
                  <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">Amount (LKR)</label>
                  <input type="number" placeholder="0.00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-gray-400">Description</label>
                <input type="text" placeholder="What was this expense for?" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">Category</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors appearance-none">
                    {filters.filter(f => f !== "All").map(f => <option key={f} value={f} className="bg-black">{f}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">Payment Method</label>
                  <select value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors appearance-none">
                    <option className="bg-black">Corporate Card</option>
                    <option className="bg-black">Bank Transfer</option>
                    <option className="bg-black">Personal Card</option>
                    <option className="bg-black">Cash</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm text-gray-400">
                  {convertingPdf ? "Processing PDF..." : "Receipt Image / PDF"}
                </label>
                <input 
                  type="file" 
                  accept="image/*,application/pdf" 
                  disabled={convertingPdf}
                  onChange={async (e) => {
                    const selected = e.target.files?.[0];
                    if (!selected) {
                      setReceiptFile(null);
                      return;
                    }
                    if (selected.type === "application/pdf") {
                      setConvertingPdf(true);
                      try {
                        const imgFile = await convertPdfToImage(selected);
                        setReceiptFile(imgFile);
                      } catch (err) {
                        console.error(err);
                        alert("Failed to convert PDF to image. Please upload a normal image.");
                      } finally {
                        setConvertingPdf(false);
                      }
                    } else {
                      setReceiptFile(selected);
                    }
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-brand-500 transition-colors text-sm disabled:opacity-50" 
                />
                {convertingPdf && (
                  <p className="text-xs text-brand-400 animate-pulse px-2">Converting PDF to Image...</p>
                )}
                {formData.receiptUrl && !receiptFile && (
                  <div className="flex items-center gap-3 mt-1 px-2">
                    <a href={formData.receiptUrl} target="_blank" className="text-xs text-blue-400 underline">View current receipt</a>
                    <button 
                      type="button"
                      onClick={() => setFormData({ ...formData, receiptUrl: '' })}
                      className="text-xs text-red-400 hover:text-red-300 font-semibold cursor-pointer"
                    >
                      Delete current image
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-white/5">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-full font-medium hover:bg-white/10 transition-colors cursor-pointer" disabled={saving || convertingPdf}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving || convertingPdf} className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-full font-medium transition-colors disabled:opacity-50 cursor-pointer">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? "Saving..." : (editingId ? "Update Expense" : "Save Expense")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Viewing Receipt Image Modal */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={() => setViewingReceipt(null)}>
          <div className="relative flex flex-col md:flex-row bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden max-w-5xl w-full max-h-[90vh] shadow-2xl" onClick={e => e.stopPropagation()}>
            <button className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-white/20 rounded-full text-white transition-colors backdrop-blur-md cursor-pointer" onClick={() => setViewingReceipt(null)}>
              <X className="w-5 h-5" />
            </button>
            
            <div className="w-full md:w-1/3 bg-white/5 p-6 sm:p-8 flex flex-col gap-6 border-b md:border-b-0 md:border-r border-white/10 overflow-y-auto">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Receipt Details</h3>
                <p className="text-sm text-gray-400">Transaction Information</p>
              </div>
              
              <div className="space-y-5">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Amount</p>
                  <p className="text-3xl font-bold text-red-400">{formatLKR(viewingReceipt.amount)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Date</p>
                  <p className="text-sm font-medium text-white">{viewingReceipt.date}</p>
                </div>
                {viewingReceipt.paidVia && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Paid Via</p>
                    <p className="text-sm font-medium text-white">{viewingReceipt.paidVia}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Category</p>
                  <span className="px-3 py-1 text-xs font-medium rounded-full bg-white/10 border border-white/10 inline-block">
                    {viewingReceipt.category}
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
                alt="Receipt" 
                className="max-w-full max-h-full object-contain rounded-xl shadow-lg border border-white/5"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
