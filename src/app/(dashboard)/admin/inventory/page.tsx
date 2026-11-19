"use client";

import { useEffect, useState, useMemo } from "react";
import useSWR from 'swr';
import { 
  Search, Plus, Edit2, Trash2, X, Loader2, Package, CheckCircle2, 
  Info, Download, FileText, Eye, Upload, Link2, 
  Check, ExternalLink, Clock, ShoppingCart, AlertCircle, GripVertical,
  Repeat
} from "lucide-react";
import Link from "next/link";
import { 
  getInventoryItems, createInventoryItem, updateInventoryItem, 
  deleteInventoryItem, uploadInventoryDocument, getExpensesForLinking,
  createToBuyItem, reorderToBuyItems
} from "../actions/inventory";
import AnimatedNumber from "../components/AnimatedNumber";
import CategoryPicker from "../components/CategoryPicker";

const parseCategories = (catStr: string | null | undefined): string[] => {
  if (!catStr) return [];
  return catStr.split(',').map(s => s.trim()).filter(Boolean);
};

const DEFAULT_INVENTORY_CATEGORIES = [
  "Camera", "Lens", "Lighting", "Audio", "Drone", "Gimbal", "Accessories", "Equipment"
];

const formatLKR = (amount: number) =>
  new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(amount || 0);

const R2_PUBLIC_BASE = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "").replace(/\/+$/, "");

function extractStoragePath(urlOrPath: string): string {
  if (!urlOrPath) return "";
  try {
    if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) {
      const parsed = new URL(urlOrPath);
      return parsed.pathname.replace(/^\/+/, "");
    }
  } catch {}
  return urlOrPath.replace(/^\/+/, "");
}

function getMediaCandidates(rawUrl: string): string[] {
  if (!rawUrl) return [];
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) return [trimmed];

  const key = extractStoragePath(trimmed);
  const candidates: string[] = [];

  // 1. Direct Cloudflare R2 URL
  if (key) {
    candidates.push(`${R2_PUBLIC_BASE}/${key}`);
  }

  // 2. Server-side /api/media proxy with S3 / R2 credentials
  if (key) {
    candidates.push(`/api/media/${key}`);
  }
  candidates.push(`/api/media?url=${encodeURIComponent(trimmed)}`);

  // 3. Original raw URL
  candidates.push(trimmed);

  return Array.from(new Set(candidates.filter(Boolean)));
}

function DocumentPreview({ url, title }: { url: string; title: string }) {
  const candidates = useMemo(() => getMediaCandidates(url), [url]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const isPdf = Boolean(
    url.toLowerCase().includes('.pdf') ||
    url.toLowerCase().includes('/pdf') ||
    url.startsWith('data:application/pdf')
  );

  useEffect(() => {
    setCandidateIndex(0);
    setLoading(true);
  }, [url]);

  const currentSrc = candidates[candidateIndex] || url;

  const handleImageError = () => {
    if (candidateIndex + 1 < candidates.length) {
      setCandidateIndex(prev => prev + 1);
    } else {
      setLoading(false);
    }
  };

  if (isPdf) {
    return (
      <div className="w-full h-full min-h-[60vh] flex flex-col items-center justify-center relative">
        <object
          data={currentSrc}
          type="application/pdf"
          className="w-full h-full min-h-[60vh] rounded-xl border border-white/10"
        >
          <div className="flex flex-col items-center justify-center p-8 text-center bg-white/[0.02] border border-white/10 rounded-2xl max-w-md mx-auto">
            <FileText className="w-12 h-12 text-brand-400 mb-3" />
            <p className="text-sm font-semibold text-white mb-1">{title} (PDF)</p>
            <p className="text-xs text-gray-400 mb-4">Click below to open or download the PDF invoice.</p>
            <div className="flex items-center gap-2">
              <a
                href={currentSrc}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-medium transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open in New Tab
              </a>
              <a
                href={currentSrc}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </a>
            </div>
          </div>
        </object>
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-center w-full h-full min-h-[300px]">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-7 h-7 text-brand-400 animate-spin" />
        </div>
      )}
      <img
        src={currentSrc}
        alt={title}
        onLoad={() => setLoading(false)}
        onError={handleImageError}
        className={`max-w-full max-h-[70vh] object-contain rounded-xl shadow-lg transition-opacity duration-300 ${
          loading ? 'opacity-0' : 'opacity-100'
        }`}
      />
    </div>
  );
}

