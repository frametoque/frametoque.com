"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, ArrowLeft, Send, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { updateInvoice, getInvoiceByIdAdmin } from "../../../actions/actions";

export default function EditInvoicePage() {
  const router = useRouter();
  const { invoice_id } = useParams();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    clientName: "",
    company: "",
    userEmail: "",
    phone: "",
    projectName: "",
    billingAddress: "",
    date: new Date().toISOString().split("T")[0],
    currency: "LKR",
    notes: "",
    taxRate: 0,
    discount: 0,
    advance: 0,
    workStatus: "pending",
    paymentStatus: "unpaid"
  });

  const [lineItems, setLineItems] = useState([
    { id: 1, description: "", quantity: 1, rate: 0 },
  ]);

  useEffect(() => {
    if (!invoice_id) return;
    const fetchInvoice = async () => {
      try {
        const data = await getInvoiceByIdAdmin(invoice_id as string);
        if (!data) throw new Error("Invoice not found");
        
        let formattedDate = "";
        try {
          formattedDate = new Date(data.date).toISOString().split('T')[0];
        } catch(e) {}

        setFormData({
          clientName: "", 
          company: "", 
          userEmail: data.user_email || "",
          phone: "", 
          projectName: data.project_name || "",
          billingAddress: data.billing_address || "",
          date: formattedDate || new Date().toISOString().split("T")[0],
          currency: data.currency || "LKR",
          notes: "",
          taxRate: 0, 
          discount: parseFloat(data.discount) || 0,
          advance: parseFloat(data.advance) || 0,
          workStatus: data.work_status || "pending",
          paymentStatus: data.payment_status || "unpaid"
        });

        if (data.items && data.items.length > 0) {
          setLineItems(data.items.map((item: any, index: number) => ({
            id: index + 1,
            description: item.description || "",
            quantity: item.quantity || 1,
            rate: parseFloat(item.price) || 0
          })));
        } else {
          setLineItems([{ id: 1, description: "", quantity: 1, rate: 0 }]);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [invoice_id]);

  const handleFormChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLineItemChange = (id: number, field: string, value: any) => {
    setLineItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const addLineItem = () => {
    setLineItems(prev => [
      ...prev,
      { id: Date.now(), description: "", quantity: 1, rate: 0 }
    ]);
  };

  const removeLineItem = (id: number) => {
    if (lineItems.length > 1) {
      setLineItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  const taxAmount = subtotal * (formData.taxRate / 100);
  const total = subtotal + taxAmount - formData.discount;
  const totalDue = total - formData.advance;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(formData.currency === 'LKR' ? 'en-LK' : 'en-US', {
      style: 'currency',
      currency: formData.currency,
    }).format(amount || 0);
  };

  const handleSave = async () => {
    if (!formData.userEmail) {
      alert("Please enter a user email.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await updateInvoice(invoice_id as string, {
        ...formData,
        subtotal,
        total,
        totalDue
      }, lineItems);
      
      router.push("/admin/invoices");
    } catch (e) {
      console.error(e);
      alert("Failed to update invoice");
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 text-brand-400 animate-spin" /></div>;
  }

  if (error) {
    return <div className="text-center text-red-400 py-10">{error}</div>;
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/invoices" className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-3xl font-bold">Edit Invoice</h1>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Left Column: Details */}
        <div className="space-y-8">
          
          {/* Client Details */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4">
            <h2 className="text-xl font-semibold mb-4">Client Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-gray-400">Client Name</label>
                <input 
                  type="text" name="clientName" value={formData.clientName} onChange={handleFormChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors" 
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-gray-400">Company</label>
                <input 
                  type="text" name="company" value={formData.company} onChange={handleFormChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors" 
                  placeholder="Acme Corp"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-gray-400">User Email</label>
                <input 
                  type="email" name="userEmail" value={formData.userEmail} onChange={handleFormChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors" 
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-gray-400">Phone</label>
                <input 
                  type="text" name="phone" value={formData.phone} onChange={handleFormChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors" 
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-gray-400">Billing Address</label>
                <textarea 
                  name="billingAddress" value={formData.billingAddress} onChange={handleFormChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors resize-none" 
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4">
            <h2 className="text-xl font-semibold mb-4">Project & Invoice Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-gray-400">Project Name</label>
                <input 
                  type="text" name="projectName" value={formData.projectName} onChange={handleFormChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-gray-400">Date</label>
                <input 
                  type="date" name="date" value={formData.date} onChange={handleFormChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors" 
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-gray-400">Currency</label>
                <select 
                  name="currency" value={formData.currency} onChange={handleFormChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors appearance-none"
                >
                  <option value="LKR" className="bg-black">LKR (₨)</option>
                  <option value="USD" className="bg-black">USD ($)</option>
                  <option value="EUR" className="bg-black">EUR (€)</option>
                  <option value="GBP" className="bg-black">GBP (£)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-gray-400">Work Status</label>
                <select 
                  name="workStatus" value={formData.workStatus} onChange={handleFormChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors appearance-none"
                >
                  <option value="pending" className="bg-black">Pending</option>
                  <option value="in-progress" className="bg-black">In Progress</option>
                  <option value="completed" className="bg-black">Completed</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-gray-400">Payment Status</label>
                <select 
                  name="paymentStatus" value={formData.paymentStatus} onChange={handleFormChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors appearance-none"
                >
                  <option value="unpaid" className="bg-black">Unpaid</option>
                  <option value="paid" className="bg-black">Paid</option>
                  <option value="overdue" className="bg-black">Overdue</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Line Items & Actions */}
        <div className="space-y-8">
          {/* Line Items */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4">
            <h2 className="text-xl font-semibold mb-4">Line Items</h2>
            
            <div className="space-y-3">
              {lineItems.map((item, index) => (
                <div key={item.id} className="flex items-start gap-3">
                  <div className="flex-1 space-y-1">
                    <input 
                      type="text" placeholder="Description" 
                      value={item.description}
                      onChange={(e) => handleLineItemChange(item.id, 'description', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-brand-500 transition-colors text-sm" 
                    />
                  </div>
                  <div className="w-20 space-y-1">
                    <input 
                      type="number" placeholder="Qty" min="1"
                      value={item.quantity}
                      onChange={(e) => handleLineItemChange(item.id, 'quantity', Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-brand-500 transition-colors text-sm" 
                    />
                  </div>
                  <div className="w-28 space-y-1">
                    <input 
                      type="number" placeholder="Rate" min="0" step="0.01"
                      value={item.rate || ""}
                      onChange={(e) => handleLineItemChange(item.id, 'rate', Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-brand-500 transition-colors text-sm" 
                    />
                  </div>
                  <div className="w-24 py-2 text-right text-sm font-semibold">
                    {formatCurrency(item.quantity * item.rate)}
                  </div>
                  <button 
                    onClick={() => removeLineItem(item.id)}
                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-colors mt-0.5"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button 
              onClick={addLineItem}
              className="flex items-center gap-2 text-sm text-brand-400 font-medium hover:text-brand-300 transition-colors mt-4"
            >
              <Plus className="w-4 h-4" /> Add line item
            </button>

            <div className="border-t border-white/10 mt-6 pt-4 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Discount</span>
                <input 
                  type="number" name="discount" value={formData.discount || ""} onChange={handleFormChange} min="0"
                  className="w-24 bg-white/5 border border-white/10 rounded-lg px-3 py-1 outline-none focus:border-brand-500 transition-colors text-right" 
                  placeholder="0.00"
                />
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Tax Rate (%)</span>
                <input 
                  type="number" name="taxRate" value={formData.taxRate || ""} onChange={handleFormChange} min="0" max="100"
                  className="w-24 bg-white/5 border border-white/10 rounded-lg px-3 py-1 outline-none focus:border-brand-500 transition-colors text-right" 
                  placeholder="0"
                />
              </div>
              <div className="flex justify-between items-center text-lg font-semibold border-t border-white/10 pt-3">
                <span>Total</span>
                <span className="text-brand-400">{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between items-center text-sm mt-3">
                <span className="text-gray-400">Advance Paid</span>
                <input 
                  type="number" name="advance" value={formData.advance || ""} onChange={handleFormChange} min="0"
                  className="w-24 bg-white/5 border border-white/10 rounded-lg px-3 py-1 outline-none focus:border-brand-500 transition-colors text-right" 
                  placeholder="0.00"
                />
              </div>
              <div className="flex justify-between items-center text-xl font-bold border-t border-white/10 pt-3 text-white">
                <span>Total Due</span>
                <span className="text-red-400">{formatCurrency(totalDue)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-4">
            <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-3xl font-semibold transition-colors">
              <Save className="w-5 h-5" /> Save Draft
            </button>
            <button 
              onClick={handleSave}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-3xl font-semibold transition-colors ml-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" /> {isSubmitting ? "Updating..." : "Update Invoice"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
