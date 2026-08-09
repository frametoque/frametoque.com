"use client";

import React, { useEffect, useState } from "react";
import {
  getSaaSOrders,
  addSaaSOrder,
  updateSaaSOrder,
  deleteSaaSOrder,
  createSaaSInvoice,
  getSaaSProducts,
  getTotalSaaSRevenueSoFar,
  getSaaSInvoices,
  SaaSOrder
} from "../actions/saas";
import { getClients, createClient } from "../actions/actions";
import { getAgreements, AgreementData } from "../actions/agreements";
import {
  Cloud, Server, Shield, HardDrive, Cpu, Settings, Plus, Edit2, Trash2, X, FileText, Globe, Mail, Clock, Check, Search, AlertTriangle, TrendingUp, ChevronLeft, ChevronRight, Upload, Lock, RefreshCw, DollarSign, ChevronDown, ChevronUp, Eye
} from "lucide-react";
import Link from "next/link";
import AnimatedNumber from "../components/AnimatedNumber";
import { StatCard } from "@/components/ui/StatCard";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { PageHeader } from "@/components/ui/PageHeader";
const formatLKR = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "LKR" }).format(amount);

export default function SaaSPage() {
  const [orders, setOrders] = useState<SaaSOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [productFilter, setProductFilter] = useState("All");

  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<string[]>([]);
  const [agreements, setAgreements] = useState<AgreementData[]>([]);
  const [revenueSoFar, setRevenueSoFar] = useState<number>(0);
  const [saasInvoices, setSaasInvoices] = useState<any[]>([]);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SaaSOrder | null>(null);

  // Add form states
  const [addEmail, setAddEmail] = useState("");
  const [addProduct, setAddProduct] = useState("");
  const [addCustomProduct, setAddCustomProduct] = useState("");
  const [addPrice, setAddPrice] = useState("");
  const [addBillingCycle, setAddBillingCycle] = useState("monthly");
  const [addBillingDate, setAddBillingDate] = useState("");
  const [addStatus, setAddStatus] = useState("active");
  const [addSystemUrl, setAddSystemUrl] = useState("");
  const [addDemoUrl, setAddDemoUrl] = useState("");
  const [addAgreementId, setAddAgreementId] = useState("");
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientData, setNewClientData] = useState({ name: "", email: "" });

  // Edit form states
  const [editEmail, setEditEmail] = useState("");
  const [editProduct, setEditProduct] = useState("");
  const [editCustomProduct, setEditCustomProduct] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editBillingCycle, setEditBillingCycle] = useState("monthly");
  const [editBillingDate, setEditBillingDate] = useState("");
  const [editStatus, setEditStatus] = useState("active");
  const [editSystemUrl, setEditSystemUrl] = useState("");
  const [editDemoUrl, setEditDemoUrl] = useState("");
  const [editAgreementId, setEditAgreementId] = useState("");
  const [showEditNewClientForm, setShowEditNewClientForm] = useState(false);
  const [editNewClientData, setEditNewClientData] = useState({ name: "", email: "" });

  // Action states
  const [savingEdit, setSavingEdit] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState<number | null>(null);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [data, cls, prods, agrs, revSoFar, invoicesData] = await Promise.all([
        getSaaSOrders(),
        getClients(),
        getSaaSProducts(),
        getAgreements(),
        getTotalSaaSRevenueSoFar(),
        getSaaSInvoices()
      ]);
      setOrders(data);
      setClients(cls);
      setProducts(prods);
      setAgreements(agrs);
      setRevenueSoFar(revSoFar);
      setSaasInvoices(invoicesData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();

    const handleOpenAdd = () => {
      setAddEmail("");
      setAddProduct("");
      setAddCustomProduct("");
      setAddPrice("");
      setAddBillingCycle("monthly");
      setAddBillingDate("");
      setAddStatus("active");
      setAddSystemUrl("");
      setAddDemoUrl("");
      setAddAgreementId("");
      setShowNewClientForm(false);
      setNewClientData({ name: "", email: "" });
      setIsAddModalOpen(true);
    };

    window.addEventListener("saas:open-add", handleOpenAdd);
    window.addEventListener("saas:refresh", fetchInitialData);
    return () => {
      window.removeEventListener("saas:open-add", handleOpenAdd);
      window.removeEventListener("saas:refresh", fetchInitialData);
    };
  }, []);

  const createClientIfNeeded = async (emailOrNew: string, newClientObj: { name: string, email: string }) => {
    if (emailOrNew === "new") {
      if (!newClientObj.name || !newClientObj.email) {
        throw new Error("Client name and email are required for a new client.");
      }
      await createClient({
        name: newClientObj.name,
        email: newClientObj.email,
        company: null, phone: null, address: null, legal_name: null
      });
      return newClientObj.email;
    }
    return emailOrNew;
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEdit(true);
    
    try {
      const finalEmail = await createClientIfNeeded(addEmail, newClientData);
      const finalProduct = addProduct === "new" ? addCustomProduct : addProduct;

      if (!finalProduct) throw new Error("Product name is required.");
      if (!finalEmail) throw new Error("Client email is required.");

      const priceNum = parseFloat(addPrice) || 0;

      const res = await addSaaSOrder({
        client_email: finalEmail,
        product_name: finalProduct,
        price: priceNum,
        billing_cycle: addBillingCycle,
        billing_date: addBillingDate || null,
        status: addStatus,
        agreement_id: addAgreementId || null,
        invoice_id: null,
        system_url: addSystemUrl || null,
        demo_url: addDemoUrl || null
      });

      if (res.success) {
        setIsAddModalOpen(false);
        fetchInitialData();
      } else {
        alert("Failed to add SaaS order: " + res.error);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleOpenEditModal = (order: SaaSOrder) => {
    setSelectedOrder(order);
    
    if (products.includes(order.product_name)) {
      setEditProduct(order.product_name);
      setEditCustomProduct("");
    } else {
      setEditProduct("new");
      setEditCustomProduct(order.product_name);
    }

    setEditEmail(order.client_email);
    setEditPrice(String(order.price));
    setEditBillingCycle(order.billing_cycle);
    setEditBillingDate(order.billing_date ? order.billing_date.split("T")[0] : "");
    setEditStatus(order.status);
    setEditSystemUrl(order.system_url || "");
    setEditDemoUrl(order.demo_url || "");
    setEditAgreementId(order.agreement_id || "");
    setShowEditNewClientForm(false);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setSavingEdit(true);

    try {
      const finalEmail = await createClientIfNeeded(editEmail, editNewClientData);
      const finalProduct = editProduct === "new" ? editCustomProduct : editProduct;

      if (!finalProduct) throw new Error("Product name is required.");
      if (!finalEmail) throw new Error("Client email is required.");

      const priceNum = parseFloat(editPrice) || 0;

      const res = await updateSaaSOrder(selectedOrder.id, {
        client_email: finalEmail,
        product_name: finalProduct,
        price: priceNum,
        billing_cycle: editBillingCycle,
        billing_date: editBillingDate || null,
        status: editStatus,
        system_url: editSystemUrl || null,
        demo_url: editDemoUrl || null,
        agreement_id: editAgreementId || null
      });

      if (res.success) {
        setIsEditModalOpen(false);
        fetchInitialData();
      } else {
        alert("Failed to update SaaS order: " + res.error);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this SaaS product?")) return;
    const res = await deleteSaaSOrder(id);
    if (res.success) {
      fetchInitialData();
    } else {
      alert("Failed to delete SaaS order: " + res.error);
    }
  };

  const handleGenerateInvoice = async (id: number) => {
    setGeneratingInvoice(id);
    try {
      const res = await createSaaSInvoice(id, "LKR");
      if (res.success) {
        alert("Invoice created successfully: " + res.invoiceId);
        fetchInitialData();
      } else {
        alert("Failed to create invoice: " + res.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingInvoice(null);
    }
  };

  const formatBillingDate = (dateString: string, cycle: string) => {
    if (!dateString) return "N/A";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "N/A";
    
    if (cycle.toLowerCase() === "monthly") {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (activeFilter === "Active" && o.status !== "active") return false;
    if (activeFilter === "Pending" && o.status !== "pending") return false;
    if (activeFilter === "Cancelled" && o.status === "active") return false;
    
    if (productFilter !== "All" && o.product_name !== productFilter) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !o.product_name.toLowerCase().includes(q) &&
        !o.client_email.toLowerCase().includes(q) &&
        !(o.system_url && o.system_url.toLowerCase().includes(q))
      ) {
        return false;
      }
    }
    return true;
  });

  const activeCount = orders.filter(o => o.status === 'active').length;
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const cancelledCount = orders.filter(o => o.status === 'cancelled').length;

  if (loading) {
    return (
      <div className="space-y-6 pb-10 mt-2">
        {/* Skeleton Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
          {[1, 2, 3, 4].map((idx) => (
            <div key={idx} className="bg-white/5 border border-white/10 rounded-3xl p-6 flex items-center justify-between h-[104px] animate-pulse">
              <div className="space-y-2.5">
                <div className="h-3 w-24 bg-white/10 rounded-full" />
                <div className="h-7 w-12 bg-white/10 rounded-full" />
              </div>
              <div className="p-3 bg-white/5 rounded-2xl w-12 h-12" />
            </div>
          ))}
        </div>

        {/* Skeleton Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 animate-pulse">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
            <div className="h-[42px] w-full sm:w-64 bg-white/5 border border-white/10 rounded-full" />
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-[38px] w-20 bg-white/5 border border-white/10 rounded-full" />
              ))}
            </div>
            <div className="h-[42px] w-[150px] bg-white/5 border border-white/10 rounded-xl" />
          </div>
          <div className="h-[38px] w-32 bg-white/5 border border-white/10 rounded-full self-end lg:self-auto hidden lg:block" />
        </div>

        {/* Skeleton Table */}
        <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden animate-pulse">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="p-6"><div className="h-4 w-28 bg-white/10 rounded-full" /></th>
                  <th className="p-6"><div className="h-4 w-32 bg-white/10 rounded-full" /></th>
                  <th className="p-6"><div className="h-4 w-24 bg-white/10 rounded-full" /></th>
                  <th className="p-6"><div className="h-4 w-16 bg-white/10 rounded-full" /></th>
                  <th className="p-6"><div className="h-4 w-24 bg-white/10 rounded-full" /></th>
                  <th className="p-6"><div className="h-4 w-20 bg-white/10 rounded-full" /></th>
                  <th className="p-6 text-right"><div className="h-4 w-16 bg-white/10 rounded-full ml-auto" /></th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((idx) => (
                  <tr key={idx} className="border-t border-white/5">
                    <td className="p-6 space-y-2.5">
                      <div className="h-4 w-40 bg-white/10 rounded-full" />
                      <div className="h-3.5 w-32 bg-white/5 rounded-full" />
                    </td>
                    <td className="p-6 space-y-2.5">
                      <div className="h-4 w-32 bg-white/10 rounded-full" />
                      <div className="h-3.5 w-24 bg-white/5 rounded-full" />
                    </td>
                    <td className="p-6"><div className="h-4 w-20 bg-white/10 rounded-full" /></td>
                    <td className="p-6"><div className="h-4 w-16 bg-white/10 rounded-full" /></td>
                    <td className="p-6"><div className="h-4 w-24 bg-white/10 rounded-full" /></td>
                    <td className="p-6"><div className="h-6 w-20 bg-white/5 rounded-full" /></td>
                    <td className="p-6 text-right"><div className="h-8 w-24 bg-white/5 rounded-lg ml-auto" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 mt-2">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Active Subscriptions" 
          value={<AnimatedNumber value={activeCount} />} 
          icon={<Cloud className="w-6 h-6" />} 
          iconBgColor="bg-green-400/10" 
          iconTextColor="text-green-400" 
        />
        <StatCard 
          title="Cancelled Subscriptions" 
          value={<AnimatedNumber value={cancelledCount} />} 
          icon={<AlertTriangle className="w-6 h-6" />} 
          iconBgColor="bg-red-400/10" 
          iconTextColor="text-red-400" 
        />
        <StatCard 
          title="Pending Orders" 
          value={<AnimatedNumber value={pendingCount} />} 
          icon={<Clock className="w-6 h-6" />} 
          iconBgColor="bg-amber-400/10" 
          iconTextColor="text-amber-400" 
        />
        <StatCard 
          title="Total SaaS Revenue So Far" 
          value={formatLKR(revenueSoFar)} 
          icon={<TrendingUp className="w-6 h-6" />} 
          iconBgColor="bg-brand-400/10" 
          iconTextColor="text-brand-400" 
        />
      </div>

      {/* Controls */}
      <PageHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search products..."
        filters={["All", "Pending", "Active", "Cancelled"]}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        primaryActionLabel="Add Project"
        onPrimaryAction={() => setIsAddModalOpen(true)}
      >
        <select 
          value={productFilter} 
          onChange={(e) => setProductFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors text-sm text-white min-w-[150px]"
        >
          <option value="All" className="bg-black text-white">All Products</option>
          {products.map(p => (
            <option key={p} value={p} className="bg-black text-white">{p}</option>
          ))}
        </select>
      </PageHeader>

      {/* Main Table */}
      <Table>
        <TableHeader>
          <TableHead>Client</TableHead>
          <TableHead>Project / URL</TableHead>
          <TableHead>Price (LKR)</TableHead>
          <TableHead>Cycle</TableHead>
          <TableHead>Billing Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableHeader>
        <TableBody>
          {filteredOrders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                No SaaS projects found.
              </TableCell>
            </TableRow>
          ) : (
            filteredOrders.map((o) => {
              const pastInvoices = saasInvoices.filter(i => 
                i.user_email === o.client_email && 
                i.project_name.includes(o.product_name)
              );
              
              const hasInvoiceForCurrentCycle = pastInvoices.some((inv: any) => {
                const invDate = new Date(inv.date);
                const now = new Date();
                if (o.billing_cycle === 'yearly') {
                  return invDate.getFullYear() === now.getFullYear();
                } else {
                  return invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear();
                }
              });

              return (
                <React.Fragment key={o.id}>
                  <TableRow>
                    <TableCell>
                      {(() => {
                        const clientObj = clients.find(c => c.email.toLowerCase() === o.client_email.toLowerCase());
                        const clientName = clientObj ? clientObj.name : "Unknown Client";
                        return (
                          <>
                            <div className="font-medium text-white">{clientName}</div>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                              <Mail className="w-3.5 h-3.5" />
                              {o.client_email}
                            </div>
                          </>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-white">{o.product_name}</div>
                      {o.system_url && (
                        <a href={o.system_url.startsWith('http') ? o.system_url : `https://${o.system_url}`} target="_blank" rel="noreferrer" className="text-xs text-brand-400 mt-1 flex items-center gap-1 hover:underline">
                          <Globe className="w-3 h-3" /> {o.system_url}
                        </a>
                      )}
                      {o.demo_url && (
                        <a href={o.demo_url.startsWith('http') ? o.demo_url : `https://${o.demo_url}`} target="_blank" rel="noreferrer" className="text-xs text-blue-400 mt-1 flex items-center gap-1 hover:underline">
                          Demo: {o.demo_url}
                        </a>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-white">
                      {formatLKR(o.price)}
                    </TableCell>
                    <TableCell>
                      <span className="capitalize text-gray-300">{o.billing_cycle}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-gray-300">
                        <Clock className="w-3.5 h-3.5 text-gray-500" />
                        {formatBillingDate(o.billing_date, o.billing_cycle)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${
                          o.status === "active"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : o.status === "pending"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}
                      >
                        {o.status.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/saas/${o.id}`}
                          title="View Details"
                          className="p-2 hover:bg-white/10 rounded-xl transition-colors text-blue-400"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {pastInvoices.length > 0 && (
                          <button
                            onClick={() => setExpandedRow(expandedRow === o.id ? null : o.id)}
                            title="View Payment History"
                            className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white flex items-center"
                          >
                            {expandedRow === o.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        )}
                        {!hasInvoiceForCurrentCycle && (
                          <button
                            onClick={() => handleGenerateInvoice(o.id)}
                            disabled={generatingInvoice === o.id}
                            title="Generate Invoice"
                            className="p-2 hover:bg-white/10 rounded-xl transition-colors text-brand-400 disabled:opacity-50"
                          >
                            {generatingInvoice === o.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <FileText className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEditModal(o)}
                          title="Edit"
                          className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(o.id)}
                          title="Delete"
                          className="p-2 hover:bg-red-500/10 rounded-xl transition-colors text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                  
                  {/* Expanded Payment History Row */}
                  {expandedRow === o.id && (
                    <tr className="bg-white/[0.01]">
                      <td colSpan={7} className="p-0 border-t border-white/5">
                        <div className="p-6">
                          <h4 className="text-sm font-semibold text-white mb-4">Payment History</h4>
                          <div className="overflow-hidden border border-white/10 rounded-xl">
                            <table className="w-full text-left text-sm">
                              <thead className="bg-white/5 text-gray-400">
                                <tr>
                                  <th className="px-4 py-3 font-medium text-xs">DATE</th>
                                  <th className="px-4 py-3 font-medium text-xs">AMOUNT</th>
                                  <th className="px-4 py-3 font-medium text-xs">STATUS</th>
                                  <th className="px-4 py-3 font-medium text-xs">INVOICE ID</th>
                                  <th className="px-4 py-3 font-medium text-xs text-right">ACTION</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/10 bg-[#0c0c0e]">
                                {pastInvoices.map((inv: any) => (
                                  <tr key={inv.invoice_id} className="hover:bg-white/[0.02]">
                                    <td className="px-4 py-3 text-gray-300">
                                      {new Date(inv.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-emerald-400">
                                      {formatLKR(inv.total)}
                                    </td>
                                    <td className="px-4 py-3 text-gray-400 capitalize">
                                      {inv.payment_status}
                                    </td>
                                    <td className="px-4 py-3 text-gray-400">
                                      {inv.invoice_id}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      <button 
                                        onClick={() => window.open('/invoice/' + inv.invoice_id, '_blank')}
                                        className="text-xs px-3 py-1.5 border border-white/10 rounded-lg hover:bg-white/5 transition-colors text-white"
                                      >
                                        View Invoice
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
          )}
        </TableBody>
      </Table>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111113] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#111113]">
              <h3 className="text-xl font-bold text-white">Add SaaS Project</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Product / Project Name</label>
                  <select
                    value={addProduct}
                    onChange={(e) => setAddProduct(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 text-white mb-2"
                    required
                  >
                    <option value="" className="bg-black text-white">Select Product...</option>
                    {products.map(p => (
                      <option key={p} value={p} className="bg-black text-white">{p}</option>
                    ))}
                    <option value="new" className="bg-black text-white">+ Create New Product</option>
                  </select>
                  {addProduct === "new" && (
                    <input
                      type="text"
                      required
                      value={addCustomProduct}
                      onChange={(e) => setAddCustomProduct(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 text-white"
                      placeholder="e.g. Accounting and Inventory Management System"
                    />
                  )}
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-300 mb-1">System URL (Optional)</label>
                    <input
                      type="text"
                      value={addSystemUrl}
                      onChange={(e) => setAddSystemUrl(e.target.value)}
                      placeholder="e.g. crm.selex.lk"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 text-white"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Demo URL (Optional)</label>
                    <input
                      type="text"
                      value={addDemoUrl}
                      onChange={(e) => setAddDemoUrl(e.target.value)}
                      placeholder="e.g. demo.selex.lk"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Client Email</label>
                  <select
                    value={addEmail}
                    onChange={(e) => {
                      setAddEmail(e.target.value);
                      if (e.target.value === "new") setShowNewClientForm(true);
                      else setShowNewClientForm(false);
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 text-white mb-2"
                    required
                  >
                    <option value="" className="bg-black text-white">Select Client...</option>
                    {clients.map((c: any) => (
                      <option key={c.id} value={c.email} className="bg-black text-white">{c.name} ({c.email})</option>
                    ))}
                    <option value="new" className="bg-black text-white">+ Create New Client</option>
                  </select>

                  {showNewClientForm && (
                    <div className="space-y-3 p-4 bg-white/5 border border-brand-500/30 rounded-xl mt-2">
                      <p className="text-xs font-semibold text-brand-400">New Client Details</p>
                      <input
                        type="text"
                        required
                        placeholder="Client Name"
                        value={newClientData.name}
                        onChange={(e) => setNewClientData({ ...newClientData, name: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500 text-white"
                      />
                      <input
                        type="email"
                        required
                        placeholder="Client Email"
                        value={newClientData.email}
                        onChange={(e) => setNewClientData({ ...newClientData, email: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500 text-white"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Service Agreement (Optional)</label>
                  <select
                    value={addAgreementId}
                    onChange={(e) => setAddAgreementId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 text-white mb-2"
                  >
                    <option value="" className="bg-black text-white">Select Agreement...</option>
                    {agreements.map((a: any) => (
                      <option key={a.id} value={a.id} className="bg-black text-white">{a.title} ({a.client_name})</option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Price (LKR)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={addPrice}
                      onChange={(e) => setAddPrice(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Billing Cycle</label>
                    <select
                      value={addBillingCycle}
                      onChange={(e) => setAddBillingCycle(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 text-white"
                    >
                      <option value="monthly" className="bg-black text-white">Monthly</option>
                      <option value="yearly" className="bg-black text-white">Yearly</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Next Billing Date</label>
                    <input
                      type="date"
                      required
                      value={addBillingDate}
                      onChange={(e) => setAddBillingDate(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 text-white [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                    <select
                      value={addStatus}
                      onChange={(e) => setAddStatus(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 text-white"
                    >
                      <option value="active" className="bg-black text-white">Active</option>
                      <option value="pending" className="bg-black text-white">Pending</option>
                      <option value="cancelled" className="bg-black text-white">Cancelled</option>
                    </select>
                  </div>
                </div>
                <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-[#111113] border-t border-white/10 -mx-6 -mb-6 px-6 py-4">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="px-6 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-medium disabled:opacity-50"
                  >
                    {savingEdit ? "Saving..." : "Add Project"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111113] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#111113]">
              <h3 className="text-xl font-bold text-white">Edit SaaS Product</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Product / Project Name</label>
                  <select
                    value={editProduct}
                    onChange={(e) => setEditProduct(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 text-white mb-2"
                    required
                  >
                    <option value="" className="bg-black text-white">Select Product...</option>
                    {products.map(p => (
                      <option key={p} value={p} className="bg-black text-white">{p}</option>
                    ))}
                    <option value="new" className="bg-black text-white">+ Create New Product</option>
                  </select>
                  {editProduct === "new" && (
                    <input
                      type="text"
                      required
                      value={editCustomProduct}
                      onChange={(e) => setEditCustomProduct(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 text-white"
                      placeholder="e.g. Accounting and Inventory Management System"
                    />
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">System URL</label>
                  <input
                    type="text"
                    value={editSystemUrl}
                    onChange={(e) => setEditSystemUrl(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 text-white"
                    placeholder="e.g. crm.selex.lk"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Client Email</label>
                  <select
                    value={editEmail}
                    onChange={(e) => {
                      setEditEmail(e.target.value);
                      if (e.target.value === "new") setShowEditNewClientForm(true);
                      else setShowEditNewClientForm(false);
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 text-white mb-2"
                    required
                  >
                    <option value="" className="bg-black text-white">Select Client...</option>
                    {clients.map((c: any) => (
                      <option key={c.id} value={c.email} className="bg-black text-white">{c.name} ({c.email})</option>
                    ))}
                    <option value="new" className="bg-black text-white">+ Create New Client</option>
                  </select>

                  {showEditNewClientForm && (
                    <div className="space-y-3 p-4 bg-white/5 border border-brand-500/30 rounded-xl mt-2">
                      <p className="text-xs font-semibold text-brand-400">New Client Details</p>
                      <input
                        type="text"
                        required
                        placeholder="Client Name"
                        value={editNewClientData.name}
                        onChange={(e) => setEditNewClientData({ ...editNewClientData, name: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500 text-white"
                      />
                      <input
                        type="email"
                        required
                        placeholder="Client Email"
                        value={editNewClientData.email}
                        onChange={(e) => setEditNewClientData({ ...editNewClientData, email: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500 text-white"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Service Agreement (Optional)</label>
                  <select
                    value={editAgreementId}
                    onChange={(e) => setEditAgreementId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 text-white mb-2"
                  >
                    <option value="" className="bg-black text-white">Select Agreement...</option>
                    {agreements.map((a: any) => (
                      <option key={a.id} value={a.id} className="bg-black text-white">{a.title} ({a.client_name})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Price (LKR)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Billing Cycle</label>
                    <select
                      value={editBillingCycle}
                      onChange={(e) => setEditBillingCycle(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 text-white"
                    >
                      <option value="monthly" className="bg-black text-white">Monthly</option>
                      <option value="yearly" className="bg-black text-white">Yearly</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Next Billing Date</label>
                    <input
                      type="date"
                      required
                      value={editBillingDate}
                      onChange={(e) => setEditBillingDate(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 text-white [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 text-white"
                    >
                      <option value="active" className="bg-black text-white">Active</option>
                      <option value="pending" className="bg-black text-white">Pending</option>
                      <option value="cancelled" className="bg-black text-white">Cancelled</option>
                    </select>
                  </div>
                </div>
                <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-[#111113] border-t border-white/10 -mx-6 -mb-6 px-6 py-4">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="px-6 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-medium disabled:opacity-50"
                  >
                    {savingEdit ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
