"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Settings, Plus, CreditCard, Loader2 } from "lucide-react";
import { useUser } from "@clerk/nextjs";

export interface ClientDomainSummary {
  id: number;
  domain_uid?: string;
  domain_name: string;
  selling_price: string;
  renewal_price: string;
  status: string;
  expiry_date: string | null;
  created_at: string;
  invoice_id: string | null;
  payment_status: string | null;
  total_due: string | null;
  currency: string | null;
  zone_id?: string | null;
  locked?: boolean;
  auto_renew?: boolean;
}

interface RecentDomainsWidgetProps {
  onOpenPayModal?: (invoice: any) => void;
  hideIfEmpty?: boolean;
}

const statusBadgeStyles: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  pending_manual_registration: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  manual_review: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  expired: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

const statusLabels: Record<string, string> = {
  active: "Active",
  pending: "Pending",
  pending_manual_registration: "Processing",
  manual_review: "Reviewing",
  expired: "Expired",
};

export default function RecentDomainsWidget({ onOpenPayModal, hideIfEmpty = true }: RecentDomainsWidgetProps) {
  const [domains, setDomains] = useState<ClientDomainSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user, isLoaded: isUserLoaded } = useUser();

  const fetchDomains = async (showLoading = true) => {
    if (!user?.primaryEmailAddress?.emailAddress) return;
    try {
      if (showLoading) setLoading(true);
      const email = user.primaryEmailAddress.emailAddress;
      const res = await fetch(
        `/api/services/domains/client?user_email=${encodeURIComponent(email)}&t=${Date.now()}`,
        {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache, no-store, must-revalidate", Pragma: "no-cache" },
        }
      );
      if (!res.ok) throw new Error("Failed to fetch domains");
      const data = await res.json();
      setDomains(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Failed to load domains");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isUserLoaded && user) {
      fetchDomains(true);

      const handleFocus = () => fetchDomains(false);
      const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") fetchDomains(false);
      };
      const handlePageShow = () => fetchDomains(false);

      window.addEventListener("focus", handleFocus);
      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("pageshow", handlePageShow);
      window.addEventListener("domains:refresh", handleFocus);

      return () => {
        window.removeEventListener("focus", handleFocus);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("pageshow", handlePageShow);
        window.removeEventListener("domains:refresh", handleFocus);
      };
    } else if (isUserLoaded && !user) {
      setLoading(false);
    }
  }, [isUserLoaded, user]);

  // If client has no domains, hide the widget completely from the dashboard
  if (hideIfEmpty && domains.length === 0) {
    return null;
  }

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <span>Your Domains</span>
          {!loading && domains.length > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
              {domains.length}
            </span>
          )}
        </h2>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/domains"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/30 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register Domain</span>
          </Link>
          <Link
            href="/dashboard/domains"
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors font-medium cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-white/5 animate-pulse border border-white/5" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-6">
          <p className="text-red-400 text-xs">{error}</p>
        </div>
      ) : domains.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {domains.slice(0, 6).map((d) => {
            const rawStatus = (d.status || "active").toLowerCase();
            const badgeClass = statusBadgeStyles[rawStatus] || statusBadgeStyles.active;
            const statusLabel = statusLabels[rawStatus] || d.status;

            // Expiry calculation
            let expiryText = "—";
            let isExpired = false;
            if (d.expiry_date) {
              const exp = new Date(d.expiry_date);
              const now = new Date();
              const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              if (diffDays > 0) {
                expiryText = `Expires in ${diffDays}d • ${exp.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
              } else {
                isExpired = true;
                expiryText = `Expired ${Math.abs(diffDays)}d ago`;
              }
            }

            const isUnpaid =
              d.payment_status &&
              d.payment_status.toLowerCase() !== "paid" &&
              d.payment_status.toLowerCase() !== "fully paid" &&
              Number(d.total_due) > 0;

            const domainTarget = `/dashboard/domains/${d.domain_uid || d.id}`;

            return (
              <div
                key={d.id}
                className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-brand-500/30 transition-all space-y-3 group"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border ${badgeClass}`}
                  >
                    {statusLabel}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {isUnpaid && d.invoice_id && onOpenPayModal && (
                      <button
                        type="button"
                        onClick={() =>
                          onOpenPayModal({
                            invoice_id: d.invoice_id,
                            project_name: `Domain: ${d.domain_name}`,
                            total_due: d.total_due,
                            currency: d.currency || "LKR",
                          })
                        }
                        className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <CreditCard className="w-3 h-3" />
                        <span>Pay</span>
                      </button>
                    )}

                    <Link
                      href={domainTarget}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Settings className="w-3 h-3 text-gray-400" />
                      <span>Manage</span>
                    </Link>
                  </div>
                </div>

                <div>
                  <Link href={domainTarget} className="block group-hover:text-brand-400 transition-colors">
                    <h4 className="text-base font-bold text-white truncate">
                      {d.domain_name}
                    </h4>
                  </Link>

                  <p className={`text-[11px] mt-1 ${isExpired ? "text-rose-400" : "text-gray-400"}`}>
                    {expiryText}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

