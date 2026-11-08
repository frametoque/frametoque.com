"use client";

import Link from "next/link";
import { FileText, ArrowRight, Calendar, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";

const statusStyles: Record<string, string> = {
  "client-draft": "bg-slate-500/20 text-slate-400 border-slate-500/30",
  "sent": "bg-brand-500/20 text-brand-400 border-brand-500/30",
  "accepted": "bg-green-500/20 text-green-400 border-green-500/30",
  "declined": "bg-red-500/20 text-red-400 border-red-500/30",
  "expired": "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const statusLabels: Record<string, string> = {
  "client-draft": "Draft",
  "sent": "Sent",
  "accepted": "Accepted",
  "declined": "Declined",
  "expired": "Expired",
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default function RecentQuotationsWidget() {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user, isLoaded: isUserLoaded } = useUser();

  useEffect(() => {
    if (isUserLoaded && user?.primaryEmailAddress?.emailAddress) {
      const fetchQuotations = async () => {
        try {
          setLoading(true);
          const email = user.primaryEmailAddress.emailAddress;
          const res = await fetch(`/api/quotation?user_email=${encodeURIComponent(email)}`, { cache: "no-store" });
          if (!res.ok) throw new Error("Failed to fetch quotations");
          const data = await res.json();
          setQuotations(data.slice(0, 3));
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchQuotations();
    } else if (isUserLoaded && !user) {
      setLoading(false);
    }
  }, [isUserLoaded, user]);

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Recent Quotations</h2>
        <Link
          href="/dashboard/quotations"
          className="inline-flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300 transition-colors font-medium"
        >
          View All
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center items-center py-10 text-gray-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
          <span>Loading quotations...</span>
        </div>
      ) : error ? (
        <div className="text-center py-6">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      ) : quotations.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No quotations yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {quotations.map((q) => {
            const statusClass = statusStyles[q.status] || "bg-slate-500/20 text-slate-400 border-slate-500/30";
            const statusLabel = statusLabels[q.status] || q.status;
            return (
              <div
                key={q.id}
                className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-brand-500/20 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    QT-{String(q.id).padStart(5, "0")}
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5 flex flex-wrap gap-x-2 items-center">
                    <span className="flex items-center gap-0.5">
                      <Calendar className="w-3 h-3 text-gray-600" />
                      {formatDate(q.date)}
                    </span>
                    {q.category && (
                      <>
                        <span>•</span>
                        <span className="truncate">{q.category}</span>
                      </>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-bold text-brand-400">
                      {parseFloat(String(q.amount)).toLocaleString("en-US")} LKR
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${statusClass}`}>
                    {statusLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
