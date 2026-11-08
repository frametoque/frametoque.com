"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { FilePenLine, Eye, Calendar, Tag, AlertCircle, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { getAgreementsByClient, type AgreementData } from "../../admin/actions/agreements";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  signed:  { label: "Signed",  color: "text-green-400 bg-green-400/10 border-green-400/20",  icon: CheckCircle2 },
  pending: { label: "Pending Your Signature", color: "text-amber-400 bg-amber-400/10 border-amber-400/20",  icon: AlertCircle },
  expired: { label: "Expired", color: "text-red-400 bg-red-400/10 border-red-400/20",       icon: XCircle },
};

const formatLKR = (amount: number) =>
  new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR" }).format(amount || 0);

const formatDate = (d: string) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

export default function ClientAgreementsPage() {
  const { user, isLoaded: userLoaded } = useUser();
  const [agreements, setAgreements] = useState<AgreementData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userLoaded && user?.primaryEmailAddress?.emailAddress) {
      const email = user.primaryEmailAddress.emailAddress;
      
      const fetchClientAgreements = async () => {
        try {
          setLoading(true);
          const data = await getAgreementsByClient(email);
          // Filter out drafts from client view
          const visibleAgreements = data.filter(a => a.status !== 'draft');
          setAgreements(visibleAgreements);
        } catch (err) {
          console.error("Failed to load agreements:", err);
          setError("Failed to load your agreements. Please try again later.");
        } finally {
          setLoading(false);
        }
      };

      fetchClientAgreements();
    } else if (userLoaded && !user) {
      setLoading(false);
      setError("Please sign in to view your agreements.");
    }
  }, [userLoaded, user]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-brand-400 to-brand-500 bg-clip-text text-transparent">Agreements</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            Review and sign your service agreements with Frametoque Digital Media.
          </p>
        </div>
      </div>

      {/* Main List */}
      {loading ? (
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 animate-pulse space-y-4">
          <div className="h-6 bg-white/10 rounded-full w-48 mb-6" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex justify-between items-center py-4 border-b border-white/5 last:border-0">
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-white/10 rounded-full w-1/3" />
                <div className="h-3 bg-white/5 rounded-full w-1/4" />
              </div>
              <div className="h-6 bg-white/10 rounded-full w-20" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-6 text-center">
          <p className="text-red-400 font-semibold">{error}</p>
        </div>
      ) : agreements.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          {agreements.map((agreement) => {
            const statusKey = agreement.status === 'signed' ? 'signed' : (agreement.status === 'expired' ? 'expired' : 'pending');
            const sc = statusConfig[statusKey] || statusConfig.pending;
            const StatusIcon = sc.icon;
            
            return (
              <div
                key={agreement.id}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 hover:border-brand-500/30 transition-colors"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  {/* Info Column */}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-semibold text-white">{agreement.title}</h3>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full border ${sc.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {sc.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-400">
                      <p className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span>Date: {formatDate(agreement.agreement_date)}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Tag className="w-4 h-4 text-gray-500" />
                        <span>Type: {agreement.agreement_type}</span>
                      </p>
                    </div>

                    <div>
                      <span className="text-gray-400 text-sm">Agreement Value: </span>
                      <span className="text-lg font-bold text-brand-400">{formatLKR(agreement.total_fee)}</span>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="shrink-0">
                    <Link href={`/dashboard/agreements/${agreement.id}`}>
                      <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-3xl bg-brand-600 hover:bg-brand-500 text-sm font-semibold text-white transition-colors">
                        <Eye className="w-4 h-4" />
                        View & Sign
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-12 text-center">
          <FilePenLine className="w-16 h-16 text-gray-600 mx-auto mb-6" />
          <h3 className="text-2xl font-semibold text-white mb-2">No Agreements Found</h3>
          <p className="text-gray-400 max-w-md mx-auto">
            You don't have any agreements issued at this moment. If you are starting a new project, we will publish your contract here shortly.
          </p>
        </div>
      )}
    </div>
  );
}
