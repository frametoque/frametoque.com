"use client";

import { useEffect, useState, useMemo } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  KeyRound,
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
  CheckCircle2
} from "lucide-react";

import {
  getRentals,
  getRentableInventory,
  markRentalReturned,
  deleteRental,
  generateInvoiceForRental,
  recordRentalPayment,
  updateRental
} from "../actions/rentals";
import { getAccounts } from "../actions/accounts";
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
      icon: KeyRound,
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
                <p className="text-base font-semibold text-white mb-4">No rentable equipment found</p>
                <Link
                  href="/admin/inventory"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-3xl font-semibold transition-colors text-xs cursor-pointer shadow-sm"
                >
                  <Package className="w-4 h-4" />
                  <span>Go to Inventory</span>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="py-4 px-6">Item Name</th>
                      <th className="py-4 px-6">Category</th>
                      <th className="py-4 px-6">Daily Rental Rate</th>
                      <th className="py-4 px-6">Total Revenue So Far</th>
                      <th className="py-4 px-6">Current Availability</th>
                      <th className="py-4 px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs sm:text-sm">
                    {filteredCatalog.map((item: any) => (
                      <tr key={item.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-4 px-6 font-semibold text-white">
                          {item.item_name}
                        </td>
                        <td className="py-4 px-6 text-gray-300">
                          {item.category || "Equipment"}
                        </td>
                        <td className="py-4 px-6 font-bold text-brand-400">
                          {formatLKR(item.rental_price_per_day)}
                          <span className="text-xs text-gray-500 font-normal"> / day</span>
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
                          <Link
                            href={`/admin/rentals/new?item_id=${item.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow transition-all active:scale-95 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Rent Out</span>
                          </Link>
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
                <KeyRound className="w-12 h-12 text-gray-600 mx-auto mb-3" />
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
    </div>
  );
}
