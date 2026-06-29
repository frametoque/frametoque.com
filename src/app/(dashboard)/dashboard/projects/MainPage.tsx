"use client";

import Link from "next/link";
import { Package, MessageCircle, Plus, Eye } from "lucide-react";
import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";

const workStatusStyles = {
  "in progress": "bg-brand-500/20 text-brand-400 border-brand-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
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

const formatPrice = (price) => {
  if (!price || isNaN(parseFloat(price))) return "N/A";
  return `Rs. ${parseFloat(price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function DashboardProjectsPage() {
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { user, isLoaded: isUserLoaded } = useUser();

  useEffect(() => {
    if (isUserLoaded && user?.primaryEmailAddress?.emailAddress) {
      const fetchRequests = async () => {
        try {
          setLoading(true);
          const userEmail = user.primaryEmailAddress.emailAddress;
          const response = await fetch(`/api/requests?user_email=${encodeURIComponent(userEmail)}`);
          if (!response.ok) throw new Error('Failed to fetch requests');
          const data = await response.json();
          setMyRequests(data);
        } catch (err) {
          setError(err.message);
          console.error('Error fetching requests:', err);
        } finally {
          setLoading(false);
        }
      };

      fetchRequests();
    } else if (isUserLoaded && !user) {
      setLoading(false);
      setError("Please sign in to view your requests");
    }
  }, [isUserLoaded, user]);

  const PageShell = ({ children }) => (
    <div className="space-y-8">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">My</span>
            <span className="bg-gradient-to-r from-brand-400 to-brand-500 bg-clip-text text-transparent">&nbsp;Projects</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            Track the status of every service request you have made with Frametoque.
          </p>
        </div>
      </div>
      {children}
    </div>
  );

  if (!isUserLoaded || loading) {
    return (
      <PageShell>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-400">{!isUserLoaded ? "Loading..." : "Loading your projects..."}</div>
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-6 text-center">
          <p className="text-red-400">{error}</p>
        </div>
      </PageShell>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">My</span>
            <span className="bg-gradient-to-r from-brand-400 to-brand-500 bg-clip-text text-transparent">&nbsp;Projects</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            Track the status of every service request you have made with Frametoque.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/services"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-3xl bg-white/10 border border-white/10 text-white font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="w-5 h-5" />
            New Project
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
      {myRequests.length > 0 ? (
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
                  </div>
                  <p className="text-gray-400 text-sm mb-3">
                    Invoice: {request.invoice_number || request.id} • Type: {request.type || "N/A"} • Submitted: {formatDate(request.submitted_at)}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-gray-400 text-sm">Total: </span>
                    <span className="text-lg font-semibold text-white">
                      {formatPrice(request.price)}
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
                <div className="shrink-0">
                  <Link href={`/dashboard/invoice/${request.invoice_number}`}>
                    <button className="inline-flex items-center gap-2 px-4 py-2 rounded-3xl bg-white/10 border border-white/10 text-sm font-medium text-white hover:bg-white/20 transition-colors">
                      <Eye className="w-4 h-4" />
                      View Invoice
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-12 text-center">
          <Package className="w-16 h-16 text-gray-600 mx-auto mb-6" />
          <h3 className="text-2xl font-semibold text-white mb-2">No Projects Yet</h3>
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
    </div>
  );
}