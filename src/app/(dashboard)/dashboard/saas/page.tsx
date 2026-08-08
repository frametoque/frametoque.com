"use client";

import React, { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Cloud, Clock, Check, Search, RefreshCw, Mail, DollarSign } from "lucide-react";
import { SaaSOrder, getClientSaaSOrders } from "../../admin/actions/saas";

const formatUSD = (amount: number) => `$${amount.toFixed(2)}`;

export default function ClientSaaSPage() {
  const { user, isLoaded: isUserLoaded } = useUser();
  const [orders, setOrders] = useState<SaaSOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchOrders = async () => {
    if (!isUserLoaded) return;
    if (!user) {
      setError("Please sign in to view your SaaS subscriptions.");
      setLoading(false);
      return;
    }

    const email = user.primaryEmailAddress?.emailAddress;
    if (!email) {
      setError("No email address found for your account.");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await getClientSaaSOrders(email);
      setOrders(data);
    } catch (err: any) {
      console.error(err);
      setError("Failed to load your SaaS subscriptions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [isUserLoaded, user]);

  const filteredOrders = orders.filter((o) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!o.product_name.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center text-red-400 bg-red-500/10 border border-red-500/20 rounded-3xl mt-8">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 lg:space-y-10 lg:pt-8 animate-fade-in pb-20">
      
      {/* Header */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0c0c0e] to-black border border-white/5 p-8 sm:p-10">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <Cloud className="w-64 h-64 text-brand-500" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold mb-6">
            <Cloud className="w-4 h-4" />
            Software as a Service
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-4 leading-tight">
            My <span className="bg-gradient-to-r from-brand-400 to-brand-500 bg-clip-text text-transparent">SaaS</span> Subscriptions
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Manage your active SaaS products, view next billing dates, and access linked invoices.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Your Products
            <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-xs text-gray-300 font-medium">
              {orders.length}
            </span>
          </h2>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 outline-none focus:border-brand-500 transition-colors text-white text-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <RefreshCw className="w-8 h-8 animate-spin mb-4 text-brand-500" />
            <p>Loading your SaaS subscriptions...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-[#0c0c0e] border border-white/5 rounded-3xl p-12 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <Cloud className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">No Subscriptions Found</h3>
            <p className="text-gray-400 max-w-sm mx-auto">
              {searchQuery
                ? "No products matched your search."
                : "You don't have any active SaaS subscriptions right now."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrders.map((o) => (
              <div
                key={o.id}
                className="group relative bg-[#0c0c0e] border border-white/10 rounded-3xl overflow-hidden hover:border-brand-500/50 transition-all duration-300 hover:shadow-[0_0_30px_-5px_rgba(var(--brand-500-rgb),0.2)]"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-600/10 flex items-center justify-center border border-brand-500/20">
                        <Cloud className="w-5 h-5 text-brand-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-lg truncate max-w-[150px]" title={o.product_name}>
                          {o.product_name}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <span className="capitalize">{o.billing_cycle}</span>
                        </div>
                      </div>
                    </div>
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                        o.status === "active"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : o.status === "pending"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-red-500/10 text-red-400 border-red-500/20"
                      }`}
                    >
                      {o.status}
                    </span>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <div className="flex justify-between items-end">
                      <div className="text-gray-400 text-sm">Price</div>
                      <div className="text-lg font-bold text-white">
                        {formatUSD(o.price)}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center bg-white/5 rounded-xl p-3">
                      <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <Clock className="w-4 h-4" />
                        Next Billing
                      </div>
                      <div className="font-medium text-white text-sm">
                        {o.billing_date ? new Date(o.billing_date).toLocaleDateString() : "N/A"}
                      </div>
                    </div>

                    {o.invoice_id && (
                      <div className="pt-2">
                        <a 
                          href={`/dashboard/invoice/${o.invoice_id.replace('INV-', '')}`}
                          className="flex items-center justify-center gap-2 w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-semibold transition-colors"
                        >
                          <DollarSign className="w-4 h-4" />
                          Pay Invoice {o.invoice_id}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
