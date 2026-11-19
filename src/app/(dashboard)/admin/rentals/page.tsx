"use client";

import { useEffect, useState, useMemo } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  Plus,
  Search,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Package,
  Users,
  ExternalLink,
  ChevronRight,
  Edit2,
  Trash2,
  X,
  Loader2,
  PackageCheck,
  Phone,
  FileText,
  CheckCircle2,
  Upload,
  Image as ImageIcon,
  Eye,
  Star,
  ChevronLeft
} from "lucide-react";

import {
  getRentals,
  getRentableInventory,
  markRentalReturned,
  deleteRental,
  generateInvoiceForRental,
  recordRentalPayment,
  updateRental,
  createEquipmentCatalogItem,
  updateEquipmentCatalogItem,
  uploadRentalEquipmentImage,
  uploadMultipleRentalEquipmentImages
} from "../actions/rentals";
import { getAccounts } from "../actions/accounts";
import { slugify } from "@/lib/slugify";
import AnimatedNumber from "../components/AnimatedNumber";

const formatLKR = (amount: number) =>
  new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR" }).format(amount || 0);

export default function RentalsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Payment recording modal
  const [paymentRental, setPaymentRental] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("Bank Transfer");
  const [paymentAccountId, setPaymentAccountId] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>("");
  const [paymentNotes, setPaymentNotes] = useState<string>("");
  const [recordingPayment, setRecordingPayment] = useState(false);

  // Return modal
  const [returnRental, setReturnRental] = useState<any | null>(null);
  const [returnDate, setReturnDate] = useState<string>("");
  const [returnNotes, setReturnNotes] = useState<string>("");
  const [markingReturned, setMarkingReturned] = useState(false);

  // Invoice generating state
  const [generatingInvoiceId, setGeneratingInvoiceId] = useState<number | null>(null);

  const todayStr = new Date().toISOString().split("T")[0];

  // Fetch Rentals Data
  const { data: rentals = [], isLoading: loadingRentals, mutate: mutateRentals } = useSWR(
    ["admin-rentals"],
    () => getRentals()
  );

  // Fetch Rentable Inventory
  const { data: rentableInventory = [], isLoading: loadingInventory, mutate: mutateInventory } = useSWR(
    ["admin-rentable-inventory"],
    () => getRentableInventory()
  );

  // Fetch Accounts
  const { data: accounts = [] } = useSWR(["admin-accounts"], () => getAccounts());

  // Listen to custom header events
  useEffect(() => {
    const handleSearch = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setSearchTerm(customEvent.detail || "");
    };

    const handleOpenNew = () => {
      router.push("/admin/rentals/new");
    };

    window.addEventListener("rentals:search", handleSearch);
    window.addEventListener("rentals:open-new", handleOpenNew);
    return () => {
      window.removeEventListener("rentals:search", handleSearch);
      window.removeEventListener("rentals:open-new", handleOpenNew);
    };
  }, [router]);

  // Delete Rental
  const handleDeleteRental = async (rental: any) => {
    if (!confirm(`Are you sure you want to delete rental "${rental.rental_code}" (${rental.item_name})?`)) return;
    setDeletingId(rental.id);
    try {
      await deleteRental(rental.id, rental.rental_code);
      await mutateRentals();
      await mutateInventory();
    } catch (err) {
      console.error(err);
      alert("Failed to delete rental.");
    } finally {
      setDeletingId(null);
    }
  };

  // Generate Invoice on the fly
  const handleGenerateInvoice = async (rental: any) => {
    setGeneratingInvoiceId(rental.id);
    try {
      const res = await generateInvoiceForRental(rental.id);
      if (res?.invoiceId) {
        alert(`Invoice #${res.invoiceId} successfully created for this rental!`);
      }
      await mutateRentals();
    } catch (err) {
      console.error(err);
      alert("Failed to generate invoice.");
    } finally {
      setGeneratingInvoiceId(null);
    }
  };

  // Open Payment Modal
  const openPaymentModal = (rental: any) => {
    setPaymentRental(rental);
    const balance = Math.max(0, rental.total_amount - (rental.paid_amount || 0));
    setPaymentAmount(String(balance > 0 ? balance : rental.total_amount));
    setPaymentDate(todayStr);
    setPaymentMethod("Bank Transfer");
    setPaymentAccountId(accounts[0]?.id ? String(accounts[0].id) : "");
    setPaymentNotes(`Rental payment: ${rental.rental_code} - ${rental.item_name} (${rental.client_name})`);
  };

  // Submit Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentRental) return;
    const amountNum = parseFloat(paymentAmount);
    if (!amountNum || amountNum <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }

    setRecordingPayment(true);
    try {
      await recordRentalPayment(paymentRental.id, {
        amount: amountNum,
        paymentMethod,
        date: paymentDate || todayStr,
        accountId: paymentAccountId ? parseInt(paymentAccountId, 10) : null,
        notes: paymentNotes
      });
      setPaymentRental(null);
      await mutateRentals();
    } catch (err) {
      console.error(err);
      alert("Failed to record payment.");
    } finally {
      setRecordingPayment(false);
    }
  };

  // Open Return Modal
  const openReturnModal = (rental: any) => {
    setReturnRental(rental);
    setReturnDate(todayStr);
    setReturnNotes("");
  };

  // Submit Return
  const handleMarkReturned = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnRental) return;

    setMarkingReturned(true);
    try {
      await markRentalReturned(returnRental.id, returnDate || todayStr, returnNotes);
      setReturnRental(null);
      await mutateRentals();
      await mutateInventory();
    } catch (err) {
      console.error(err);
      alert("Failed to mark equipment as returned.");
    } finally {
      setMarkingReturned(false);
    }
  };

  // Equipment Catalog Edit & Add Modal State
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const [editingCatalogItem, setEditingCatalogItem] = useState<any | null>(null);
  const [catalogImages, setCatalogImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [catalogFormData, setCatalogFormData] = useState({
    item_name: "",
    category: "Camera",
    rental_price_per_day: "",
    description: "",
    item_condition: "Brand New",
    quantity: "1",
    available_for_rent: true,
  });
  const [uploadingCatalogImage, setUploadingCatalogImage] = useState(false);
  const [savingCatalogItem, setSavingCatalogItem] = useState(false);

  const openNewCatalogModal = () => {
    setEditingCatalogItem(null);
    setCatalogImages([]);
    setNewImageUrl("");
    setCatalogFormData({
      item_name: "",
      category: "Camera",
      rental_price_per_day: "",
      description: "",
      item_condition: "Brand New",
      quantity: "1",
      available_for_rent: true,
    });
    setCatalogModalOpen(true);
  };

  const openEditCatalogModal = (item: any) => {
    setEditingCatalogItem(item);
    let parsedImages: string[] = [];
    if (item.images) {
      try {
        const p = JSON.parse(item.images);
        if (Array.isArray(p)) parsedImages = p.map(String).filter(Boolean);
      } catch {
        parsedImages = String(item.images).split(",").map((s) => s.trim()).filter(Boolean);
      }
    }
    if (item.image_url && !parsedImages.includes(item.image_url)) {
      parsedImages.unshift(item.image_url);
    }
    setCatalogImages(parsedImages);
    setNewImageUrl("");
    setCatalogFormData({
      item_name: item.item_name || "",
      category: item.category || "Equipment",
      rental_price_per_day: item.rental_price_per_day ? String(item.rental_price_per_day) : "",
      description: item.description || "",
      item_condition: item.item_condition || "Brand New",
      quantity: String(item.quantity || 1),
      available_for_rent: item.available_for_rent !== undefined ? Boolean(item.available_for_rent) : true,
    });
    setCatalogModalOpen(true);
  };

  const handleCatalogImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingCatalogImage(true);
    try {
      const fd = new FormData();
      for (let i = 0; i < files.length; i++) {
        fd.append("files", files[i]);
      }
      const urls = await uploadMultipleRentalEquipmentImages(fd);
      if (urls.length > 0) {
        setCatalogImages((prev) => [...prev, ...urls]);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to upload images.");
    } finally {
      setUploadingCatalogImage(false);
      e.target.value = "";
    }
  };

  const handleAddImageUrl = () => {
    const trimmed = newImageUrl.trim();
    if (!trimmed) return;
    if (!catalogImages.includes(trimmed)) {
      setCatalogImages((prev) => [...prev, trimmed]);
    }
    setNewImageUrl("");
  };

  const handleSetCoverImage = (index: number) => {
    setCatalogImages((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      return [item, ...copy];
    });
  };

  const handleRemoveCatalogImage = (index: number) => {
    setCatalogImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveCatalogImage = (index: number, direction: "left" | "right") => {
    setCatalogImages((prev) => {
      const target = direction === "left" ? index - 1 : index + 1;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[target];
      copy[target] = temp;
      return copy;
    });
  };

  const handleSaveCatalogItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catalogFormData.item_name.trim()) {
      alert("Please enter an equipment name.");
      return;
    }
    const rateNum = parseFloat(catalogFormData.rental_price_per_day);
    if (isNaN(rateNum) || rateNum < 0) {
      alert("Please enter a valid rental price per day.");
      return;
    }

    setSavingCatalogItem(true);
    try {
      const primaryImage = catalogImages[0] || null;
      const allImagesJson = catalogImages.length > 0 ? JSON.stringify(catalogImages) : null;

      const payload = {
        item_name: catalogFormData.item_name.trim(),
        category: catalogFormData.category.trim() || "Equipment",
        rental_price_per_day: rateNum,
        image_url: primaryImage,
        images: allImagesJson,
        description: catalogFormData.description.trim() || null,
        item_condition: catalogFormData.item_condition || "Brand New",
        quantity: parseInt(catalogFormData.quantity || "1", 10),
        available_for_rent: catalogFormData.available_for_rent,
      };

      if (editingCatalogItem?.id) {
        await updateEquipmentCatalogItem(editingCatalogItem.id, payload);
      } else {
        await createEquipmentCatalogItem(payload);
      }

      await mutateInventory();
      setCatalogModalOpen(false);
      setEditingCatalogItem(null);
    } catch (err) {
      console.error(err);
      alert("Failed to save equipment item.");
    } finally {
      setSavingCatalogItem(false);
    }
  };

  // Stats Calculations
  const stats = useMemo(() => {
    const totalRentals = rentals.length;
    const activeRentals = rentals.filter((r: any) => r.status === "Active").length;
    const overdueRentals = rentals.filter((r: any) => r.status === "Overdue" || r.is_overdue).length;
    const totalRevenue = rentals.reduce((sum: number, r: any) => sum + (r.paid_amount || 0), 0);
    const rentableCount = rentableInventory.length;

    return {
      totalRentals,
      activeRentals,
      overdueRentals,
      totalRevenue,
      rentableCount
    };
  }, [rentals, rentableInventory]);

  const statCards = [
    {
      label: "Active Rentals",
      value: stats.activeRentals.toString(),
      icon: ShoppingCart,
      color: "text-blue-400",
      bg: "bg-blue-400/10"
    },
    {
      label: "Rentable Equipment",
      value: stats.rentableCount.toString(),
      icon: Package,
      color: "text-green-400",
      bg: "bg-green-400/10"
    },
    {
      label: "Overdue Returns",
      value: stats.overdueRentals.toString(),
      icon: AlertCircle,
      color: "text-red-400",
      bg: "bg-red-400/10"
    },
    {
      label: "Collected Revenue",
      value: formatLKR(stats.totalRevenue),
      icon: DollarSign,
      color: "text-brand-400",
      bg: "bg-brand-400/10"
    }
  ];

  const filters = ["All", "Active", "Reserved", "Overdue", "Returned", "Catalog"];

  // Filtered Rentals
  const filteredRentals = useMemo(() => {
    let list = rentals;

    if (activeFilter === "Active") {
      list = list.filter((r: any) => r.status === "Active");
    } else if (activeFilter === "Reserved") {
      list = list.filter((r: any) => r.status === "Reserved");
    } else if (activeFilter === "Returned") {
      list = list.filter((r: any) => r.status === "Returned");
    } else if (activeFilter === "Overdue") {
      list = list.filter((r: any) => r.status === "Overdue" || r.is_overdue);
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter((r: any) =>
        (r.rental_code || "").toLowerCase().includes(q) ||
        (r.item_name || "").toLowerCase().includes(q) ||
        (r.client_name || "").toLowerCase().includes(q) ||
        (r.client_email || "").toLowerCase().includes(q) ||
        (r.client_company || "").toLowerCase().includes(q) ||
        (r.invoice_id || "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [rentals, activeFilter, searchTerm]);

  // Filtered Rentable Catalog
  const filteredCatalog = useMemo(() => {
    let list = rentableInventory;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter((item: any) =>
        (item.item_name || "").toLowerCase().includes(q) ||
        (item.category || "").toLowerCase().includes(q) ||
        (item.serial_number || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [rentableInventory, searchTerm]);

  if (loadingRentals) {
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
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <div
            key={i}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex items-center gap-4 hover:bg-white/10 transition-colors"
          >
            <div className={`p-4 rounded-2xl flex-shrink-0 ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-gray-400 text-sm font-medium">{stat.label}</p>
              <p className="text-2xl font-bold mt-1">
                <AnimatedNumber value={stat.value} />
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Top Action Bar Above Table */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                activeFilter === f
                  ? "bg-white text-black shadow-md font-semibold"
                  : "bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              {f === "Catalog" ? `Equipment Catalog (${rentableInventory.length})` : f}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {activeFilter === "Catalog" ? (
            <>
              <Link
                href="/rentals"
                target="_blank"
                className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 rounded-full font-medium transition-all text-sm cursor-pointer shadow-sm"
              >
                <ExternalLink className="w-4 h-4 text-brand-400" />
                <span>View Public Rentals</span>
              </Link>
              <button
                type="button"
                onClick={openNewCatalogModal}
                className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-full font-semibold transition-all text-sm cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Equipment</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/admin/inventory"
                className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 rounded-full font-medium transition-all text-sm cursor-pointer shadow-sm"
              >
                <Package className="w-4 h-4" />
                <span>Inventory</span>
              </Link>
              <Link
                href="/admin/rentals/new"
                className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-full font-semibold transition-all text-sm cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>New Rental</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Main Table / Catalog List */}
      <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl">
        {activeFilter === "Catalog" ? (
          /* Rentable Equipment Catalog View */
          <div>
            {loadingInventory ? (
              <div className="p-16 text-center text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-400" />
                Loading rentable inventory...
              </div>
            ) : filteredCatalog.length === 0 ? (
              <div className="p-16 text-center text-gray-400">
                <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-base font-semibold text-white mb-2">No rentable equipment found</p>
                <p className="text-xs text-gray-400 mb-5">Add equipment with images and daily rates to feature them in the public rental catalog.</p>
                <button
                  type="button"
                  onClick={openNewCatalogModal}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-3xl font-semibold transition-colors text-xs cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add First Equipment</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="py-4 px-6">Equipment</th>
                      <th className="py-4 px-6">Category</th>
                      <th className="py-4 px-6">Daily Rental Rate</th>
                      <th className="py-4 px-6">Description</th>
                      <th className="py-4 px-6">Revenue</th>
                      <th className="py-4 px-6">Availability</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs sm:text-sm">
                    {filteredCatalog.map((item: any) => (
                      <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.item_name}
                                className="w-12 h-12 rounded-xl object-cover bg-white/5 border border-white/10 shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 shrink-0">
                                <Package className="w-5 h-5 text-gray-500" />
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-white group-hover:text-brand-300 transition-colors">
                                {item.item_name}
                              </div>
                              {item.quantity > 1 && (
                                <div className="mt-0.5">
                                  <span className="text-[11px] text-gray-400">
                                    Qty: {item.quantity}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-gray-300">
                          {item.category || "Equipment"}
                        </td>
                        <td className="py-4 px-6 font-bold text-brand-400">
                          {formatLKR(item.rental_price_per_day)}
                          <span className="text-xs text-gray-500 font-normal"> / day</span>
                        </td>
                        <td className="py-4 px-6 max-w-xs">
                          {item.description ? (
                            <p className="text-xs text-gray-400 line-clamp-2" title={item.description}>
                              {item.description}
                            </p>
                          ) : (
                            <span className="text-xs text-gray-600 italic">No description added</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-bold text-emerald-400 text-sm">
                            {formatLKR(item.total_revenue || 0)}
                          </div>
                          <div className="text-[11px] text-gray-400 mt-0.5">
                            {item.rental_count || 0} {(item.rental_count || 0) === 1 ? "rental" : "rentals"}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {item.is_currently_out ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-amber-500/10 text-amber-300 border-amber-500/20">
                              <Clock className="w-3 h-3 text-amber-400" />
                              Out with {item.active_renter}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-green-500/10 text-green-400 border-green-500/20">
                              <CheckCircle className="w-3 h-3 text-green-400" />
                              In Stock
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditCatalogModal(item)}
                              title="Edit Equipment Details & Image"
                              className="p-1.5 bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <Link
                              href={`/rentals/${slugify(item.item_name) || item.id}`}
                              target="_blank"
                              title="View Public Rental Page"
                              className="p-1.5 bg-white/5 hover:bg-white/15 text-brand-400 hover:text-brand-300 rounded-lg transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Link>
                            <Link
                              href={`/admin/rentals/new?item_id=${item.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold shadow transition-all active:scale-95 cursor-pointer ml-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Rent Out</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* Bookings List View */
          <div>
            {filteredRentals.length === 0 ? (
              <div className="p-16 text-center text-gray-400">
                <ShoppingCart className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-base font-semibold text-white mb-1">No rentals found</p>
                <p className="text-xs text-gray-400 max-w-sm mx-auto mb-5">
                  {searchTerm ? "No bookings match your search query." : "You haven't recorded any equipment rentals yet."}
                </p>
                <Link
                  href="/admin/rentals/new"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-3xl font-semibold transition-colors text-xs cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Rental</span>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="py-4 px-6">Rental #</th>
                      <th className="py-4 px-6">Equipment</th>
                      <th className="py-4 px-6">Client</th>
                      <th className="py-4 px-6">Duration</th>
                      <th className="py-4 px-6">Total</th>
                      <th className="py-4 px-6">Invoice</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs sm:text-sm">
                    {filteredRentals.map((rental: any) => {
                      const isOverdue = rental.status === "Overdue" || rental.is_overdue;
                      const isReturned = rental.status === "Returned";
                      const isFullyPaid =
                        rental.payment_status === "Paid" ||
                        (rental.paid_amount >= rental.total_amount && rental.total_amount > 0);
                      const isPartiallyPaid =
                        !isFullyPaid && (rental.paid_amount > 0 || rental.deposit_amount > 0);

                      let statusBadge = (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-green-500/10 text-green-400 border-green-500/20">
                          Active
                        </span>
                      );
                      if (isOverdue) {
                        statusBadge = (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-red-500/10 text-red-400 border-red-500/20">
                            Overdue
                          </span>
                        );
                      } else if (isReturned) {
                        statusBadge = (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-white/5 text-gray-400 border-white/10">
                            Returned
                          </span>
                        );
                      } else if (rental.status === "Reserved") {
                        statusBadge = (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-blue-500/10 text-blue-400 border-blue-500/20">
                            Reserved
                          </span>
                        );
                      }

                      return (
                        <tr
                          key={rental.id}
                          className="hover:bg-white/5 transition-colors group"
                        >
                          {/* Rental Code */}
                          <td className="py-4 px-6">
                            <Link
                              href={`/admin/rentals/${rental.id}`}
                              className="font-semibold text-brand-400 hover:text-brand-300 transition-colors"
                            >
                              {rental.rental_code}
                            </Link>
                          </td>

                          {/* Equipment */}
                          <td className="py-4 px-6">
                            <Link
                              href={`/admin/rentals/${rental.id}`}
                              className="font-semibold text-white hover:text-brand-400 transition-colors block"
                            >
                              {rental.item_name}
                            </Link>
                            {rental.quantity > 1 && (
                              <div className="text-xs text-gray-400 mt-0.5">
                                Qty: {rental.quantity}
                              </div>
                            )}
                          </td>

                          {/* Client */}
                          <td className="py-4 px-6">
                            <div className="text-white font-medium">{rental.client_name}</div>
                            {rental.client_phone && (
                              <div className="text-xs text-gray-400">{rental.client_phone}</div>
                            )}
                          </td>

                          {/* Duration */}
                          <td className="py-4 px-6 text-xs text-gray-300">
                            <div>
                              {rental.start_date} &rarr; {rental.end_date}
                            </div>
                            <div className="text-gray-400 mt-0.5">
                              {rental.rental_days} {rental.rental_days === 1 ? "day" : "days"}
                            </div>
                            {isReturned && rental.return_date && (
                              <div className="text-green-400 text-[11px] mt-0.5">
                                Returned on {rental.return_date}
                              </div>
                            )}
                          </td>

                          {/* Financials / Total */}
                          <td className="py-4 px-6">
                            <div className="font-bold text-white text-sm">
                              {formatLKR(rental.total_amount)}
                            </div>
                            {rental.deposit_amount > 0 && (
                              <div className="text-[11px] text-gray-500 mt-0.5">
                                Dep: {formatLKR(rental.deposit_amount)}
                              </div>
                            )}
                          </td>

                          {/* Linked Invoice */}
                          <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                            {rental.invoice_id ? (
                              <Link
                                href={`/admin/invoice/${rental.invoice_id}`}
                                className="inline-flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 font-medium hover:underline"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>{rental.invoice_id}</span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                              </Link>
                            ) : (
                              <button
                                onClick={() => handleGenerateInvoice(rental)}
                                disabled={generatingInvoiceId === rental.id}
                                className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                                title="Create an invoice for this rental"
                              >
                                {generatingInvoiceId === rental.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Plus className="w-3 h-3" />
                                )}
                                <span>Invoice</span>
                              </button>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-4 px-6">
                            {statusBadge}
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                              <button
                                onClick={() => openPaymentModal(rental)}
                                className="p-2 text-gray-400 hover:text-brand-400 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                                title="Record Payment"
                              >
                                <DollarSign className="w-4 h-4" />
                              </button>
                              {!isReturned && (
                                <button
                                  onClick={() => openReturnModal(rental)}
                                  className="p-2 text-gray-400 hover:text-green-400 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                                  title="Return Equipment (Check In)"
                                >
                                  <PackageCheck className="w-4 h-4" />
                                </button>
                              )}
                              <Link
                                href={`/admin/rentals/${rental.id}/edit`}
                                className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                                title="Edit Rental"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Link>
                              <button
                                onClick={() => handleDeleteRental(rental)}
                                disabled={deletingId === rental.id}
                                className="p-2 text-gray-400 hover:text-red-400 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                                title="Delete Rental"
                              >
                                {deletingId === rental.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
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
        )}
      </div>

      {/* RECORD PAYMENT MODAL */}
      {paymentRental && (
        <div
          className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setPaymentRental(null)}
        >
          <div
            className="bg-[#0e0e12] border border-white/10 rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
              <div>
                <h3 className="text-base font-bold text-white">Record Rental Payment</h3>
                <p className="text-xs text-gray-400">{paymentRental.rental_code} • {paymentRental.client_name}</p>
              </div>
              <button
                onClick={() => setPaymentRental(null)}
                className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-gray-300 grid grid-cols-3 gap-3">
                  <div>
                    <span className="text-gray-400 block mb-0.5">Total Amount:</span>
                    <span className="font-bold text-white text-sm">{formatLKR(paymentRental.total_amount)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-0.5">Already Paid:</span>
                    <span className="text-green-400 font-medium text-sm">{formatLKR(paymentRental.paid_amount || 0)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-0.5">Remaining Due:</span>
                    <span className="text-brand-400 font-bold text-sm">
                      {formatLKR(Math.max(0, paymentRental.total_amount - (paymentRental.paid_amount || 0)))}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Amount to Record (LKR) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Payment Date</label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                      style={{ colorScheme: "dark" }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                    >
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cash">Cash</option>
                      <option value="Online">Online</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Account</label>
                    <select
                      value={paymentAccountId}
                      onChange={(e) => setPaymentAccountId(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                    >
                      <option value="">— Primary Account —</option>
                      {accounts.map((acc: any) => (
                        <option key={acc.id} value={String(acc.id)}>
                          {acc.name} ({acc.bankName || acc.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-300 mb-1">Income Description</label>
                    <input
                      type="text"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 sm:px-6 border-t border-white/10 bg-white/5 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setPaymentRental(null)}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingPayment}
                  className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl text-sm font-semibold shadow transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {recordingPayment && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save to Income</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RETURN EQUIPMENT MODAL */}
      {returnRental && (
        <div
          className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setReturnRental(null)}
        >
          <div
            className="bg-[#0e0e12] border border-white/10 rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
              <div>
                <h3 className="text-base font-bold text-white">Return Equipment (Check In)</h3>
                <p className="text-xs text-gray-400">{returnRental.rental_code} • {returnRental.client_name}</p>
              </div>
              <button
                onClick={() => setReturnRental(null)}
                className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleMarkReturned} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Return Date</label>
                  <input
                    type="date"
                    required
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                    style={{ colorScheme: "dark" }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Return Inspection Notes</label>
                  <textarea
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 min-h-[100px]"
                    placeholder="Checked for scratches, tested power, all accessories returned..."
                  />
                </div>
              </div>

              <div className="p-4 sm:px-6 border-t border-white/10 bg-white/5 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setReturnRental(null)}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={markingReturned}
                  className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl text-sm font-semibold shadow transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {markingReturned && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Confirm Return</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* EQUIPMENT CATALOG EDIT / ADD MODAL */}
      {catalogModalOpen && (
        <div
          className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setCatalogModalOpen(false)}
        >
          <div
            className="bg-[#0e0e12] border border-white/10 rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingCatalogItem ? "Edit Equipment Catalog Item" : "Add Equipment to Catalog"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCatalogModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCatalogItem} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left Column: Product Details */}
                  <div className="lg:col-span-6 space-y-4">
                    {/* Item Name */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                        Equipment / Product Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={catalogFormData.item_name}
                        onChange={(e) => setCatalogFormData((prev) => ({ ...prev, item_name: e.target.value }))}
                        placeholder="e.g. Sony FX3 Cinema Camera, Canon RF 24-70mm f/2.8L"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
                      />
                    </div>

                    {/* Category & Preset Chips */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                        Category <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={catalogFormData.category}
                        onChange={(e) => setCatalogFormData((prev) => ({ ...prev, category: e.target.value }))}
                        placeholder="e.g. Camera, Lens, Lighting, Drone, Audio"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 mb-2"
                      />
                      <div className="flex flex-wrap gap-1.5">
                        {["Camera", "Lens", "Lighting", "Audio", "Drone", "Gimbal", "Mounts & Tripods", "Monitor", "Accessories"].map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setCatalogFormData((prev) => ({ ...prev, category: cat }))}
                            className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                              catalogFormData.category === cat
                                ? "bg-brand-500/20 text-brand-300 border-brand-500/40 font-medium"
                                : "bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Price per day, Condition, Quantity */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                          Daily Rate (LKR) <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-xs text-gray-400">Rs.</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            required
                            value={catalogFormData.rental_price_per_day}
                            onChange={(e) => setCatalogFormData((prev) => ({ ...prev, rental_price_per_day: e.target.value }))}
                            placeholder="3500"
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-2 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">Condition</label>
                        <select
                          value={catalogFormData.item_condition}
                          onChange={(e) => setCatalogFormData((prev) => ({ ...prev, item_condition: e.target.value }))}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                        >
                          <option value="Brand New">Brand New</option>
                          <option value="Like New / Mint">Like New / Mint</option>
                          <option value="Excellent">Excellent</option>
                          <option value="Good">Good</option>
                          <option value="Fair">Fair</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">Stock Quantity</label>
                        <input
                          type="number"
                          min="1"
                          value={catalogFormData.quantity}
                          onChange={(e) => setCatalogFormData((prev) => ({ ...prev, quantity: e.target.value }))}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                        />
                      </div>
                    </div>

                    {/* Product Description */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                        Product Description and Accessories
                      </label>
                      <textarea
                        rows={3}
                        value={catalogFormData.description}
                        onChange={(e) => setCatalogFormData((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="Specifications, features, and included accessories..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 resize-y"
                      />
                    </div>

                    {/* Available for Rent Toggle */}
                    <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-2xl">
                      <input
                        type="checkbox"
                        id="available_for_rent_check"
                        checked={catalogFormData.available_for_rent}
                        onChange={(e) => setCatalogFormData((prev) => ({ ...prev, available_for_rent: e.target.checked }))}
                        className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500 focus:ring-offset-0 bg-white/10 border-white/20 cursor-pointer"
                      />
                      <label htmlFor="available_for_rent_check" className="text-xs text-gray-200 cursor-pointer select-none">
                        <span className="font-semibold block text-white">Active in Public Rental Catalog</span>
                        Allow public visitors to view this gear and check rental availability.
                      </label>
                    </div>
                  </div>

                  {/* Right Column: Product Images & Multi-Image Gallery */}
                  <div className="lg:col-span-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-gray-300">
                        Product Images ({catalogImages.length})
                      </label>
                      <span className="text-[11px] text-gray-500">
                        First photo is the cover image
                      </span>
                    </div>

                    {/* Upload Controls */}
                    <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-semibold text-gray-200 block">Upload Product Photos</span>
                        <span className="text-[11px] text-gray-400">Select one or multiple image files</span>
                      </div>
                      <label className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl cursor-pointer transition-colors shadow-xs shrink-0">
                        {uploadingCatalogImage ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                        <span>{uploadingCatalogImage ? "Uploading..." : "Upload Photos"}</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleCatalogImagesUpload}
                          disabled={uploadingCatalogImage}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Thumbnail Gallery Grid */}
                    {catalogImages.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1">
                        {catalogImages.map((img, idx) => (
                          <div
                            key={idx}
                            className={`relative aspect-[4/3] rounded-2xl overflow-hidden border-2 bg-white/5 group transition-all ${
                              idx === 0
                                ? "border-brand-500 ring-2 ring-brand-500/20"
                                : "border-white/10 hover:border-white/25"
                            }`}
                          >
                            <img
                              src={img}
                              alt={`Product photo ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />

                            {/* Cover badge */}
                            {idx === 0 && (
                              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-brand-600 text-[10px] font-bold text-white shadow-xs flex items-center gap-1 pointer-events-none">
                                <Star className="w-3 h-3 fill-current" />
                                Cover
                              </span>
                            )}

                            {/* Hover action overlay */}
                            <div className="absolute inset-0 bg-black/75 flex flex-col justify-between p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="flex items-center justify-between">
                                {idx !== 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => handleSetCoverImage(idx)}
                                    className="px-2 py-1 bg-brand-600 hover:bg-brand-500 text-white text-[10px] font-semibold rounded-md transition-colors cursor-pointer"
                                  >
                                    Make Cover
                                  </button>
                                ) : (
                                  <span />
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCatalogImage(idx)}
                                  className="w-6 h-6 rounded-md bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center transition-colors cursor-pointer"
                                  title="Remove photo"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Reorder arrows */}
                              <div className="flex items-center justify-center gap-1">
                                {idx > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleMoveCatalogImage(idx, "left")}
                                    className="px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 text-white text-[10px] font-medium flex items-center gap-0.5 cursor-pointer"
                                    title="Move left"
                                  >
                                    <ChevronLeft className="w-3 h-3" />
                                    <span>Left</span>
                                  </button>
                                )}
                                {idx < catalogImages.length - 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleMoveCatalogImage(idx, "right")}
                                    className="px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 text-white text-[10px] font-medium flex items-center gap-0.5 cursor-pointer"
                                    title="Move right"
                                  >
                                    <span>Right</span>
                                    <ChevronRight className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] text-center text-xs text-gray-400">
                        <ImageIcon className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                        <p>No photos added yet. Upload files above.</p>
                        <p className="text-[11px] text-gray-500 mt-1">Multiple images supported. Upload several at once.</p>
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:px-6 border-t border-white/10 bg-white/5 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setCatalogModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCatalogItem}
                  className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl text-sm font-semibold shadow transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingCatalogItem && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingCatalogItem ? "Save Changes" : "Add to Catalog"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
