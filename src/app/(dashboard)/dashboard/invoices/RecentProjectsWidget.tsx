"use client";

import Link from "next/link";
import { Package, ArrowRight, Eye } from "lucide-react";
import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";

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
};

const paymentStatusLabels = {
  "fully paid": "Fully Paid",
  unpaid: "Unpaid",
  "advance-paid": "Advance Paid",
  "partially paid": "Partially Paid",
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default function RecentProjectsWidget() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { user, isLoaded: isUserLoaded } = useUser();

  useEffect(() => {
    if (isUserLoaded && user?.primaryEmailAddress?.emailAddress) {
      const fetchRequests = async () => {
        try {
          setLoading(true);
          const userEmail = user.primaryEmailAddress.emailAddress;
          const response = await fetch(
            `/api/requests?user_email=${encodeURIComponent(userEmail)}`,
            { cache: "no-store" }
          );

          if (!response.ok) throw new Error("Failed to fetch requests");

          const data = await response.json();
          setRequests(data.slice(0, 3));
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };

      fetchRequests();
    } else if (isUserLoaded && !user) {
      setLoading(false);
    }
  }, [isUserLoaded, user]);

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Recent Invoices</h2>
        <Link
          href="/dashboard/invoices"
          className="inline-flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300 transition-colors font-medium"
        >
          View All
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="text-center py-6">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && requests.length === 0 && (
        <div className="text-center py-8">
          <Package className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No invoices yet.</p>
          <Link
            href="/dashboard/services"
            className="inline-block mt-3 text-sm text-brand-400 hover:text-brand-300 transition-colors"
          >
            Browse Services →
          </Link>
        </div>
      )}

      {/* Request List */}
      {!loading && !error && requests.length > 0 && (
        <div className="space-y-3">
          {requests.map((request) => (
            <div
              key={request.id}
              className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-brand-500/20 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {request.title}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">
                  {request.request_id} •{" "}
                  {request.submitted_at ? formatDate(request.submitted_at) : "N/A"}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`px-2.5 py-1 text-xs font-medium rounded-full border ${
                    workStatusStyles[request.status] || workStatusStyles.pending
                  }`}
                >
                  {request.status || "pending"}
                </span>

                <span
                  className={`px-2.5 py-1 text-xs font-medium rounded-full border ${
                    paymentStatusStyles[request.payment_status] || paymentStatusStyles.unpaid
                  }`}
                >
                  {paymentStatusLabels[request.payment_status] || request.payment_status || "Unpaid"}
                </span>

                {request.invoice_number && request.invoice_number !== "null" ? (
                  <Link href={`/dashboard/invoice/${request.invoice_number}`}>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-3xl bg-white/10 border border-white/10 text-xs font-medium text-white hover:bg-white/20 transition-colors">
                      <Eye className="w-3.5 h-3.5" />
                      View Invoice
                    </button>
                  </Link>
                ) : (
                  <span className="text-xs text-gray-500 italic px-2">No Invoice</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}