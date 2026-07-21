"use client";

import { useEffect, useState } from "react";
import { getDomainOrders, updateDomainOrderStatus, deleteDomainOrder, updateDomainOrder, createDomainInvoice, DomainOrder } from "../actions/domains";
import { Globe, DollarSign, TrendingUp, AlertTriangle, Mail, Check, Search, Trash2, Edit2, X, Clock, FileText } from "lucide-react";

const formatLKR = (amount: number) =>
  new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR" }).format(amount || 0);

/** Only count domains where registration profit was actually realized. */
function countsTowardProfit(o: DomainOrder): boolean {
  const status = o.status.toLowerCase();
  if (status === "pending") return false;
  if (status === "active") return true;
  if (status === "expired") {
    // Include expired only if the domain was previously activated (invoice paid & expiry set)
    return !!(o.invoice_id && o.expiry_date);
  }
  return false;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<DomainOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState("All");

  // Activation & Invoice Modal States
  const [activationModalOpen, setActivationModalOpen] = useState(false);
  const [activeDomainId, setActiveDomainId] = useState<number | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'LKR'>('USD');
  const [activatingWithInvoice, setActivatingWithInvoice] = useState(false);

  // Edit Modal States
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<DomainOrder | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editDomain, setEditDomain] = useState("");
  const [editRegistrar, setEditRegistrar] = useState("Internet.bs");
  const [editRegCost, setEditRegCost] = useState("");
  const [editRegPrice, setEditRegPrice] = useState("");
  const [editRenewCost, setEditRenewCost] = useState("");
  const [editRenewPrice, setEditRenewPrice] = useState("");
  const [editStatus, setEditStatus] = useState("pending");
  const [editExpiry, setEditExpiry] = useState("");
  const [createRenewalInvoiceOnExpire, setCreateRenewalInvoiceOnExpire] = useState(true);
  const [expireCurrency, setExpireCurrency] = useState<"USD" | "LKR">("USD");
  const [savingEdit, setSavingEdit] = useState(false);

  // Expire Modal States
  const [expireModalOpen, setExpireModalOpen] = useState(false);
  const [expiringDomainId, setExpiringDomainId] = useState<number | null>(null);
  const [expiringDomainName, setExpiringDomainName] = useState("");
  const [expiringWithInvoice, setExpiringWithInvoice] = useState(false);
  const [lkrRate, setLkrRate] = useState(300);

  const usdToLkr = (usd: number) => usd * lkrRate;

  const formatUsdWithLkr = (usd: number) =>
    `$${usd.toFixed(2)} (${formatLKR(usdToLkr(usd))})`;

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await getDomainOrders();
      const now = new Date();
      const updatedData = [...data];
      for (let i = 0; i < updatedData.length; i++) {
        const o = updatedData[i];
        if (o.status.toLowerCase() === "active" && o.expiry_date && new Date(o.expiry_date) < now) {
          await updateDomainOrderStatus(o.id, "expired");
          updatedData[i] = { ...o, status: "expired" };
        }
      }
      setOrders(updatedData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch("https://open.er-api.com/v6/latest/USD")
      .then((res) => res.json())
      .then((data) => {
        if (data?.rates?.LKR) setLkrRate(data.rates.LKR);
      })
      .catch((e) => console.error("Failed to load LKR exchange rate", e));
  }, []);

  useEffect(() => {
    fetchOrders();

    const handleRefreshEvent = () => {
      fetchOrders();
    };
    window.addEventListener("domains:refresh", handleRefreshEvent);
    return () => {
      window.removeEventListener("domains:refresh", handleRefreshEvent);
    };
  }, []);

  const handleStatusChange = async (id: number, newStatus: string) => {
    setUpdatingId(id);
    try {
      const res = await updateDomainOrderStatus(id, newStatus);
      if (res.success) {
        setOrders((prev) =>
          prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o))
        );
        fetchOrders(); // reload expiry dates automatically
      } else {
        alert("Failed to update status: " + res.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleConfirmActivation = async () => {
    if (!activeDomainId) return;
    setActivatingWithInvoice(true);
    try {
      const res = await createDomainInvoice(activeDomainId, selectedCurrency);
      if (res.success) {
        alert(`Invoice ${res.invoiceId} created successfully!`);
        setActivationModalOpen(false);
        setActiveDomainId(null);
        fetchOrders();
      } else {
        alert("Failed to create invoice: " + res.error);
      }
    } catch (e: any) {
      console.error(e);
      alert("Error creating invoice: " + e.message);
    } finally {
      setActivatingWithInvoice(false);
    }
  };

  const handleDeleteOrder = async (id: number) => {
    if (confirm("Are you sure you want to delete this domain order?")) {
      try {
        const res = await deleteDomainOrder(id);
        if (res.success) {
          setOrders((prev) => prev.filter((o) => o.id !== id));
        } else {
          alert("Failed to delete order: " + res.error);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleOpenExpireModal = (order: DomainOrder) => {
    setExpiringDomainId(order.id);
    setExpiringDomainName(order.domain_name);
    setCreateRenewalInvoiceOnExpire(true);
    setExpireCurrency("USD");
    setExpireModalOpen(true);
  };

  const handleConfirmExpire = async () => {
    if (!expiringDomainId) return;
    setExpiringWithInvoice(true);
    try {
      const res = await updateDomainOrderStatus(expiringDomainId, "expired", {
        skipRenewalInvoice: !createRenewalInvoiceOnExpire,
        currency: expireCurrency,
      });
      if (res.success) {
        if (res.skippedInvoice) {
          alert("Domain marked as expired without creating a renewal invoice.");
        } else if (res.invoiceId) {
          alert(
            res.alreadyExists
              ? `Domain marked as expired. Existing renewal invoice ${res.invoiceId} is still open.`
              : `Domain marked as expired. Renewal invoice ${res.invoiceId} created.`
          );
        } else {
          alert("Domain marked as expired.");
        }
        setExpireModalOpen(false);
        setExpiringDomainId(null);
        await fetchOrders();
      } else {
        alert("Failed to mark domain as expired: " + res.error);
      }
    } catch (err: any) {
      console.error(err);
      alert("Error marking domain as expired: " + err.message);
    } finally {
      setExpiringWithInvoice(false);
    }
  };

  const handleOpenEditModal = (order: DomainOrder) => {
    setSelectedOrder(order);
    setEditEmail(order.client_email);
    setEditDomain(order.domain_name);
    setEditRegistrar(order.registrar || "Internet.bs");
    setEditRegCost(String(order.actual_price));
    setEditRegPrice(String(order.selling_price));
    setEditRenewCost(String(order.renewal_cost || 14.25));
    setEditRenewPrice(String(order.renewal_price || 19.99));
    setEditStatus(order.status);
    setEditExpiry(order.expiry_date ? order.expiry_date.split("T")[0] : "");
    setCreateRenewalInvoiceOnExpire(true);
    setExpireCurrency("USD");
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setSavingEdit(true);
    const regCostNum = parseFloat(editRegCost) || 0;
    const regPriceNum = parseFloat(editRegPrice) || 0;
    const renewCostNum = parseFloat(editRenewCost) || 0;
    const renewPriceNum = parseFloat(editRenewPrice) || 0;
    const isBecomingExpired =
      editStatus.toLowerCase() === "expired" &&
      selectedOrder.status.toLowerCase() !== "expired";

    try {
      const res = await updateDomainOrder(
        selectedOrder.id,
        {
          client_email: editEmail,
          domain_name: editDomain,
          actual_price: regCostNum,
          selling_price: regPriceNum,
          profit: regPriceNum - regCostNum,
          renewal_cost: renewCostNum,
          renewal_price: renewPriceNum,
          registrar: editRegistrar,
          expiry_date: editExpiry,
          status: editStatus,
        },
        isBecomingExpired
          ? {
              skipRenewalInvoice: !createRenewalInvoiceOnExpire,
              currency: expireCurrency,
            }
          : undefined
      );

      if (res.success) {
        if (isBecomingExpired) {
          if (res.skippedInvoice) {
            alert("Domain marked as expired without creating a renewal invoice.");
          } else if (res.invoiceId) {
            alert(
              res.alreadyExists
                ? `Domain marked as expired. Existing renewal invoice ${res.invoiceId} is still open.`
                : `Domain marked as expired. Renewal invoice ${res.invoiceId} created.`
            );
          }
        }
        setEditModalOpen(false);
        await fetchOrders();
      } else {
        alert("Failed to save changes: " + res.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingEdit(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "text-green-400 bg-green-400/10 border border-green-400/20";
      case "pending":
        return "text-amber-400 bg-amber-400/10 border border-amber-400/20";
      case "expired":
        return "text-red-400 bg-red-400/10 border border-red-400/20";
      default:
        return "text-gray-400 bg-gray-400/10 border border-gray-400/20";
    }
  };

  // Filter orders based on search query and status filter
  const filteredOrders = orders.filter((o) => {
    const statusMatch = activeFilter === "All" || o.status.toLowerCase() === activeFilter.toLowerCase();
    const searchMatch =
      o.domain_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.client_email.toLowerCase().includes(searchQuery.toLowerCase());
    return statusMatch && searchMatch;
  });

  // Summaries — profit totals exclude pending and never-activated expired domains
  const totalDomains = orders.length;
  const activeDomains = orders.filter((o) => o.status === "active").length;
  const profitOrders = orders.filter(countsTowardProfit);
  const totalCost = profitOrders.reduce((sum, o) => sum + o.actual_price, 0);
  const totalRevenue = profitOrders.reduce((sum, o) => sum + o.selling_price, 0);
  const totalProfit = totalRevenue - totalCost;

  return (
    <div className="space-y-6 pb-10 mt-2">

      {/* Main List Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search domains..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-full pl-11 pr-4 py-2.5 outline-none focus:border-brand-500 transition-colors text-sm text-white"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {["All", "Pending", "Active", "Expired"].map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                activeFilter === f
                  ? "bg-white text-black"
                  : "bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <span className="text-gray-400 text-xs font-medium self-end lg:self-auto">
        Showing {filteredOrders.length} of {orders.length} entries
      </span>
    </div>

      {/* Table Container */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto w-full">
          {loading ? (
            <div className="py-20 flex justify-center items-center">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-20 text-center text-gray-500 text-sm font-medium">
              No domain registrations found matching search criteria.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 text-sm bg-white/[0.02]">
                  <th className="p-4 font-medium">Domain & Client</th>
                  <th className="p-4 font-medium text-right">Reg. Cost / Retail</th>
                  <th className="p-4 font-medium text-right text-brand-400">Reg. Profit</th>
                  <th className="p-4 font-medium text-right">Renewal Cost / Retail</th>
                  <th className="p-4 font-medium text-right text-brand-400">Renewal Profit</th>
                  <th className="p-4 font-medium">Expiry Date</th>
                  <th className="p-4 font-medium text-center">Status</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredOrders.map((o) => {
                  const daysToExpiry = Math.ceil(
                    (new Date(o.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  );
                  const isExpiringSoon = daysToExpiry > 0 && daysToExpiry <= 30;
                  const regProfit = o.selling_price - o.actual_price;
                  const renewCost = o.renewal_cost || 14.25;
                  const renewPrice = o.renewal_price || 19.99;
                  const renewProfit = renewPrice - renewCost;

                  return (
                    <tr key={o.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-white flex items-center gap-1.5 flex-wrap">
                          <Globe className="w-4 h-4 text-brand-400" />
                          {o.domain_name}
                          <span className="text-[10px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-gray-400 font-medium">
                            {o.registrar || 'Internet.bs'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-gray-500" />
                          {o.client_email}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-1.5 flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-gray-500 shrink-0" />
                          <span>Ordered: {o.created_at ? new Date(o.created_at).toLocaleDateString() : (o.purchase_date ? new Date(o.purchase_date).toLocaleDateString() : 'N/A')}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right text-sm">
                        <div className="text-gray-400">{formatUsdWithLkr(o.actual_price)}</div>
                        <div className="text-white font-medium mt-0.5">{formatUsdWithLkr(o.selling_price)}</div>
                      </td>
                      <td className="p-4 text-right font-semibold text-brand-400">
                        {formatUsdWithLkr(regProfit)}
                      </td>
                      <td className="p-4 text-right text-sm">
                        <div className="text-gray-400">{formatUsdWithLkr(renewCost)}</div>
                        <div className="text-white font-medium mt-0.5">{formatUsdWithLkr(renewPrice)}</div>
                      </td>
                      <td className="p-4 text-right font-semibold text-brand-400">
                        {formatUsdWithLkr(renewProfit)}
                      </td>
                      <td className="p-4">
                        {o.status.toLowerCase() === "pending" || !o.expiry_date ? (
                          <span className="text-gray-500 font-medium text-xs">Not Active Yet</span>
                        ) : (
                          <>
                            <div className="text-white">
                              {new Date(o.expiry_date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </div>
                            {isExpiringSoon && (
                              <span className="text-[10px] text-red-400 font-semibold flex items-center gap-1 mt-1">
                                <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                Expiring in {daysToExpiry} days!
                              </span>
                            )}
                          </>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full border ${getStatusColor(o.status)}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-1">
                          {o.status === "pending" && (
                            <>
                              {!o.invoice_id ? (
                                <button
                                  onClick={() => {
                                    setActiveDomainId(o.id);
                                    setSelectedCurrency('USD');
                                    setActivationModalOpen(true);
                                  }}
                                  disabled={updatingId !== null}
                                  title="Create Invoice"
                                  className="p-2 hover:bg-blue-400/10 text-gray-400 hover:text-blue-400 rounded-xl transition-colors flex items-center justify-center cursor-pointer"
                                >
                                  <FileText className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleStatusChange(o.id, "active")}
                                  disabled={updatingId !== null}
                                  title="Mark as Registered/Active"
                                  className="p-2 hover:bg-green-400/10 text-gray-400 hover:text-green-400 rounded-xl transition-colors flex items-center justify-center cursor-pointer"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}

                          {o.status?.toLowerCase() === "active" && (
                            <button
                              onClick={() => handleOpenExpireModal(o)}
                              disabled={updatingId !== null}
                              title="Mark as Expired"
                              className="p-2 hover:bg-red-400/10 text-gray-400 hover:text-red-400 rounded-xl transition-colors flex items-center justify-center cursor-pointer"
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenEditModal(o)}
                            className="p-2 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-colors flex items-center justify-center"
                            title="Edit Order"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          
                          <a
                            href={`mailto:${o.client_email}?subject=Domain Renewal Reminder: ${o.domain_name}&body=Hi client,%0D%0A%0D%0AThis is a reminder that your domain registration for ${o.domain_name} expires on ${new Date(o.expiry_date).toLocaleDateString()} (${daysToExpiry} days remaining).%0D%0A%0D%0APlease let us know if you want us to handle the renewal for another year.%0D%0A%0D%0AThank you!`}
                            className="p-2 hover:bg-brand-400/10 text-gray-400 hover:text-brand-400 rounded-xl transition-colors flex items-center justify-center"
                            title="Send Expiry Reminder Email"
                          >
                            <Mail className="w-4 h-4" />
                          </a>

                          {o.status?.toLowerCase() !== "active" && (
                            <button
                              onClick={() => handleDeleteOrder(o.id)}
                              className="p-2 hover:bg-red-400/10 text-gray-400 hover:text-red-400 rounded-xl transition-colors flex items-center justify-center"
                              title="Delete Order"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-black border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-white">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-semibold text-white">Edit Domain Order</h2>
              <button onClick={() => setEditModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Domain Name</label>
                  <input
                    type="text"
                    required
                    value={editDomain}
                    onChange={(e) => setEditDomain(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Client Email</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Registrar Source</label>
                  <select
                    value={editRegistrar}
                    onChange={(e) => setEditRegistrar(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors"
                  >
                    <option value="Cloudflare" className="bg-black text-white">Cloudflare</option>
                    <option value="Internet.bs" className="bg-black text-white">Internet.bs</option>
                    <option value="Namecheap" className="bg-black text-white">Namecheap</option>
                    <option value="GoDaddy" className="bg-black text-white">GoDaddy</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors"
                  >
                    <option value="pending" className="bg-black text-white">Pending</option>
                    <option value="active" className="bg-black text-white">Active</option>
                    <option value="expired" className="bg-black text-white">Expired</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={editExpiry}
                    onChange={(e) => setEditExpiry(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>

              {editStatus.toLowerCase() === "expired" &&
                selectedOrder.status.toLowerCase() !== "expired" && (
                  <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-4 space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-red-300">Expiry billing</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Choose whether to generate a renewal invoice so the client can pay again.
                      </p>
                    </div>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={createRenewalInvoiceOnExpire}
                        onChange={(e) => setCreateRenewalInvoiceOnExpire(e.target.checked)}
                        className="mt-1 rounded border-white/20 bg-white/5"
                      />
                      <span className="text-sm text-gray-300">
                        Create renewal invoice at ${parseFloat(editRenewPrice || "0").toFixed(2)} USD
                      </span>
                    </label>

                    {createRenewalInvoiceOnExpire && (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-400 block">Renewal Invoice Currency</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setExpireCurrency("USD")}
                            className={`py-2.5 px-4 rounded-2xl border text-sm font-semibold transition-all cursor-pointer ${
                              expireCurrency === "USD"
                                ? "border-brand-500 bg-brand-500/10 text-white"
                                : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            USD ($)
                          </button>
                          <button
                            type="button"
                            onClick={() => setExpireCurrency("LKR")}
                            className={`py-2.5 px-4 rounded-2xl border text-sm font-semibold transition-all cursor-pointer ${
                              expireCurrency === "LKR"
                                ? "border-brand-500 bg-brand-500/10 text-white"
                                : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            LKR (Rs.)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              <div className="grid sm:grid-cols-2 gap-4 border-t border-white/5 pt-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Purchase Cost (Our Cost - Registration)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editRegCost}
                    onChange={(e) => setEditRegCost(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Selling Price (Client Price - Registration)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editRegPrice}
                    onChange={(e) => setEditRegPrice(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Purchase Cost (Our Cost - Renewal)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editRenewCost}
                    onChange={(e) => setEditRenewCost(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Selling Price (Client Price - Renewal)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editRenewPrice}
                    onChange={(e) => setEditRenewPrice(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-2xl font-semibold transition-colors text-sm text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-semibold transition-colors text-sm disabled:opacity-50"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expire Domain Modal */}
      {expireModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
          <div className="bg-neutral-900 border border-white/10 rounded-3xl w-full max-w-md p-6 relative shadow-2xl">
            <button
              onClick={() => setExpireModalOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-white mb-2">Mark Domain as Expired</h3>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              Expire <span className="text-white font-semibold">{expiringDomainName}</span>. You can optionally create a renewal invoice so the client can pay again.
            </p>

            <div className="space-y-4 mb-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createRenewalInvoiceOnExpire}
                  onChange={(e) => setCreateRenewalInvoiceOnExpire(e.target.checked)}
                  className="mt-1 rounded border-white/20 bg-white/5"
                />
                <span className="text-sm text-gray-300">
                  Create renewal invoice for client payment
                </span>
              </label>

              {createRenewalInvoiceOnExpire ? (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-400 block">Billing Currency</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setExpireCurrency("USD")}
                      className={`py-3 px-4 rounded-2xl border text-sm font-semibold transition-all cursor-pointer text-center ${
                        expireCurrency === "USD"
                          ? "border-brand-500 bg-brand-500/10 text-white"
                          : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      USD ($)
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpireCurrency("LKR")}
                      className={`py-3 px-4 rounded-2xl border text-sm font-semibold transition-all cursor-pointer text-center ${
                        expireCurrency === "LKR"
                          ? "border-brand-500 bg-brand-500/10 text-white"
                          : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      LKR (Rs.)
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-amber-300/90 bg-amber-400/10 border border-amber-400/20 rounded-2xl px-4 py-3">
                  No invoice will be created. Use this when the client has confirmed they will not renew.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => setExpireModalOpen(false)}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-2xl font-semibold transition-colors text-sm text-gray-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmExpire}
                disabled={expiringWithInvoice}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-semibold transition-colors text-sm disabled:opacity-50 cursor-pointer"
              >
                {expiringWithInvoice ? "Expiring..." : "Confirm Expire"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activation & Currency Selection Modal */}
      {activationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
          <div className="bg-neutral-900 border border-white/10 rounded-3xl w-full max-w-md p-6 relative shadow-2xl">
            <button
              onClick={() => setActivationModalOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-white mb-2">Activate Domain & Generate Invoice</h3>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              Before activating the domain, please select the billing currency. If LKR is selected, the pricing will automatically convert using real-time currency rates.
            </p>

            <div className="space-y-4 mb-6">
              <label className="text-xs font-semibold text-gray-400 block">Billing Currency</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedCurrency('USD')}
                  className={`py-3 px-4 rounded-2xl border text-sm font-semibold transition-all cursor-pointer text-center ${
                    selectedCurrency === 'USD'
                      ? 'border-brand-500 bg-brand-500/10 text-white'
                      : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  USD ($)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCurrency('LKR')}
                  className={`py-3 px-4 rounded-2xl border text-sm font-semibold transition-all cursor-pointer text-center ${
                    selectedCurrency === 'LKR'
                      ? 'border-brand-500 bg-brand-500/10 text-white'
                      : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  LKR (Rs.)
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => setActivationModalOpen(false)}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-2xl font-semibold transition-colors text-sm text-gray-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmActivation}
                disabled={activatingWithInvoice}
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-semibold transition-colors text-sm disabled:opacity-50 cursor-pointer"
              >
                {activatingWithInvoice ? "Activating..." : "Confirm & Activate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
