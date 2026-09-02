"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Save, Loader2, Plus } from "lucide-react";
import ClientCombobox from "../../components/ClientCombobox";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getClients, createClient } from "../../actions/actions";
import { createAgreement } from "../../actions/agreements";
import { PREDEFINED_REPRESENTATIVES } from "@/lib/representatives";

export default function NewAgreementPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientData, setNewClientData] = useState({
    name: "", email: "", company: "", phone: "", address: ""
  });

  const [formData, setFormData] = useState({
    clientId: "",
    client_name: "",
    client_email: "",
    client_phone: "",
    client_company: "",
    client_address: "",
    agreement_type: "Web Development Agreement",
    title: "",
    agreement_date: new Date().toISOString().split("T")[0],
    start_date: new Date().toISOString().split("T")[0],
    delivery_date: "",
    deadline: "",
    total_fee: "",
    deposit: "",
    ui_payment: "",
    final_payment: "",
    payment_methods: "Bank Transfer",
    revision_rounds: "3",
    hosting_preference: "Option A — Free Hosting",
    representative_name: PREDEFINED_REPRESENTATIVES[0].name,
    representative_signature: PREDEFINED_REPRESENTATIVES[0].signatureImage || PREDEFINED_REPRESENTATIVES[0].signatureText,
  });

  useEffect(() => {
    getClients()
      .then(cls => { setClients(cls); setClientsLoading(false); })
      .catch(() => setClientsLoading(false));
  }, []);

  const handleFormChange = (e: any) => {
    const { name, value } = e.target;
    
    if (name === "representative_name") {
      const rep = PREDEFINED_REPRESENTATIVES.find(r => r.name === value);
      setFormData(prev => ({
        ...prev,
        representative_name: value,
        representative_signature: rep ? (rep.signatureImage || rep.signatureText) : "",
      }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === "clientId" && value && value !== "new") {
      const selected = clients.find(c => c.id === value);
      if (selected) {
        setFormData(prev => ({
          ...prev,
          clientId: value,
          client_name: selected.name || "",
          client_company: selected.company || "",
          client_email: selected.email,
          client_phone: selected.phone || "",
          client_address: selected.address || "",
        }));
      }
    } else if (name === "clientId" && value === "new") {
      setShowNewClientForm(true);
    }
  };

  const handleNewClientChange = (e: any) => {
    const { name, value } = e.target;
    setNewClientData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateNewClient = async () => {
    if (!newClientData.name || (!newClientData.email && !newClientData.phone)) {
      alert("Please enter a name and either an email or phone number for the new client.");
      return;
    }
    try {
      const clientId = await createClient({
        name: newClientData.name,
        email: newClientData.email,
        company: newClientData.company || null,
        phone: newClientData.phone || null,
        address: newClientData.address || null,
      });
      const newClient = { id: clientId, ...newClientData };
      setClients(prev => [...prev, newClient]);
      setFormData(prev => ({
        ...prev,
        clientId,
        client_name: newClientData.name,
        client_company: newClientData.company,
        client_email: newClientData.email,
        client_phone: newClientData.phone,
        client_address: newClientData.address,
      }));
      setShowNewClientForm(false);
      setNewClientData({ name: "", email: "", company: "", phone: "", address: "" });
    } catch (e) {
      alert("Failed to create client");
    }
  };

  const calculateFeesFromTotal = (totalVal: string) => {
    const total = parseFloat(totalVal) || 0;
    const dep = Math.round(total * 0.5); // 50% deposit
    const ui = Math.round(total * 0.25); // 25% UI Stage
    const finalVal = total - dep - ui; // 25% remaining
    setFormData(prev => ({
      ...prev,
      total_fee: totalVal,
      deposit: dep.toString(),
      ui_payment: ui.toString(),
      final_payment: finalVal.toString(),
    }));
  };

  const handleSave = async () => {
    if (!formData.client_email && !formData.client_phone) { alert("Please select or enter client email or phone."); return; }
    if (!formData.title) { alert("Please enter the project/website name."); return; }
    if (!formData.delivery_date) { alert("Please enter estimated delivery date."); return; }
    if (!formData.deadline) { alert("Please enter content submission deadline."); return; }

    setIsSubmitting(true);
    try {
      await createAgreement(formData);
      router.push("/admin/agreements");
    } catch (e) {
      console.error(e);
      alert("Failed to create agreement");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/agreements" className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-3xl font-bold">Create Agreement</h1>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Left Column: Client & Agreement Meta */}
        <div className="space-y-6">
          {/* Client Details */}
          <div className="relative z-30 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4">
            <h2 className="text-xl font-semibold mb-4 text-brand-400">Client Details</h2>

            <div className="space-y-1">
              <label className="text-sm text-gray-400">Select Client</label>
              <ClientCombobox name="clientId" value={String(formData.clientId || "")} onChange={handleFormChange} clients={clients} loading={clientsLoading} />
            </div>

            {showNewClientForm && (
              <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
                <h3 className="text-sm font-semibold text-brand-400">New Client Details</h3>
                <input type="text" name="name" placeholder="Client Name" value={newClientData.name} onChange={handleNewClientChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-brand-500 transition-colors text-sm" />
                <input type="email" name="email" placeholder="Email" value={newClientData.email} onChange={handleNewClientChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-brand-500 transition-colors text-sm" />
                <input type="text" name="company" placeholder="Company (Optional)" value={newClientData.company} onChange={handleNewClientChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-brand-500 transition-colors text-sm" />
                <input type="text" name="phone" placeholder="Phone (Optional)" value={newClientData.phone} onChange={handleNewClientChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-brand-500 transition-colors text-sm" />
                <textarea name="address" placeholder="Billing Address (Optional)" value={newClientData.address} onChange={handleNewClientChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-brand-500 transition-colors text-sm resize-none" rows={2} />
                <div className="flex gap-2 pt-2">
                  <button onClick={handleCreateNewClient}
                    className="flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-medium transition-colors">
                    Create Client
                  </button>
                  <button onClick={() => { setShowNewClientForm(false); setFormData(prev => ({ ...prev, clientId: "" })); }}
                    className="flex-1 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-sm font-medium transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {formData.clientId && !showNewClientForm && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm text-gray-400">Client Name</label>
                    <input type="text" name="client_name" value={formData.client_name} onChange={handleFormChange}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-gray-400">Company</label>
                    <input type="text" name="client_company" value={formData.client_company} onChange={handleFormChange}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm text-gray-400">Email</label>
                    <input type="email" name="client_email" value={formData.client_email} onChange={handleFormChange}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-gray-400">Phone</label>
                    <input type="text" name="client_phone" value={formData.client_phone} onChange={handleFormChange}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">Billing Address</label>
                  <textarea name="client_address" value={formData.client_address} onChange={handleFormChange}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors resize-none"
                    rows={2} placeholder="Street, City, Country..." />
                </div>
              </>
            )}
          </div>

          {/* Agreement Type */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4">
            <h2 className="text-xl font-semibold mb-4 text-brand-400">Agreement Type</h2>
            <div className="space-y-1">
              <label className="text-sm text-gray-400">Select Template</label>
              <select name="agreement_type" value={formData.agreement_type} onChange={handleFormChange}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors appearance-none">
                <option value="Web Development Agreement" className="bg-black">Web Development Agreement</option>
                <option value="Service Agreement" className="bg-black" disabled>Service Agreement (Not Finalized)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right Column: PDF Fields (Web Dev Specific) */}
        <div className="space-y-6">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4">
            <h2 className="text-xl font-semibold mb-4 text-brand-400">Project Details (Web Dev Agreement)</h2>
            
            <div className="space-y-1">
              <label className="text-sm text-gray-400">Project Title / Website Name</label>
              <input type="text" name="title" value={formData.title} onChange={handleFormChange} placeholder="e.g. E-commerce Site"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-gray-400">Agreement Date</label>
                <input type="date" name="agreement_date" value={formData.agreement_date} onChange={handleFormChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors" />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-gray-400">Project Start Date</label>
                <input type="date" name="start_date" value={formData.start_date} onChange={handleFormChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-gray-400">Estimated Delivery Date</label>
                <input type="date" name="delivery_date" value={formData.delivery_date} onChange={handleFormChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors" />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-gray-400">Content Submission Deadline</label>
                <input type="date" name="deadline" value={formData.deadline} onChange={handleFormChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors" />
              </div>
            </div>

            {/* Financial Terms */}
            <div className="border-t border-white/5 pt-4 my-2">
              <h3 className="text-sm font-semibold text-brand-400 mb-3">Milestone Payments</h3>
              
              <div className="space-y-1 mb-3">
                <label className="text-sm text-gray-400">Total Project Fee (LKR)</label>
                <input type="number" name="total_fee" value={formData.total_fee} 
                  onChange={e => calculateFeesFromTotal(e.target.value)} 
                  placeholder="e.g. 450000"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors font-semibold" />
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="text-gray-400">Deposit (50%)</label>
                  <input type="number" name="deposit" value={formData.deposit} onChange={handleFormChange}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-2 outline-none focus:border-brand-500 transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="text-gray-400">UI Appr (25%)</label>
                  <input type="number" name="ui_payment" value={formData.ui_payment} onChange={handleFormChange}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-2 outline-none focus:border-brand-500 transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="text-gray-400">Final (25%)</label>
                  <input type="number" name="final_payment" value={formData.final_payment} onChange={handleFormChange}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-2 outline-none focus:border-brand-500 transition-colors" />
                </div>
              </div>
            </div>

            {/* Other Configs */}
            <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
              <div className="space-y-1">
                <label className="text-sm text-gray-400">UI Revision Rounds</label>
                <input type="number" name="revision_rounds" value={formData.revision_rounds} onChange={handleFormChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors" />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-gray-400">Hosting Preference</label>
                <select name="hosting_preference" value={formData.hosting_preference} onChange={handleFormChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors appearance-none">
                  <option value="Option A — Free Hosting" className="bg-black">Option A — Free Hosting</option>
                  <option value="Option B — Custom Server" className="bg-black">Option B — Custom Server</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm text-gray-400">Payment Methods</label>
              <input type="text" name="payment_methods" value={formData.payment_methods} onChange={handleFormChange}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors" />
            </div>

            {/* Representative Selector */}
            <div className="space-y-1 border-t border-white/5 pt-4">
              <label className="text-sm text-gray-400">Authorized Representative</label>
              <select name="representative_name" value={formData.representative_name} onChange={handleFormChange}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors appearance-none">
                {PREDEFINED_REPRESENTATIVES.map(rep => (
                  <option key={rep.name} value={rep.name} className="bg-black">{rep.name} ({rep.role})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-3xl font-semibold transition-all duration-300"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving Agreement...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save & Publish
                </>
              )}
            </button>
            <Link
              href="/admin/agreements"
              className="px-6 py-3.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-3xl font-semibold transition-colors"
            >
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
