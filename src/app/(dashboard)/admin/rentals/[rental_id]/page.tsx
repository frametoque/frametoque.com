"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  Edit2,
  ExternalLink,
  FileText,
  KeyRound,
  Loader2,
  Package,
  PackageCheck,
  Phone,
  Tag,
  Trash2,
  User,
  X
} from "lucide-react";
import {
  getRentalById,
  markRentalReturned,
  recordRentalPayment,
  deleteRental
} from "../../actions/rentals";
import { getAccounts } from "../../actions/accounts";

const formatLKR = (amount: number) =>
  new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR" }).format(amount || 0);

const formatDate = (dateStr: string) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "short",
    day: "numeric"
  });
};

export default function RentalDetailPage() {
  const { rental_id } = useParams();
  const router = useRouter();

  const [rental, setRental] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);

  // Payment Modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);

  // Return Modal
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnDate, setReturnDate] = useState("");
  const [returnNotes, setReturnNotes] = useState("");
  const [savingReturn, setSavingReturn] = useState(false);

  // Delete State
  const [deleting, setDeleting] = useState(false);

  const fetchRentalData = async () => {
    if (!rental_id) return;
    try {
      const [r, accs] = await Promise.all([
        getRentalById(rental_id as string),
        getAccounts()
      ]);
      setRental(r);
      setAccounts(accs || []);

      if (r && typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("rental:info", {
            detail: {
              rental_code: r.rental_code,
              item_name: r.rental_code
            }
          })
        );
      }
    } catch (err) {
      console.error("Failed to load rental details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRentalData();
  }, [rental_id]);

  const handleOpenPayment = () => {
    if (!rental) return;
    const remaining = Math.max(0, (rental.total_amount || 0) - (rental.paid_amount || 0));
    setPaymentAmount(remaining > 0 ? String(remaining) : String(rental.total_amount || 0));
    setPaymentMethod("Bank Transfer");
    setPaymentAccountId(accounts[0]?.id ? String(accounts[0].id) : "");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentNotes("");
    setPaymentModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rental) return;
    setSavingPayment(true);
    try {
      await recordRentalPayment(rental.id, {
        amount: parseFloat(paymentAmount) || 0,
        date: paymentDate,
        paymentMethod: paymentMethod,
        accountId: paymentAccountId ? parseInt(paymentAccountId, 10) : undefined,
        notes: paymentNotes.trim() || undefined
      });
      setPaymentModalOpen(false);
      await fetchRentalData();
    } catch (err) {
      console.error(err);
      alert("Failed to record rental payment.");
    } finally {
      setSavingPayment(false);
    }
  };

  const handleOpenReturn = () => {
    if (!rental) return;
    setReturnDate(new Date().toISOString().split("T")[0]);
    setReturnNotes("");
    setReturnModalOpen(true);
  };

  const handleConfirmReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rental) return;
    setSavingReturn(true);
    try {
      await markRentalReturned(rental.id, returnDate, returnNotes.trim() || undefined);
      setReturnModalOpen(false);
      await fetchRentalData();
    } catch (err) {
      console.error(err);
      alert("Failed to mark rental as returned.");
    } finally {
      setSavingReturn(false);
    }
  };

  const handleDelete = async () => {
    if (!rental) return;
    if (
      !confirm(
        `Are you sure you want to delete rental booking ${rental.rental_code}? This action cannot be undone.`
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      await deleteRental(rental.id, rental.rental_code);
      router.push("/admin/rentals");
    } catch (err) {
      console.error(err);
      alert("Failed to delete rental booking.");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-brand-400" />
        Loading rental details...
      </div>
    );
  }

  if (!rental) {
    return (
      <div className="p-16 text-center text-gray-400">
        <p className="text-lg text-white mb-4">Rental record not found.</p>
        <Link
          href="/admin/rentals"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-sm font-semibold text-white hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Rentals
        </Link>
      </div>
    );
  }

  const isReturned = rental.status === "Returned" || Boolean(rental.return_date);
  const isOverdue = rental.status === "Overdue";
  const isFullyPaid =
    rental.payment_status === "Paid" ||
    (rental.paid_amount >= rental.total_amount && rental.total_amount > 0);
  const isPartiallyPaid = !isFullyPaid && (rental.paid_amount > 0 || rental.deposit_amount > 0);
  const balanceDue = Math.max(0, (rental.total_amount || 0) - (rental.paid_amount || 0));

  let statusBadgeColor = "bg-green-500/10 text-green-400 border-green-500/20";
  if (isOverdue) statusBadgeColor = "bg-red-500/10 text-red-400 border-red-500/20";
  else if (isReturned) statusBadgeColor = "bg-white/5 text-gray-400 border-white/10";
  else if (rental.status === "Reserved") statusBadgeColor = "bg-blue-500/10 text-blue-400 border-blue-500/20";

  let paymentBadgeColor = "bg-red-500/10 text-red-400 border-red-500/20";
  if (isFullyPaid) paymentBadgeColor = "bg-green-500/10 text-green-400 border-green-500/20";
  else if (isPartiallyPaid) paymentBadgeColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";

  return (
    <div className="space-y-6 pb-20 w-full">
      {/* Top Banner Card: Main Info & Actions */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-7 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-bold text-brand-400 bg-brand-400/10 border border-brand-400/20 px-2.5 py-0.5 rounded-lg">
              {rental.rental_code}
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusBadgeColor}`}
            >
              {rental.status}
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${paymentBadgeColor}`}
            >
              {isFullyPaid
                ? "Paid"
                : isPartiallyPaid
                ? `Paid ${formatLKR(rental.paid_amount)}`
                : "Unpaid"}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {rental.rental_code}
          </h1>

          <div className="text-xs text-gray-400 flex items-center gap-3">
            <span>
              Client: <strong className="text-white">{rental.client_name}</strong>
            </span>
            {rental.quantity > 1 && <span>• Qty: {rental.quantity}</span>}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleOpenPayment}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl text-xs font-semibold transition-colors cursor-pointer shadow-md shadow-brand-500/20"
          >
            <DollarSign className="w-4 h-4" />
            <span>Record Payment</span>
          </button>

          {!isReturned && (
            <button
              onClick={handleOpenReturn}
              className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 text-green-400 hover:text-green-300 border border-green-500/20 rounded-2xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <PackageCheck className="w-4 h-4" />
              <span>Return Gear</span>
            </button>
          )}

          <Link
            href={`/admin/rentals/${rental.id}/edit`}
            className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 rounded-2xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </Link>

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-2 text-gray-400 hover:text-red-400 rounded-2xl hover:bg-white/10 transition-colors cursor-pointer"
            title="Delete Rental"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-5 flex items-start gap-4 backdrop-blur-xl">
          <div className="p-2.5 rounded-2xl bg-brand-500/10 text-brand-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-1">Rental Period</p>
            <p className="text-white font-semibold text-sm">
              {formatDate(rental.start_date)} &rarr; {formatDate(rental.end_date)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {rental.rental_days} {rental.rental_days === 1 ? "day" : "days"} duration
            </p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-5 flex items-start gap-4 backdrop-blur-xl">
          <div className="p-2.5 rounded-2xl bg-brand-500/10 text-brand-400">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-1">Daily Rate</p>
            <p className="text-white font-semibold text-sm">
              {formatLKR(rental.daily_rate)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              per day · Qty: {rental.quantity || 1}
            </p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-5 flex items-start gap-4 backdrop-blur-xl">
          <div className="p-2.5 rounded-2xl bg-brand-500/10 text-brand-400">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-1">Total Rental Amount</p>
            <p className="text-white font-semibold text-sm">
              {formatLKR(rental.total_amount)}
            </p>
            {rental.deposit_amount > 0 && (
              <p className="text-xs text-brand-400 mt-0.5">
                Deposit: {formatLKR(rental.deposit_amount)}
              </p>
            )}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-5 flex items-start gap-4 backdrop-blur-xl">
          <div className="p-2.5 rounded-2xl bg-brand-500/10 text-brand-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-1">Balance Due</p>
            <p
              className={`font-semibold text-sm ${
                balanceDue > 0 ? "text-amber-400 font-bold" : "text-green-400 font-bold"
              }`}
            >
              {balanceDue > 0 ? formatLKR(balanceDue) : "Settled in Full"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Paid: {formatLKR(rental.paid_amount || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Main Two Column Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Equipment & Handover */}
        <div className="lg:col-span-2 space-y-6">
          {/* Equipment Details Card */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-brand-400" />
                <span>Equipment & Inventory</span>
              </h2>
              {rental.inventory_id && (
                <Link
                  href="/admin/inventory"
                  className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1"
                >
                  View Inventory <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>

            {rental.related_items && rental.related_items.length > 0 ? (
              <div className="space-y-3 pt-1">
                {[rental, ...rental.related_items].map((item: any, idx: number) => (
                  <div
                    key={item.id || idx}
                    className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center"
                  >
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase font-semibold block">Item #{idx + 1}</span>
                      <span className="text-sm font-semibold text-white">{item.item_name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase font-semibold block">Rental Code</span>
                      <span className="text-xs font-bold text-brand-400">{item.rental_code}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase font-semibold block">Daily Rate</span>
                      <span className="text-xs font-medium text-gray-300">{formatLKR(item.daily_rate)}/day</span>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-gray-500 uppercase font-semibold block">Qty & Subtotal</span>
                      <span className="text-xs font-bold text-white">
                        {item.quantity || 1} &times; {rental.rental_days}d = {formatLKR(item.total_amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-xs text-gray-400 block">Item Name</span>
                  <span className="text-sm font-semibold text-white">{rental.item_name}</span>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-xs text-gray-400 block">Daily Rental Rate</span>
                  <span className="text-sm font-semibold text-white">
                    {formatLKR(rental.daily_rate)}/day
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-xs text-gray-400 block">Category</span>
                  <span className="text-sm font-semibold text-white">
                    {rental.inventory_category || "General"}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-xs text-gray-400 block">Quantity Rented</span>
                  <span className="text-sm font-semibold text-white">
                    {rental.quantity || 1} units
                  </span>
                </div>
              </div>
            )}

            {/* Handover & Condition Notes */}
            <div className="space-y-1.5 pt-2">
              <span className="text-xs font-medium text-gray-400">
                Handover Notes
              </span>
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-sm text-gray-300 whitespace-pre-wrap min-h-[70px]">
                {rental.notes || "No additional notes or accessory details specified."}
              </div>
            </div>

            {/* Return Information (if returned) */}
            {isReturned && (
              <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/20 text-xs text-green-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-green-400">
                  <PackageCheck className="w-4 h-4" />
                  <span>Equipment Returned</span>
                </div>
                <div>
                  Actual Return Date:{" "}
                  <strong className="text-white">{formatDate(rental.return_date)}</strong>
                </div>
              </div>
            )}
          </div>

          {/* Invoicing Details Card */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-400" />
              <span>Invoice Information</span>
            </h2>

            {rental.invoice_id ? (
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">
                      Invoice #{rental.invoice_id}
                    </span>
                    <span className="text-xs text-brand-400 font-semibold px-2 py-0.5 rounded bg-brand-500/10 border border-brand-500/20">
                      {rental.invoice_payment_status || "Issued"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Combined financial tracking and client PDF document
                  </p>
                </div>

                <Link
                  href={`/admin/invoice/${rental.invoice_id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm self-start sm:self-auto"
                >
                  <span>Open Invoice</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between text-xs text-gray-400">
                <span>No invoice has been created for this booking yet.</span>
                <Link
                  href={`/admin/rentals/${rental.id}/edit`}
                  className="text-brand-400 hover:text-brand-300 font-medium"
                >
                  Edit Rental &rarr;
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Client & Payment Summary */}
        <div className="space-y-6">
          {/* Client Information Card */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-brand-400" />
                <span>Client Information</span>
              </h2>
              {rental.client_id && (
                <Link
                  href={`/admin/clients/${rental.client_id}`}
                  className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1"
                >
                  Profile <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <span className="text-xs text-gray-400 block">Name</span>
                <span className="text-sm font-semibold text-white">{rental.client_name}</span>
              </div>

              {rental.client_company && (
                <div>
                  <span className="text-xs text-gray-400 block">Company</span>
                  <span className="text-sm text-gray-300">{rental.client_company}</span>
                </div>
              )}

              {rental.client_email && (
                <div>
                  <span className="text-xs text-gray-400 block">Email</span>
                  <a
                    href={`mailto:${rental.client_email}`}
                    className="text-sm text-brand-400 hover:underline"
                  >
                    {rental.client_email}
                  </a>
                </div>
              )}

              {rental.client_phone && (
                <div>
                  <span className="text-xs text-gray-400 block">Phone</span>
                  <a
                    href={`tel:${rental.client_phone}`}
                    className="text-sm text-gray-300 hover:text-white flex items-center gap-1 mt-0.5"
                  >
                    <Phone className="w-3.5 h-3.5 text-gray-500" />
                    <span>{rental.client_phone}</span>
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Payment Breakdown Card */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-brand-400" />
              <span>Financial Summary</span>
            </h2>

            <div className="space-y-2.5 text-sm divide-y divide-white/5">
              <div className="flex justify-between items-center pt-1 text-gray-300">
                <span>Rental Duration</span>
                <span className="font-semibold text-white">
                  {rental.rental_days} {rental.rental_days === 1 ? "day" : "days"}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2 text-gray-300">
                <span>Daily Rate</span>
                <span className="font-semibold text-white">{formatLKR(rental.daily_rate)}</span>
              </div>

              <div className="flex justify-between items-center pt-2 text-gray-300">
                <span>Total Amount</span>
                <span className="font-bold text-white text-base">
                  {formatLKR(rental.total_amount)}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2 text-gray-300">
                <span>Recorded Paid</span>
                <span className="font-semibold text-green-400">
                  {formatLKR(rental.paid_amount || 0)}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2 text-gray-300">
                <span>Remaining Balance</span>
                <span
                  className={`font-bold ${
                    balanceDue > 0 ? "text-amber-400 text-base" : "text-gray-400"
                  }`}
                >
                  {formatLKR(balanceDue)}
                </span>
              </div>
            </div>

            <button
              onClick={handleOpenPayment}
              className="w-full mt-2 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl text-xs font-semibold transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <DollarSign className="w-4 h-4" />
              <span>Record Payment</span>
            </button>
          </div>
        </div>
      </div>

      {/* PAYMENT MODAL */}
      {paymentModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setPaymentModalOpen(false)}
        >
          <div
            className="bg-[#0e0e12] border border-white/10 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="font-bold text-white text-base">Record Rental Payment</h3>
                <p className="text-xs text-gray-400">{rental.rental_code} • {rental.client_name}</p>
              </div>
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between text-xs">
                <div>
                  <span className="text-gray-400 block">Total Due:</span>
                  <span className="font-bold text-white text-sm">{formatLKR(rental.total_amount)}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Already Paid:</span>
                  <span className="text-green-400 font-semibold text-sm">
                    {formatLKR(rental.paid_amount || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block">Remaining:</span>
                  <span className="text-brand-400 font-bold text-sm">{formatLKR(balanceDue)}</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-300 block mb-1">Payment Amount (LKR) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-300 block mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                    style={{ colorScheme: "dark" }}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-300 block mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Online">Online</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              {accounts.length > 0 && (
                <div>
                  <label className="text-xs text-gray-300 block mb-1">Deposit into Account</label>
                  <select
                    value={paymentAccountId}
                    onChange={(e) => setPaymentAccountId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                  >
                    {accounts.map((acc: any) => (
                      <option key={acc.id} value={String(acc.id)}>
                        {acc.account_name} ({acc.bank_name || "Bank"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs text-gray-300 block mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  placeholder="e.g. Paid in cash at handover"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPayment}
                  className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl text-xs font-semibold shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingPayment && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Payment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RETURN MODAL */}
      {returnModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setReturnModalOpen(false)}
        >
          <div
            className="bg-[#0e0e12] border border-white/10 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="font-bold text-white text-base">Return Equipment (Check In)</h3>
                <p className="text-xs text-gray-400">{rental.rental_code} • {rental.client_name}</p>
              </div>
              <button
                onClick={() => setReturnModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmReturn} className="space-y-4">
              <div>
                <label className="text-xs text-gray-300 block mb-1">Return Date *</label>
                <input
                  type="date"
                  required
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                  style={{ colorScheme: "dark" }}
                />
              </div>

              <div>
                <label className="text-xs text-gray-300 block mb-1">Equipment Condition Notes</label>
                <textarea
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-brand-500 min-h-[80px]"
                  placeholder="Returned in good condition, all cables and batteries included..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReturnModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingReturn}
                  className="px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-2xl text-xs font-semibold shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingReturn && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
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
