"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Globe, Mail, Clock, FileText, CheckCircle2, AlertTriangle, ExternalLink, RefreshCw } from "lucide-react";
import { getSaaSOrderById, getSaaSInvoices, SaaSOrder, createSaaSInvoice } from "../../actions/saas";
import { getClients } from "../../actions/actions";
import { getAgreementById, AgreementData } from "../../actions/agreements";

const formatLKR = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "LKR" }).format(amount);

const statusStyles = {
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function SaaSProjectDetailsPage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<SaaSOrder | null>(null);
  const [client, setClient] = useState<any>(null);
  const [agreement, setAgreement] = useState<AgreementData | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  const fetchInvoices = async (orderData: SaaSOrder, preFetchedInvoices?: any[]) => {
    const allInvoices = preFetchedInvoices || await getSaaSInvoices();
    const pastInvoices = allInvoices.filter((i: any) => 
      i.user_email === orderData.client_email && 
      i.project_name.includes(orderData.product_name)
    );
    setInvoices(pastInvoices);
  };

  const fetchData = async () => {
    if (!id) return;
    try {
      const [orderData, allClients, allInvoices] = await Promise.all([
        getSaaSOrderById(Number(id)),
        getClients(),
        getSaaSInvoices()
      ]);
      
      if (orderData) {
        setOrder(orderData);
        const foundClient = allClients.find((c: any) => c.email.toLowerCase() === orderData.client_email.toLowerCase());
        setClient(foundClient || { name: "Unknown Client", email: orderData.client_email });
        
        if (orderData.agreement_id) {
          const agr = await getAgreementById(Number(orderData.agreement_id));
          setAgreement(agr);
        }
        
        await fetchInvoices(orderData, allInvoices);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    if (order) {
      window.dispatchEvent(new CustomEvent("update-title", { detail: order.product_name }));
    }
  }, [order]);

  const handleCreateInvoice = async () => {
    if (!order) return;
    setGeneratingInvoice(true);
    const res = await createSaaSInvoice(order.id, 'LKR');
    if (res.success) {
      alert("Invoice created successfully: " + res.invoiceId);
      fetchData();
    } else {
      alert(res.error || "Failed to generate invoice");
    }
    setGeneratingInvoice(false);
  };

  const hasInvoiceForCurrentCycle = order && invoices.some((inv: any) => {
    const invDate = new Date(inv.date);
    const now = new Date();
    if (order.billing_cycle === 'yearly') {
      return invDate.getFullYear() === now.getFullYear();
    } else {
      return invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear();
    }
  });
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("saas:action-state", { 
      detail: { show: !hasInvoiceForCurrentCycle && !loading, loading: generatingInvoice } 
    }));
  }, [hasInvoiceForCurrentCycle, loading, generatingInvoice]);

  useEffect(() => {
    const handleCreate = () => {
      if (!generatingInvoice) handleCreateInvoice();
    };
    window.addEventListener("saas:create-invoice", handleCreate);
    return () => window.removeEventListener("saas:create-invoice", handleCreate);
  }, [order, generatingInvoice]);

  if (loading) {
    return (
      <div className="space-y-6 pb-20 mt-2">
        <div className="h-8 w-24 bg-white/5 rounded-full animate-pulse" />
        <div className="space-y-6">
          <div className="bg-[#0c0c0e] border border-white/10 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-5 h-5 bg-white/5 rounded-full animate-pulse" />
              <div className="h-5 w-32 bg-white/5 rounded-full animate-pulse" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex justify-between items-center pb-4 border-b border-white/5">
                    <div className="h-4 w-24 bg-white/5 rounded-full animate-pulse" />
                    <div className="h-4 w-32 bg-white/10 rounded-full animate-pulse" />
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="flex justify-between items-center pb-4 border-b border-white/5">
                    <div className="h-4 w-24 bg-white/5 rounded-full animate-pulse" />
                    <div className="h-4 w-32 bg-white/10 rounded-full animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="bg-[#0c0c0e] border border-white/10 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-5 h-5 bg-white/5 rounded-full animate-pulse" />
              <div className="h-5 w-32 bg-white/5 rounded-full animate-pulse" />
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 w-full bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-8 text-center text-gray-400">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl text-white font-medium mb-2">Project Not Found</h2>
        <p>The SaaS project you are looking for does not exist.</p>
        <Link href="/admin/saas" className="mt-4 inline-block text-brand-400 hover:underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 mt-2">
      <Link
        href="/admin/saas"
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to SaaS</span>
      </Link>

      <div className="space-y-6">
        <div className="bg-[#0c0c0e] border border-white/10 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-lg font-semibold text-white">Subscription Details</h2>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${(statusStyles as any)[order.status]}`}>
              {order.status.toUpperCase()}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            <div className="space-y-2">
              <span className="text-sm text-gray-500 block">Client</span>
              <div className="mt-1">
                <div className="font-medium text-white">{client?.name || "Unknown Client"}</div>
                <div className="text-sm text-gray-400 flex items-center gap-1.5 mt-0.5">
                  <Mail className="w-3 h-3" /> {order.client_email}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-sm text-gray-500 block">Price</span>
              <div className="text-lg font-medium text-white mt-1">{formatLKR(order.price)} <span className="text-sm text-gray-400">/ {order.billing_cycle}</span></div>
            </div>

            <div className="space-y-2">
              <span className="text-sm text-gray-500 block">Next Billing Date</span>
              <div className="flex items-center gap-2 text-white mt-1">
                <Clock className="w-4 h-4 text-brand-400" />
                {order.billing_date ? new Date(order.billing_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Not set'}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-sm text-gray-500 block">System URL</span>
              <div className="mt-1">
                {order.system_url ? (
                  <a href={order.system_url.startsWith('http') ? order.system_url : `https://${order.system_url}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-brand-400 hover:underline">
                    <Globe className="w-4 h-4" /> {order.system_url}
                  </a>
                ) : (
                  <span className="text-gray-500">Not provided</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-sm text-gray-500 block">Demo URL</span>
              <div className="mt-1">
                {order.demo_url ? (
                  <a href={order.demo_url.startsWith('http') ? order.demo_url : `https://${order.demo_url}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-400 hover:underline">
                    <ExternalLink className="w-4 h-4" /> {order.demo_url}
                  </a>
                ) : (
                  <span className="text-gray-500">Not provided</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-sm text-gray-500 block">Service Agreement</span>
              <div className="mt-1">
                {agreement ? (
                  <>
                    <div className="font-medium text-white text-sm">{agreement.title}</div>
                    {agreement.client_sig_date && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        Signed on {new Date(agreement.client_sig_date || '').toLocaleDateString()}
                      </div>
                    )}
                    <Link 
                      href={`/admin/agreements/${agreement.id}`}
                      className="text-xs text-brand-400 hover:underline flex items-center gap-1 mt-1"
                    >
                      View Agreement
                    </Link>
                  </>
                ) : (
                  <span className="text-gray-500">Not linked</span>
                )}
              </div>
            </div>

          </div>
        </div>

        <div className="bg-[#0c0c0e] border border-white/10 rounded-3xl p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Payment History</h2>
          {invoices.length > 0 ? (
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
                <tbody className="divide-y divide-white/10">
                  {invoices.map((inv: any) => (
                    <tr key={inv.invoice_id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-gray-300">
                        {new Date(inv.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 font-medium text-white">
                        {formatLKR(inv.total)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium border ${inv.payment_status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                          {inv.payment_status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {inv.invoice_id}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link 
                          href={`/admin/invoice/${inv.invoice_id}`}
                          className="text-xs px-3 py-1.5 border border-white/10 rounded-lg hover:bg-white/5 transition-colors text-white inline-block"
                        >
                          View Invoice
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No invoices have been generated for this project yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
