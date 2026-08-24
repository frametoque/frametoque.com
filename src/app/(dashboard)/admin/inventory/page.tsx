"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, Plus, Edit2, Trash2, X, Loader2, Package, CheckCircle2, Box, Info } from "lucide-react";
import { getInventoryItems, createInventoryItem, updateInventoryItem, deleteInventoryItem } from "../actions/inventory";
import AnimatedNumber from "../components/AnimatedNumber";

const formatLKR = (amount: number) =>
  new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(amount || 0);

const emptyForm = { item_name: '', category: '', serial_number: '', quantity: 1, status: 'Available', purchase_date: '', purchase_price: '', notes: '' };

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getInventoryItems();
      setData(res);
    } catch (e) {
      console.error("Failed to load inventory", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await getInventoryItems();
        if (!cancelled) setData(res);
      } catch (e) {
        console.error("Failed to load inventory", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);


  useEffect(() => {
    const handleSearch = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setSearchTerm(customEvent.detail || "");
    };
    const handleOpenNew = () => {
      setEditingId(null);
      setFormData(emptyForm);
      setIsModalOpen(true);
    };
    window.addEventListener("inventory:search", handleSearch);
    window.addEventListener("inventory:open-new", handleOpenNew);
    return () => {
      window.removeEventListener("inventory:search", handleSearch);
      window.removeEventListener("inventory:open-new", handleOpenNew);
    };
  }, []);

  const openNew = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    setFormData({
      item_name: item.item_name || '',
      category: item.category || '',
      serial_number: item.serial_number || '',
      quantity: item.quantity || 1,
      status: item.status || 'Available',
      purchase_date: item.purchase_date ? new Date(item.purchase_date).toISOString().split('T')[0] : '',
      purchase_price: item.purchase_price || '',
      notes: item.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...formData, quantity: parseInt(formData.quantity.toString()) || 1, purchase_price: parseFloat(formData.purchase_price) || null };
      if (editingId) {
        await updateInventoryItem(editingId, payload);
      } else {
        await createInventoryItem(payload);
      }
      setIsModalOpen(false);
      await loadData();
    } catch (e) {
      console.error(e);
      alert("Failed to save item.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: any) => {
    if (!confirm(`Delete "${item.item_name}"? This cannot be undone.`)) return;
    setDeletingId(item.id);
    try {
      await deleteInventoryItem(item.id, item.item_name);
      await loadData();
    } catch (e) {
      console.error(e);
      alert("Failed to delete item.");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    const lower = searchTerm.toLowerCase();
    return data.filter(d => 
      (d.item_name || '').toLowerCase().includes(lower) ||
      (d.category || '').toLowerCase().includes(lower) ||
      (d.serial_number || '').toLowerCase().includes(lower)
    );
  }, [data, searchTerm]);

  const totalItems = data.length;
  const availableItems = data.filter(d => d.status === 'Available').length;
  const totalValue = data.reduce((acc, curr) => acc + (parseFloat(curr.purchase_price) || 0), 0);
  const categories = new Set(data.map(d => d.category)).size;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-6 flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-white/5 w-14 h-14" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-white/5 rounded-full w-24" />
                <div className="h-6 bg-white/10 rounded-full w-32" />
              </div>
            </div>
          ))}
        </div>
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 animate-pulse space-y-4">
          <div className="h-6 bg-white/10 rounded-full w-48 mb-6" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex justify-between items-center py-4 border-b border-white/5 last:border-0">
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-white/10 rounded-full w-1/3" />
                <div className="h-3 bg-white/5 rounded-full w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex items-center gap-4">
          <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-400">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-gray-400 text-sm font-medium">Total Items</p>
            <p className="text-2xl font-bold mt-1">
              <AnimatedNumber value={totalItems} />
            </p>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex items-center gap-4">
          <div className="p-4 rounded-2xl bg-green-500/10 text-green-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-gray-400 text-sm font-medium">Available</p>
            <p className="text-2xl font-bold mt-1">
              <AnimatedNumber value={availableItems} />
            </p>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex items-center gap-4">
          <div className="p-4 rounded-2xl bg-purple-500/10 text-purple-400">
            <Box className="w-6 h-6" />
          </div>
          <div>
            <p className="text-gray-400 text-sm font-medium">Categories</p>
            <p className="text-2xl font-bold mt-1">
              <AnimatedNumber value={categories} />
            </p>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex items-center gap-4">
          <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-400">
            <Info className="w-6 h-6" />
          </div>
          <div>
            <p className="text-gray-400 text-sm font-medium">Est. Value</p>
            <p className="text-2xl font-bold mt-1 truncate max-w-[120px]">
              {formatLKR(totalValue)}
            </p>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-lg font-semibold">Inventory List</h2>
        </div>
        
        {filteredData.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No inventory items found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="text-left py-4 px-6 font-medium text-gray-400 text-sm">Item</th>
                  <th className="text-left py-4 px-6 font-medium text-gray-400 text-sm">Category</th>
                  <th className="text-left py-4 px-6 font-medium text-gray-400 text-sm">Status</th>
                  <th className="text-left py-4 px-6 font-medium text-gray-400 text-sm hidden sm:table-cell">Purchase Info</th>
                  <th className="text-right py-4 px-6 font-medium text-gray-400 text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item) => {
                  let statusColor = "bg-gray-500/10 text-gray-400 border-gray-500/20";
                  if (item.status === 'Available') statusColor = "bg-green-500/10 text-green-400 border-green-500/20";
                  if (item.status === 'Maintenance') statusColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                  if (item.status === 'Lost') statusColor = "bg-red-500/10 text-red-400 border-red-500/20";
                  if (item.status === 'Broken') statusColor = "bg-red-500/10 text-red-400 border-red-500/20";

                  return (
                    <tr key={item.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-semibold text-white">{item.item_name}</div>
                        {item.serial_number && <div className="text-xs text-gray-400 mt-1">SN: {item.serial_number}</div>}
                        {item.quantity > 1 && <div className="text-xs text-gray-400 mt-0.5">Qty: {item.quantity}</div>}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-300">
                        {item.category}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColor}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-400 hidden sm:table-cell">
                        {item.purchase_date && <div>{new Date(item.purchase_date).toLocaleDateString()}</div>}
                        {item.purchase_price && <div className="text-gray-300">{formatLKR(item.purchase_price)}</div>}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(item)}
                            className="p-2 hover:bg-brand-500/20 text-gray-400 hover:text-brand-400 rounded-xl transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            disabled={deletingId === item.id}
                            className="p-2 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-xl transition-colors"
                            title="Delete"
                          >
                            {deletingId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111111] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
              <h2 className="text-xl font-semibold">{editingId ? 'Edit Item' : 'Add Item'}</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Item Name *</label>
                <input
                  required
                  type="text"
                  value={formData.item_name}
                  onChange={e => setFormData({ ...formData, item_name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"
                  placeholder="e.g. Sony A7IV"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Category *</label>
                  <input
                    required
                    type="text"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"
                    placeholder="e.g. Camera"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Serial Number</label>
                  <input
                    type="text"
                    value={formData.serial_number}
                    onChange={e => setFormData({ ...formData, serial_number: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 text-white"
                  >
                    <option value="Available">Available</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Lost">Lost</option>
                    <option value="Broken">Broken</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Purchase Date</label>
                  <input
                    type="date"
                    value={formData.purchase_date}
                    onChange={e => setFormData({ ...formData, purchase_date: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Purchase Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.purchase_price}
                    onChange={e => setFormData({ ...formData, purchase_price: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 min-h-[100px]"
                  placeholder="Additional details..."
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-brand-500 hover:bg-brand-600 text-white transition-colors disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingId ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
