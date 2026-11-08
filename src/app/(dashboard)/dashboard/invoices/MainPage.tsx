"use client";

import Link from "next/link";
import { Package, MessageCircle, Plus, Eye, CreditCard, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import PayModal from "@/components/PayModal";
import { syncAllCardPayments } from "@/app/(dashboard)/admin/actions/payments";

const workStatusStyles = {
  "in progress": "bg-brand-500/20 text-brand-400 border-brand-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};
const paymentStatusStyles = {
  "fully paid": "bg-green-500/20 text-green-400 border-green-500/30",
  unpaid: "bg-red-500/20 text-red-400 border-red-500/30",
  "advance-paid": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "partially paid": "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  "on review": "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

const paymentStatusLabels = {
  "fully paid": "Fully Paid",
  unpaid: "Unpaid",
  "advance-paid": "Advance Paid",
  "partially paid": "Partially Paid",
  "on review": "On Review",
};
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatPrice = (price, currency = "LKR") => {
  if (!price || isNaN(parseFloat(price))) return "N/A";
  const formatted = parseFloat(price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const raw = String(currency || "LKR").toUpperCase();
  const label = raw === "USD" ? "$ " : "LKR ";
  return `${label}${formatted}`;
};

export default function DashboardProjectsPage() {
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  
  const { user, isLoaded: isUserLoaded } = useUser();

  useEffect(() => {
    if (isUserLoaded && user?.primaryEmailAddress?.emailAddress) {
      const fetchRequests = async () => {
        try {
          setLoading(true);
          const userEmail = user.primaryEmailAddress.emailAddress;
          const response = await fetch(
            `/api/requests?user_email=${encodeURIComponent(userEmail)}&t=${Date.now()}`,
            {
              cache: "no-store",
              headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
            }
          );
          if (!response.ok) throw new Error('Failed to fetch requests');
          const data = await response.json();
          setMyRequests(data);

          // Automatically sync card payments in background
          syncAllCardPayments()
            .then((res) => {
              if (res?.syncedCount && res.syncedCount > 0) {
                // Refresh list if new payments synced
                fetch(
                  `/api/requests?user_email=${encodeURIComponent(userEmail)}&t=${Date.now()}`,
                  {
                    cache: "no-store",
                    headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
                  }
                )
                  .then((r) => r.json())
                  .then((updated) => setMyRequests(updated))
                  .catch(() => {});
              }
            })
            .catch(() => {});
        } catch (err: any) {
          setError(err.message);
          console.error('Error fetching requests:', err);
        } finally {
          setLoading(false);
        }
      };

      fetchRequests();

      const handleFocus = () => fetchRequests();
      const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") fetchRequests();
      };
      const handlePageShow = () => fetchRequests();

      window.addEventListener("focus", handleFocus);
      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("pageshow", handlePageShow);

      return () => {
        window.removeEventListener("focus", handleFocus);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("pageshow", handlePageShow);
      };
    } else if (isUserLoaded && !user) {
      setLoading(false);
      setError("Please sign in to view your requests");
    }
  }, [isUserLoaded, user]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-brand-400 to-brand-500 bg-clip-text text-transparent">Invoices</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            Track the status of every invoice and service request you have with Frametoque.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/services"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-3xl bg-white/10 border border-white/10 text-white font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="w-5 h-5" />
            New Request
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-3xl bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            Talk to Support
          </Link>
        </div>
      </div>

      {/* Requests List */}
      {(!isUserLoaded || loading) ? (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-16 flex justify-center items-center text-gray-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
          <span>Loading invoices...</span>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-6 text-center">
          <p className="text-red-400">{error}</p>
        </div>
      ) : myRequests.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          {myRequests.map((request) => (
            <div
              key={request.id}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 hover:border-brand-500/30 transition-colors"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {/* Left - Info */}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-white">{request.title}</h3>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full border ${workStatusStyles[request.status] || workStatusStyles.pending}`}>
                      {request.status || "pending"}
                    </span>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full border ${paymentStatusStyles[request.payment_status] || paymentStatusStyles.unpaid}`}>
                      {paymentStatusLabels[request.payment_status] || request.payment_status || "Unpaid"}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mb-3">
                    Invoice ID: {request.invoice_number || request.id} • Type: {request.type || "N/A"} • Created: {formatDate(request.submitted_at)}
                  </p>
                  {request.payment_status === 'on review' && (
                    <p className="text-amber-300 text-xs mt-2">Bank transfer receipt uploaded. Awaiting admin review.</p>
                  )}
                  <div className="flex items-baseline gap-2">
                    <span className="text-gray-400 text-sm">Total Due: </span>
                    <span className="text-lg font-semibold text-white">
                      {formatPrice(request.total_due, request.currency)}
                    </span>
                  </div>
                  {request.progress > 0 && (
                    <div className="mt-3 w-full bg-white/10 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-brand-400 to-brand-500 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(request.progress, 100)}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Right - Invoice button */}
                <div className="shrink-0 flex items-center gap-2">
                  {request.invoice_number && request.invoice_number !== "null" && request.total_due > 0 && request.payment_status !== 'fully paid' && request.payment_status !== 'paid' && request.payment_status !== 'on review' && (
                    <button
                      onClick={() => {
                        setSelectedInvoice({
                          invoice_id: request.invoice_number,
                          project_name: request.title,
                          total_due: request.total_due,
                          currency: request.currency,
                          bank_account_id: request.bank_account_id,
                          bank_account_bank: request.bank_account_bank,
                          bank_account_number: request.bank_account_number,
                          bank_account_name: request.bank_account_name,
                          bank_account_branch: request.bank_account_branch,
                        });
                        setIsPayModalOpen(true);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-3xl bg-gradient-to-r from-blue-600 to-cyan-600 text-sm font-medium text-white hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4" />
                      Pay Now
                    </button>
                  )}
                  {request.invoice_number && request.invoice_number !== "null" ? (
                    <Link href={`/dashboard/invoice/${request.invoice_number}`}>
                      <button className="inline-flex items-center gap-2 px-4 py-2 rounded-3xl bg-white/10 border border-white/10 text-sm font-medium text-white hover:bg-white/20 transition-colors cursor-pointer">
                        <Eye className="w-4 h-4" />
                        View Invoice
                      </button>
                    </Link>
                  ) : (
                    <span className="text-xs text-gray-500 italic px-2">No Invoice</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-12 text-center">
          <Package className="w-16 h-16 text-gray-600 mx-auto mb-6" />
          <h3 className="text-2xl font-semibold text-white mb-2">No Invoices Yet</h3>
          <p className="text-gray-400 mb-6">
            Submit your first service request to get started with Frametoque.
          </p>
          <Link
            href="/dashboard/services"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-3xl bg-gradient-to-r from-brand-600 to-brand-700 text-white font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="w-5 h-5" />
            Browse Services
          </Link>
        </div>
      )}

      {/* Pay Modal */}
      <PayModal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        invoice={selectedInvoice}
      />
    </div>
  );
}