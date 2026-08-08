"use client";

import React, { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Cloud, Clock, Check, Search, RefreshCw, Mail, DollarSign } from "lucide-react";
import { SaaSOrder, getClientSaaSOrders } from "../../admin/actions/saas";


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
    <div className="space-y-8 pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-brand-400 to-brand-500 bg-clip-text text-transparent">SaaS</span>
            <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">&nbsp;Subscriptions</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl">
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
          <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400 text-sm bg-white/[0.02]">
                    <th className="p-5 font-medium">Product</th>
                    <th className="p-5 font-medium text-right">Price</th>
                    <th className="p-5 font-medium">Next Billing</th>
                    <th className="p-5 font-medium text-center">Status</th>
                    <th className="p-5 font-medium text-right">Invoice & Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-white/5 transition-colors border-t border-white/5">
                      {/* Product Name */}
                      <td className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-brand-400/10 text-brand-400">
                            <Cloud className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="font-bold text-white text-base block">{o.product_name}</span>
                            <span className="text-[10px] text-gray-500 capitalize">
                              {o.billing_cycle}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="p-5 text-right">
                        <div className="text-white font-semibold whitespace-nowrap">
                          LKR {o.price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                          <span className="text-gray-400 text-xs font-normal">/{o.billing_cycle}</span>
                        </div>
                      </td>

                      {/* Next Billing */}
                      <td className="p-5 text-gray-300">
                        {o.billing_date ? (
                          <div>
                            {new Date(o.billing_date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                        ) : (
                          <span className="text-gray-500 italic text-xs">N/A</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-5 text-center">
                        <span
                          className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border uppercase tracking-wider ${
                            o.status === "active"
                              ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                              : o.status === "pending"
                              ? "text-amber-400 bg-amber-400/10 border-amber-400/20"
                              : "text-red-400 bg-red-400/10 border-red-400/20"
                          }`}
                        >
                          {o.status}
                        </span>
                      </td>

                      {/* Invoice & Actions */}
                      <td className="p-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {o.invoice_id && o.invoice_id !== "null" && o.invoice_id.trim() !== "" && o.payment_status ? (
                            <a
                              href={`/dashboard/invoice/${o.invoice_id.replace('INV-', '')}`}
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-3xl hover:opacity-95 transition-opacity text-xs cursor-pointer shadow-lg shadow-blue-500/10"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              Pay {o.invoice_id}
                            </a>
                          ) : (
                            <span className="text-gray-500 italic text-xs flex items-center gap-1.5 bg-white/5 border border-white/5 py-1 px-3 rounded-full">
                              No Invoice
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