const emptyForm = { item_name: '', category: '', serial_number: '', quantity: 1, status: 'Available', item_condition: 'Brand New', purchase_date: '', purchase_price: '', notes: '', warranty_letter_url: '', expense_id: '', purchase_invoice_url: '', available_for_rent: false, rental_price_per_day: '', image_url: '', description: '', images: '' };
const emptyToBuyForm = { item_name: '', product_link: '', estimated_price: '' };

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<{ url: string; title: string } | null>(null);
  const [viewingItem, setViewingItem] = useState<any | null>(null);
  const [viewingItemTab, setViewingItemTab] = useState<'invoice' | 'warranty'>('invoice');

  // Modal state for regular inventory items
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isConvertingItem, setIsConvertingItem] = useState<any | null>(null);

  // Modal state for To-Buy items
  const [isToBuyModalOpen, setIsToBuyModalOpen] = useState(false);
  const [editingToBuyId, setEditingToBuyId] = useState<string | null>(null);
  const [toBuyFormData, setToBuyFormData] = useState(emptyToBuyForm);
  const [toBuySaving, setToBuySaving] = useState(false);

  // Drag and drop reordering for To-Buy items
  const [draggedToBuyId, setDraggedToBuyId] = useState<string | number | null>(null);
  const [dragOverToBuyId, setDragOverToBuyId] = useState<string | number | null>(null);

  const fetcher = async () => {
    const [res, exp] = await Promise.all([getInventoryItems(), getExpensesForLinking()]);
    return { data: res, expenses: exp };
  };

  const { data: swrData, isLoading: loading, mutate } = useSWR(['admin-inventory'], fetcher);
  const { data = [], expenses = [] } = swrData || {};

  useEffect(() => {
    const handleSearch = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setSearchTerm(customEvent.detail || "");
    };
    const handleOpenNew = () => {
      setEditingId(null);
      setIsConvertingItem(null);
      setFormData(emptyForm);
      setIsModalOpen(true);
    };
    const handleOpenToBuy = () => {
      setEditingToBuyId(null);
      setToBuyFormData(emptyToBuyForm);
      setIsToBuyModalOpen(true);
    };

    window.addEventListener("inventory:search", handleSearch);
    window.addEventListener("inventory:open-new", handleOpenNew);
    window.addEventListener("inventory:open-tobuy", handleOpenToBuy);
    return () => {
      window.removeEventListener("inventory:search", handleSearch);
      window.removeEventListener("inventory:open-new", handleOpenNew);
      window.removeEventListener("inventory:open-tobuy", handleOpenToBuy);
    };
  }, []);

  const openNew = () => {
    setEditingId(null);
    setIsConvertingItem(null);
    setFormData(emptyForm);
    setSelectedCategories(["Equipment"]);
    setIsModalOpen(true);
  };

  const openNewToBuy = () => {
    setEditingToBuyId(null);
    setToBuyFormData(emptyToBuyForm);
    setIsToBuyModalOpen(true);
  };

  const openEditToBuy = (item: any) => {
    setEditingToBuyId(item.id);
    setToBuyFormData({
      item_name: item.item_name || '',
      product_link: item.product_link || '',
      estimated_price: item.estimated_price ? String(item.estimated_price) : (item.purchase_price ? String(item.purchase_price) : '')
    });
    setIsToBuyModalOpen(true);
  };

  const handleConvertPurchased = (item: any) => {
    setEditingId(item.id);
    setIsConvertingItem(item);
    const todayStr = new Date().toISOString().split('T')[0];
    const initialCategory = item.category && item.category !== 'To Buy' ? item.category : 'Equipment';
    setFormData({
      item_name: item.item_name || '',
      category: initialCategory,
      serial_number: item.serial_number || '',
      quantity: item.quantity || 1,
      status: 'Available',
      item_condition: item.item_condition || 'Brand New',
      purchase_date: todayStr, // date automatically filled!
      purchase_price: item.estimated_price ? String(item.estimated_price) : (item.purchase_price ? String(item.purchase_price) : ''), // price automatically filled!
      notes: item.product_link ? `Product Link: ${item.product_link}${item.notes ? `\n${item.notes}` : ''}` : (item.notes || ''),
      warranty_letter_url: item.warranty_letter_url || '',
      expense_id: item.expense_id ? String(item.expense_id) : '',
      purchase_invoice_url: item.purchase_invoice_url || '',
      available_for_rent: false,
      rental_price_per_day: '',
      image_url: '',
      description: '',
      images: ''
    });
    setSelectedCategories(parseCategories(initialCategory).length ? parseCategories(initialCategory) : [initialCategory]);
    setIsModalOpen(true);
  };

  const handleSaveToBuy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toBuyFormData.item_name.trim()) return;
    setToBuySaving(true);
    try {
      const priceNum = toBuyFormData.estimated_price ? parseFloat(toBuyFormData.estimated_price) : null;
      if (editingToBuyId) {
        await updateInventoryItem(editingToBuyId, {
          item_name: toBuyFormData.item_name.trim(),
          category: 'To Buy',
          status: 'To Buy',
          quantity: 1,
          is_to_buy: true,
          product_link: toBuyFormData.product_link.trim() || null,
          estimated_price: priceNum,
          purchase_price: priceNum
        });
      } else {
        await createToBuyItem({
          item_name: toBuyFormData.item_name.trim(),
          product_link: toBuyFormData.product_link.trim() || undefined,
          estimated_price: priceNum
        });
      }
      setIsToBuyModalOpen(false);
      setEditingToBuyId(null);
      setToBuyFormData(emptyToBuyForm);
      await mutate();
    } catch (err) {
      console.error("Failed to save to-buy item:", err);
      alert("Failed to save item to buy list.");
    } finally {
      setToBuySaving(false);
    }
  };

  const handleReorderToBuy = async (sourceId: string | number, targetId: string | number) => {
    if (sourceId === targetId) return;

    const toBuyList = (data as any[])
      .filter((d: any) => Boolean(d.is_to_buy))
      .sort((a: any, b: any) => (Number(a.order_index) || 0) - (Number(b.order_index) || 0));

    const sourceIdx = toBuyList.findIndex((d: any) => String(d.id) === String(sourceId));
    const targetIdx = toBuyList.findIndex((d: any) => String(d.id) === String(targetId));
    if (sourceIdx === -1 || targetIdx === -1) return;

    const reordered = [...toBuyList];
    const [moved] = reordered.splice(sourceIdx, 1);
    reordered.splice(targetIdx, 0, moved);

    const updatedIds = reordered.map((d: any) => d.id);
    const orderMap = new Map<string, number>();
    reordered.forEach((d: any, idx: number) => {
      orderMap.set(String(d.id), idx);
    });

    const updatedData = (data as any[]).map((item: any) => {
      if (orderMap.has(String(item.id))) {
        return { ...item, order_index: orderMap.get(String(item.id)) };
      }
      return item;
    });

    mutate({ ...swrData, data: updatedData as any, expenses }, false);

    try {
      await reorderToBuyItems(updatedIds);
      mutate();
    } catch (err) {
      console.error("Failed to reorder to-buy items", err);
      mutate();
    }
  };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    setIsConvertingItem(null);
    setFormData({
      item_name: item.item_name || '',
      category: item.category || '',
      serial_number: item.serial_number || '',
      quantity: item.quantity || 1,
      status: item.status || 'Available',
      item_condition: item.item_condition || 'Brand New',
      purchase_date: item.purchase_date ? new Date(item.purchase_date).toISOString().split('T')[0] : '',
      purchase_price: item.purchase_price || '',
      notes: item.notes || '',
      warranty_letter_url: item.warranty_letter_url || '',
      expense_id: item.expense_id ? String(item.expense_id) : '',
      purchase_invoice_url: item.purchase_invoice_url || '',
      available_for_rent: Boolean(item.available_for_rent),
      rental_price_per_day: item.rental_price_per_day ? String(item.rental_price_per_day) : '',
      image_url: item.image_url || '',
      description: item.description || '',
      images: item.images || ''
    });
    setSelectedCategories(parseCategories(item.category).length ? parseCategories(item.category) : (item.category ? [item.category] : []));
    setIsModalOpen(true);
  };

  const [uploadingWarranty, setUploadingWarranty] = useState(false);
  const [uploadingInvoice, setUploadingInvoice] = useState(false);

  const handleUploadWarranty = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingWarranty(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const url = await uploadInventoryDocument(fd);
      setFormData(prev => ({ ...prev, warranty_letter_url: url }));
    } catch (err) {
      console.error(err);
      alert('Failed to upload warranty letter');
    } finally {
      setUploadingWarranty(false);
    }
  };

  const handleUploadInvoice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingInvoice(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const url = await uploadInventoryDocument(fd);
      setFormData(prev => ({ ...prev, purchase_invoice_url: url }));
    } catch (err) {
      console.error(err);
      alert('Failed to upload purchase invoice');
    } finally {
      setUploadingInvoice(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCategories.length === 0 && !formData.category.trim()) {
      alert("Please select or enter a category.");
      return;
    }
    setSaving(true);
    try {
      const finalCategory = selectedCategories.length > 0 ? selectedCategories.join(', ') : (formData.category.trim() || 'Equipment');
      const payload = { 
        ...formData, 
        category: finalCategory,
        item_condition: formData.item_condition || 'Brand New',
        quantity: parseInt(formData.quantity.toString()) || 1, 
        purchase_price: parseFloat(formData.purchase_price) || null,
        available_for_rent: Boolean(formData.available_for_rent),
        rental_price_per_day: formData.rental_price_per_day ? parseFloat(formData.rental_price_per_day) : 0,
        is_to_buy: false // converts to regular active purchased inventory item!
      };
      if (editingId) {
        await updateInventoryItem(editingId, payload);
      } else {
        await createInventoryItem(payload);
      }
      setIsModalOpen(false);
      setIsConvertingItem(null);
      await mutate();
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
      await mutate();
    } catch (e) {
      console.error(e);
      alert("Failed to delete item.");
    } finally {
      setDeletingId(null);
    }
  };

  const existingCategories = useMemo(() => {
    const set = new Set<string>();
    (data as any[] || []).forEach((item: any) => {
      if (item.category && item.category !== 'To Buy') {
        parseCategories(item.category).forEach((c: string) => set.add(c));
      }
    });
    return Array.from(set).sort();
  }, [data]);

  const pickerCategories = useMemo(() => {
    const set = new Set<string>([...DEFAULT_INVENTORY_CATEGORIES, ...existingCategories]);
    return Array.from(set).sort();
  }, [existingCategories]);

  const dynamicFilters = useMemo(() => {
    return ["All", ...existingCategories];
  }, [existingCategories]);

  const filteredData = useMemo(() => {
    let list = (data as any[]) || [];

    if (activeCategory !== "All") {
      if (activeCategory === "To Buy") {
        list = list.filter((d: any) => Boolean(d.is_to_buy));
      } else {
        list = list.filter((d: any) => !d.is_to_buy && parseCategories(d.category).includes(activeCategory));
      }
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      list = list.filter((d: any) => 
        (d.item_name || '').toLowerCase().includes(lower) ||
        (d.category || '').toLowerCase().includes(lower) ||
        (d.serial_number || '').toLowerCase().includes(lower) ||
        (d.product_link || '').toLowerCase().includes(lower)
      );
    }
    // Always keep To Buy items pinned at the top, ordered by order_index
    return [...list].sort((a: any, b: any) => {
      const aToBuy = Boolean(a.is_to_buy);
      const bToBuy = Boolean(b.is_to_buy);
      if (aToBuy && !bToBuy) return -1;
      if (!aToBuy && bToBuy) return 1;
      if (aToBuy && bToBuy) {
        return (Number(a.order_index) || 0) - (Number(b.order_index) || 0);
      }
      return 0;
    });
  }, [data, searchTerm, activeCategory]);

  const totalItems = (data as any[]).filter((d: any) => !d.is_to_buy).length;
  const availableItems = (data as any[]).filter((d: any) => !d.is_to_buy && d.status === 'Available').length;
  const totalValue = (data as any[]).filter((d: any) => !d.is_to_buy).reduce((acc: number, curr: any) => acc + (parseFloat(curr.purchase_price) || 0), 0);
  const toBuyEstValue = (data as any[]).filter((d: any) => Boolean(d.is_to_buy)).reduce((acc: number, curr: any) => acc + (parseFloat(curr.estimated_price || curr.purchase_price) || 0), 0);
  const toBuyCount = (data as any[]).filter((d: any) => d.is_to_buy).length;
  const forRentCount = (data as any[]).filter((d: any) => !d.is_to_buy && d.available_for_rent).length;

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
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <p className="text-gray-400 text-sm font-medium">To Buy Est. Value</p>
            <p className="text-2xl font-bold mt-1">
              {formatLKR(toBuyEstValue)}
            </p>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex items-center gap-4">
          <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-400">
            <Info className="w-6 h-6" />
          </div>
          <div>
            <p className="text-gray-400 text-sm font-medium">Owned Est. Value</p>
            <p className="text-2xl font-bold mt-1">
              {formatLKR(totalValue)}
            </p>
          </div>
        </div>
      </div>

      {/* Top action bar above table */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveCategory("All")}
            className={`text-xs font-semibold transition-colors cursor-pointer ${
              activeCategory === "All" ? "text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            {totalItems} Inventory Items
          </button>
          {toBuyCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveCategory(activeCategory === "To Buy" ? "All" : "To Buy")}
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                activeCategory === "To Buy"
                  ? "bg-amber-400 text-black border-amber-300 font-bold shadow-sm"
                  : "bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${activeCategory === "To Buy" ? "bg-black" : "bg-amber-400 animate-pulse"}`} />
              {toBuyCount} to buy
            </button>
          )}
          {forRentCount > 0 && (
            <Link
              href="/admin/rentals"
              className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1.5 hover:bg-blue-500/25 transition-colors"
            >
              {forRentCount} for rent &rarr;
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={openNewToBuy}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-2xl font-semibold transition-all text-xs cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95"
            title="Add item to buy list"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>+ To Buy</span>
          </button>
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-semibold transition-all text-xs cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Category Selector Pills */}
      {dynamicFilters.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          {dynamicFilters.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                activeCategory === cat
                  ? "bg-white text-black"
                  : "bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl">
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
                  <th className="text-left py-4 px-6 font-medium text-gray-400 text-sm hidden sm:table-cell">Purchase Date</th>
                  <th className="text-left py-4 px-6 font-medium text-gray-400 text-sm hidden sm:table-cell">Price</th>
                  <th className="text-right py-4 px-6 font-medium text-gray-400 text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item) => {
                  const isToBuy = Boolean(item.is_to_buy);
                  let statusColor = "bg-gray-500/10 text-gray-400 border-gray-500/20";
                  if (item.status === 'Available') statusColor = "bg-green-500/10 text-green-400 border-green-500/20";
                  if (item.status === 'Maintenance') statusColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                  if (item.status === 'Lost') statusColor = "bg-red-500/10 text-red-400 border-red-500/20";
                  if (item.status === 'Broken') statusColor = "bg-red-500/10 text-red-400 border-red-500/20";
                  const itemInvoiceUrl = item.purchase_invoice_url || item.expense_receipt_url;
                  const hasDocs = Boolean(itemInvoiceUrl || item.warranty_letter_url);

                  return (
                    <tr 
                      key={item.id} 
                      draggable={isToBuy}
                      onDragStart={(e) => {
                        if (!isToBuy) return;
                        setDraggedToBuyId(item.id);
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", String(item.id));
                      }}
                      onDragEnd={() => {
                        setDraggedToBuyId(null);
                        setDragOverToBuyId(null);
                      }}
                      onDragOver={(e) => {
                        if (!isToBuy || !draggedToBuyId) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        if (dragOverToBuyId !== item.id) {
                          setDragOverToBuyId(item.id);
                        }
                      }}
                      onDragLeave={() => {
                        if (dragOverToBuyId === item.id) {
                          setDragOverToBuyId(null);
                        }
                      }}
                      onDrop={async (e) => {
                        e.preventDefault();
                        if (!isToBuy || !draggedToBuyId || draggedToBuyId === item.id) {
                          setDragOverToBuyId(null);
                          return;
                        }
                        const source = draggedToBuyId;
                        setDraggedToBuyId(null);
                        setDragOverToBuyId(null);
                        await handleReorderToBuy(source, item.id);
                      }}
                      className={`border-b transition-all ${
                        isToBuy 
                          ? `bg-white/[0.015] border-dashed border-white/10 opacity-80 hover:opacity-100 hover:bg-white/[0.04] cursor-grab active:cursor-grabbing ${
                              draggedToBuyId === item.id ? "opacity-30 bg-white/[0.02]" : ""
                            } ${
                              dragOverToBuyId === item.id && draggedToBuyId !== item.id ? "!border-t-2 !border-t-amber-400 bg-amber-400/[0.08]" : ""
                            }` 
                          : "border-white/5 hover:bg-white/[0.02]"
                      }`}
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isToBuy && (
                            <span 
                              className="text-gray-500 hover:text-amber-300 transition-colors cursor-grab active:cursor-grabbing shrink-0" 
                              title="Drag to reorder"
                            >
                              <GripVertical className="w-3.5 h-3.5" />
                            </span>
                          )}
                          {isToBuy && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                              To Buy
                            </span>
                          )}
                          <span className={`font-semibold ${isToBuy ? "text-gray-300" : "text-white"}`}>
                            {item.item_name}
                          </span>
                        </div>
                        {item.product_link && (
                          <div className="mt-1">
                            <a
                              href={item.product_link.startsWith("http") ? item.product_link : `https://${item.product_link}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 hover:underline transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              <span className="truncate max-w-[220px]">Product Link</span>
                            </a>
                          </div>
                        )}
                        {!isToBuy && item.serial_number && <div className="text-xs text-gray-400 mt-1">SN: {item.serial_number}</div>}
                        {!isToBuy && item.quantity > 1 && <div className="text-xs text-gray-400 mt-0.5">Qty: {item.quantity}</div>}
                      </td>
                      <td className="py-4 px-6 text-sm">
                        {isToBuy ? (
                          <span className="text-gray-500 italic text-xs">To Buy</span>
                        ) : (
                          <span className="text-gray-300">{item.category}</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {isToBuy ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-amber-500/10 text-amber-300 border-amber-500/20">
                            <Clock className="w-3 h-3 text-amber-400" />
                            To Buy
                          </span>
                        ) : (
                          <div className="flex items-center gap-2 flex-nowrap">
                            <span className={`inline-flex items-center justify-center w-[104px] px-2.5 py-0.5 rounded-full text-xs font-medium border shrink-0 text-center ${statusColor}`}>
                              {item.status}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border shrink-0 whitespace-nowrap ${
                              item.item_condition === 'Used'
                                ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                            }`}>
                              Purchased: {item.item_condition || 'Brand New'}
                            </span>
                            {item.available_for_rent && (
                              <span 
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 shrink-0"
                                title="Available for Rent"
                              >
                                Rentable
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      {/* Purchase Date */}
                      <td className="py-4 px-6 text-sm text-gray-400 hidden sm:table-cell">
                        {isToBuy ? (
                          <span className="text-xs text-gray-500 italic">Not purchased</span>
                        ) : item.purchase_date ? (
                          <span>{new Date(item.purchase_date).toLocaleDateString()}</span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>

                      {/* Price */}
                      <td className="py-4 px-6 text-sm hidden sm:table-cell">
                        {isToBuy ? (
                          <div>
                            <span className="text-[10px] text-gray-500 uppercase font-semibold mr-1">Est:</span>
                            <span className="text-amber-300 font-medium">
                              {item.estimated_price || item.purchase_price ? formatLKR(item.estimated_price || item.purchase_price) : "—"}
                            </span>
                          </div>
                        ) : item.purchase_price ? (
                          <span className="text-gray-300 font-medium">{formatLKR(item.purchase_price)}</span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                          {isToBuy && (
                            <button
                              onClick={() => handleConvertPurchased(item)}
                              className="p-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 hover:text-emerald-300 rounded-xl transition-all border border-emerald-500/30 cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                              title="Mark as Purchased (Convert to Inventory)"
                            >
                              <Check className="w-4 h-4 stroke-[2.5]" />
                            </button>
                          )}
                          {!isToBuy && hasDocs && (
                            <button
                              onClick={() => { setViewingItem(item); setViewingItemTab(itemInvoiceUrl ? 'invoice' : 'warranty'); }}
                              className="p-2 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => isToBuy ? openEditToBuy(item) : openEdit(item)}
                            className="p-2 hover:bg-brand-500/20 text-gray-400 hover:text-brand-400 rounded-xl transition-colors cursor-pointer"
                            title={isToBuy ? "Edit To-Buy Item" : "Edit"}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            disabled={deletingId === item.id}
                            className="p-2 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-xl transition-colors cursor-pointer"
                            title="Delete"
                          >
                            {deletingId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111111] border border-white/10 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 shrink-0">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {isConvertingItem ? 'Convert to Inventory' : (editingId ? 'Edit Item' : 'Add Item')}
                </h2>
                {isConvertingItem && (
                  <p className="text-xs text-emerald-400 mt-0.5">Purchased from To-Buy list</p>
                )}
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setIsConvertingItem(null);
                }}
                className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto p-6 flex-1">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column: Core Item Details */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Item Name *</label>
                      <input
                        required
                        type="text"
                        value={formData.item_name}
                        onChange={e => setFormData({ ...formData, item_name: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 text-white placeholder-gray-500"
                        placeholder="e.g. Sony A7IV"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Category *</label>
                        <CategoryPicker
                          categories={pickerCategories}
                          value={selectedCategories}
                          onChange={setSelectedCategories}
                          placeholder="Select category..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Serial Number</label>
                        <input
                          type="text"
                          value={formData.serial_number}
                          onChange={e => setFormData({ ...formData, serial_number: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 text-white placeholder-gray-500"
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
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                        <select
                          value={formData.status}
                          onChange={e => setFormData({ ...formData, status: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 text-white"
                        >
                          <option value="Available" className="bg-[#1a1a1a]">Available</option>
                          <option value="Maintenance" className="bg-[#1a1a1a]">Maintenance</option>
                          <option value="Lost" className="bg-[#1a1a1a]">Lost</option>
                          <option value="Broken" className="bg-[#1a1a1a]">Broken</option>
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
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 text-white"
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
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 text-white placeholder-gray-500"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Purchased Condition *</label>
                      <div className="grid grid-cols-2 gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, item_condition: 'Brand New' })}
                          className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                            (formData.item_condition || 'Brand New') === 'Brand New'
                              ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-sm'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          Brand New
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, item_condition: 'Used' })}
                          className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                            formData.item_condition === 'Used'
                              ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-sm'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          Used
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
                      <textarea
                        value={formData.notes}
                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 min-h-[95px] text-white placeholder-gray-500"
                        placeholder="Additional details..."
                      />
                    </div>
                  </div>

                  {/* Right Column: Rental & Finances & Documents */}
                  <div className="space-y-4">
                    {/* Rental Availability */}
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-white block">Available for Rent</label>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(formData.available_for_rent)}
                            onChange={e => setFormData({ ...formData, available_for_rent: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                        </label>
                      </div>

                      {formData.available_for_rent && (
                        <div className="pt-2 border-t border-white/5 space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-300 mb-1">Daily Rental Price (LKR)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={formData.rental_price_per_day}
                              onChange={e => setFormData({ ...formData, rental_price_per_day: e.target.value })}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
                              placeholder="e.g. 5000.00"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-300 mb-1">Primary Photo URL (Public Catalog)</label>
                            <input
                              type="url"
                              value={formData.image_url || ''}
                              onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
                              placeholder="https://... primary photo link"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-300 mb-1">Additional Gallery Photos (Comma-separated URLs)</label>
                            <input
                              type="text"
                              value={formData.images || ''}
                              onChange={e => setFormData({ ...formData, images: e.target.value })}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
                              placeholder="https://... photo 2, https://... photo 3"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-300 mb-1">Rental Description / Inclusions</label>
                            <textarea
                              rows={2}
                              value={formData.description || ''}
                              onChange={e => setFormData({ ...formData, description: e.target.value })}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
                              placeholder="Key specifications, battery, charger, mount, etc."
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Linked Expense */}
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                      <label className="block text-sm font-medium text-gray-300">Link to Expense</label>
                      <select
                        value={formData.expense_id}
                        onChange={e => setFormData(prev => ({ ...prev, expense_id: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                      >
                        <option value="" className="bg-[#1a1a1a]">— None —</option>
                        {expenses.map(exp => (
                          <option key={exp.id} value={String(exp.id)} className="bg-[#1a1a1a]">
                            {exp.date} · {exp.description} · {formatLKR(exp.amount)}
                          </option>
                        ))}
                      </select>
                      {formData.expense_id && (() => {
                        const linked = expenses.find(e => String(e.id) === formData.expense_id);
                        return linked?.receipt_url ? (
                          <div className="mt-2 flex items-center gap-2">
                            <button type="button" onClick={() => setViewingDoc({ url: linked.receipt_url, title: 'Purchase Invoice' })} className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors cursor-pointer">
                              <Eye className="w-3.5 h-3.5" /> View Invoice
                            </button>
                            <a href={linked.receipt_url} download target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors" title="Download Invoice">
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        ) : linked ? (
                          <p className="mt-1 text-xs text-gray-500">No invoice uploaded on this expense.</p>
                        ) : null;
                      })()}
                    </div>

                    {/* Documents */}
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Warranty Letter</label>
                        {formData.warranty_letter_url ? (
                          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                            <FileText className="w-4 h-4 text-green-400 shrink-0" />
                            <span className="text-xs text-gray-300 truncate flex-1">Uploaded</span>
                            <button type="button" onClick={() => setViewingDoc({ url: formData.warranty_letter_url, title: 'Warranty Letter' })} className="p-1 text-gray-400 hover:text-white transition-colors cursor-pointer" title="View">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <a href={formData.warranty_letter_url} download target="_blank" rel="noopener noreferrer" className="p-1 text-gray-400 hover:text-white transition-colors" title="Download">
                              <Download className="w-3.5 h-3.5" />
                            </a>
                            <button type="button" onClick={() => setFormData(prev => ({ ...prev, warranty_letter_url: '' }))} className="p-1 text-gray-400 hover:text-red-400 transition-colors cursor-pointer" title="Remove">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <label className="cursor-pointer flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-dashed border-white/20 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors text-gray-400">
                            {uploadingWarranty ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            {uploadingWarranty ? 'Uploading...' : 'Upload Warranty Letter'}
                            <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleUploadWarranty} disabled={uploadingWarranty} />
                          </label>
                        )}
                      </div>

                      {/* Purchase Invoice Upload (when no linked expense) */}
                      {!formData.expense_id && (
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1.5">Purchase Invoice (Optional)</label>
                          {formData.purchase_invoice_url ? (
                            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                              <FileText className="w-4 h-4 text-brand-400 shrink-0" />
                              <span className="text-xs text-gray-300 truncate flex-1">Invoice Uploaded</span>
                              <button type="button" onClick={() => setViewingDoc({ url: formData.purchase_invoice_url, title: 'Purchase Invoice' })} className="p-1 text-gray-400 hover:text-white transition-colors cursor-pointer" title="View">
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <a href={formData.purchase_invoice_url} download target="_blank" rel="noopener noreferrer" className="p-1 text-gray-400 hover:text-white transition-colors" title="Download">
                                <Download className="w-3.5 h-3.5" />
                              </a>
                              <button type="button" onClick={() => setFormData(prev => ({ ...prev, purchase_invoice_url: '' }))} className="p-1 text-gray-400 hover:text-red-400 transition-colors cursor-pointer" title="Remove">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <label className="cursor-pointer flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-dashed border-white/20 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors text-gray-400">
                              {uploadingInvoice ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                              {uploadingInvoice ? 'Uploading...' : 'Upload Purchase Invoice'}
                              <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleUploadInvoice} disabled={uploadingInvoice} />
                            </label>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="px-6 py-4 border-t border-white/10 bg-[#141414] flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setIsConvertingItem(null);
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-brand-600 hover:bg-brand-500 text-white transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingId ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Detail Modal */}
      {viewingItem && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setViewingItem(null)}>
          <div className="bg-[#0c0c0e] border border-white/10 rounded-3xl w-full max-w-5xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col md:flex-row" onClick={e => e.stopPropagation()}>
            
            {/* Left Panel — Item Info */}
            <div className="w-full md:w-72 shrink-0 bg-[#111111] border-b md:border-b-0 md:border-r border-white/10 p-6 flex flex-col gap-5 overflow-y-auto">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white leading-tight">{viewingItem.item_name}</h2>
                  <p className="text-sm text-gray-400 mt-0.5">Item Information</p>
                </div>
                <button onClick={() => setViewingItem(null)} className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors shrink-0 mt-0.5">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                {viewingItem.category && (
                  <div>
                    <p className="text-[10px] font-semibold tracking-widest text-gray-500 uppercase mb-0.5">Category</p>
                    <p className="text-sm text-white">{viewingItem.category}</p>
                  </div>
                )}
                {viewingItem.serial_number && (
                  <div>
                    <p className="text-[10px] font-semibold tracking-widest text-gray-500 uppercase mb-0.5">Serial Number</p>
                    <p className="text-sm text-white font-mono">{viewingItem.serial_number}</p>
                  </div>
                )}
                {viewingItem.status && (
                  <div>
                    <p className="text-[10px] font-semibold tracking-widest text-gray-500 uppercase mb-0.5">Status</p>
                    <p className="text-sm text-white">{viewingItem.status}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-semibold tracking-widest text-gray-500 uppercase mb-0.5">Condition</p>
                  <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-md border ${
                    viewingItem.item_condition === 'Used'
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                  }`}>
                    {viewingItem.item_condition || 'Brand New'}
                  </span>
                </div>
                {viewingItem.available_for_rent && (
                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                        <ShoppingCart className="w-3.5 h-3.5 text-blue-400" /> Available for Rent
                      </span>
                      <Link href="/admin/rentals" className="text-xs text-brand-400 hover:text-brand-300 font-semibold underline">
                        Rentals &rarr;
                      </Link>
                    </div>
                    <p className="text-xl font-bold text-white mt-1.5">
                      {viewingItem.rental_price_per_day ? `${formatLKR(viewingItem.rental_price_per_day)} / day` : 'Rate not set'}
                    </p>
                  </div>
                )}
                {viewingItem.purchase_price && (
                  <div>
                    <p className="text-[10px] font-semibold tracking-widest text-gray-500 uppercase mb-0.5">Purchase Cost</p>
                    <p className="text-2xl font-bold text-brand-400">{formatLKR(viewingItem.purchase_price)}</p>
                  </div>
                )}
                {viewingItem.purchase_date && (
                  <div>
                    <p className="text-[10px] font-semibold tracking-widest text-gray-500 uppercase mb-0.5">Purchase Date</p>
                    <p className="text-sm text-white">{new Date(viewingItem.purchase_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                  </div>
                )}
                {viewingItem.expense_desc && (
                  <div>
                    <p className="text-[10px] font-semibold tracking-widest text-gray-500 uppercase mb-0.5">Linked Expense</p>
                    <p className="text-sm text-white">{viewingItem.expense_desc}</p>
                    {viewingItem.expense_amount && <p className="text-xs text-gray-400 mt-0.5">{formatLKR(viewingItem.expense_amount)}</p>}
                  </div>
                )}
                {viewingItem.notes && (
                  <div>
                    <p className="text-[10px] font-semibold tracking-widest text-gray-500 uppercase mb-0.5">Notes</p>
                    <p className="text-sm text-gray-300 whitespace-pre-line">{viewingItem.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel — Tabs for Invoice / Warranty */}
            {(() => {
              const activeInvoiceUrl = viewingItem.purchase_invoice_url || viewingItem.expense_receipt_url;
              return (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Tabs */}
                  <div className="flex items-center gap-1 px-6 pt-5 border-b border-white/10 shrink-0">
                    {activeInvoiceUrl && (
                      <button
                        onClick={() => setViewingItemTab('invoice')}
                        className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${viewingItemTab === 'invoice' ? 'border-brand-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
                      >
                        Purchase Invoice
                      </button>
                    )}
                    {viewingItem.warranty_letter_url && (
                      <button
                        onClick={() => setViewingItemTab('warranty')}
                        className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${viewingItemTab === 'warranty' ? 'border-green-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
                      >
                        Warranty Letter
                      </button>
                    )}
                  </div>

                  {/* Document viewer */}
                  <div className="flex-1 overflow-auto bg-black/40 p-4 flex items-center justify-center">
                    {viewingItemTab === 'invoice' && activeInvoiceUrl && (
                      <DocumentPreview url={activeInvoiceUrl} title="Purchase Invoice" />
                    )}
                    {viewingItemTab === 'warranty' && viewingItem.warranty_letter_url && (
                      <DocumentPreview url={viewingItem.warranty_letter_url} title="Warranty Letter" />
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setViewingDoc(null)}>
          <div className="bg-[#111111] border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
              <h3 className="text-sm font-semibold truncate text-white">{viewingDoc.title}</h3>
              <div className="flex items-center gap-2">
                <a href={viewingDoc.url} download target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors" title="Download">
                  <Download className="w-5 h-5" />
                </a>
                <button onClick={() => setViewingDoc(null)} className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/50">
              <DocumentPreview url={viewingDoc.url} title={viewingDoc.title} />
            </div>
          </div>
        </div>
      )}
      {/* To-Buy Modal */}
      {isToBuyModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#121217] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[85vh] shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
              <h3 className="text-lg font-bold text-white">
                {editingToBuyId ? "Edit To-Buy Item" : "Add Item to Buy"}
              </h3>
              <button
                onClick={() => {
                  setIsToBuyModalOpen(false);
                  setEditingToBuyId(null);
                }}
                className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveToBuy} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Item Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sony FX3 Cage, Rode Wireless Mic..."
                    value={toBuyFormData.item_name}
                    onChange={(e) => setToBuyFormData({ ...toBuyFormData, item_name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Product Link (URL)
                    </label>
                    <div className="relative">
                      <ExternalLink className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="url"
                        placeholder="https://..."
                        value={toBuyFormData.product_link}
                        onChange={(e) => setToBuyFormData({ ...toBuyFormData, product_link: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Estimated Price (LKR)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 75000"
                      value={toBuyFormData.estimated_price}
                      onChange={(e) => setToBuyFormData({ ...toBuyFormData, estimated_price: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 sm:px-6 border-t border-white/10 bg-[#15151c] flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsToBuyModalOpen(false);
                    setEditingToBuyId(null);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={toBuySaving}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {toBuySaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>{editingToBuyId ? "Save Changes" : "Add to Buy List"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
