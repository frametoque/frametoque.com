"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Plus, X, UserPlus } from "lucide-react";
import { updateProject, getProjectById, getClients, createClient } from "../../../actions/actions";

const PROJECT_TYPES = ["Web dev", "Graphic design", "Video editing", "Photography", "Videography", "Other"];
const STATUS_OPTIONS = ["pending", "in progress", "completed"];

export default function EditProjectPage() {
  const router = useRouter();
  const { project_id } = useParams();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [clients, setClients] = useState<any[]>([]);
  const [showNewClientForm, setShowNewClientForm] = useState(false);

  const [newClientData, setNewClientData] = useState({
    name: "", email: "", company: "", phone: "", address: ""
  });

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "Web dev",
    price: 0,
    status: "pending",
    progress: 0,
    invoiceNumber: "",
    clientId: "",
    userEmail: "",
    billingAddress: "",
  });

  useEffect(() => {
    getClients()
      .then(setClients)
      .catch((e) => console.error("Failed to load clients:", e));

    if (project_id) {
      getProjectById(parseInt(project_id as string))
        .then((prj) => {
          if (!prj) {
            alert("Project not found");
            router.push("/admin/projects");
            return;
          }
          setFormData({
            title: prj.title || "",
            description: prj.description || "",
            type: prj.type || "Web dev",
            price: parseFloat(prj.price || 0),
            status: prj.status || "pending",
            progress: parseInt(prj.progress || 0),
            invoiceNumber: prj.invoice_number || "",
            clientId: prj.client_id || "",
            userEmail: prj.user_email || "",
            billingAddress: prj.billing_address || "",
          });
        })
        .catch(() => {
          alert("Error loading project details");
          router.push("/admin/projects");
        })
        .finally(() => setDataLoading(false));
    }
  }, [project_id, router]);

  const handleFormChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === "clientId") {
      if (value === "new") {
        setShowNewClientForm(true);
      } else if (value) {
        const client = clients.find(c => c.id === value);
        if (client) {
          setFormData(prev => ({
            ...prev,
            clientId: value,
            userEmail: client.email || "",
            billingAddress: client.address || "",
          }));
        }
      } else {
        setFormData(prev => ({ ...prev, clientId: "", userEmail: "", billingAddress: "" }));
      }
    }
  };

  const handleNewClientChange = (e: any) => {
    const { name, value } = e.target;
    setNewClientData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateNewClient = async () => {
    if (!newClientData.name || !newClientData.email) {
      alert("Please enter client name and email");
      return;
    }
    try {
      const newId = await createClient({
        name: newClientData.name,
        email: newClientData.email,
        company: newClientData.company || null,
        phone: newClientData.phone || null,
        address: newClientData.address || null,
      });
      const clientRecord = { id: newId, ...newClientData };
      setClients([...clients, clientRecord]);
      setFormData(prev => ({
        ...prev,
        clientId: newId,
        userEmail: newClientData.email,
        billingAddress: newClientData.address,
      }));
      setShowNewClientForm(false);
      setNewClientData({ name: "", email: "", company: "", phone: "", address: "" });
      alert("Client created successfully!");
    } catch (e) {
      console.error(e);
      alert("Failed to create client");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userEmail) { alert("Please select or specify a user email."); return; }
    if (!formData.title) { alert("Please enter a project title."); return; }

    setIsSubmitting(true);
    try {
      await updateProject(parseInt(project_id as string), formData);
      router.push("/admin/projects");
    } catch (e) {
      console.error(e);
      alert("Failed to update project");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case "completed": return "bg-green-500/10 border-green-500/30 text-green-400";
      case "in progress": return "bg-blue-500/10 border-blue-500/30 text-blue-400";
      default: return "bg-gray-500/10 border-gray-500/30 text-gray-400";
    }
  };

  if (dataLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/admin/projects"
          className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-3xl font-bold">Edit Project</h1>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-2 gap-8">

        {/* Left Column */}
        <div className="space-y-8">

          {/* Client Details */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4">
            <h2 className="text-xl font-semibold">Client Details</h2>

            <div className="space-y-1">
              <label className="text-sm text-gray-400">Select Client</label>
              <select
                name="clientId"
                value={formData.clientId}
                onChange={handleFormChange}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors appearance-none cursor-pointer"
              >
                <option value="" disabled className="bg-black">Choose a client…</option>
                <option value="new" className="bg-black">+ Create New Client</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id} className="bg-black">
                    {c.name} ({c.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Inline new client form */}
            {showNewClientForm && (
              <div className="p-4 bg-black/40 border border-white/10 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-brand-400 flex items-center gap-2">
                    <UserPlus className="w-4 h-4" /> New Client
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowNewClientForm(false)}
                    className="p-1 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" name="name" placeholder="Client Name *" value={newClientData.name} onChange={handleNewClientChange}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-brand-500 transition-colors text-sm" />
                  <input type="email" name="email" placeholder="Email *" value={newClientData.email} onChange={handleNewClientChange}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-brand-500 transition-colors text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" name="company" placeholder="Company (optional)" value={newClientData.company} onChange={handleNewClientChange}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-brand-500 transition-colors text-sm" />
                  <input type="text" name="phone" placeholder="Phone (optional)" value={newClientData.phone} onChange={handleNewClientChange}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-brand-500 transition-colors text-sm" />
                </div>
                <textarea name="address" placeholder="Billing Address (optional)" value={newClientData.address} onChange={handleNewClientChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-brand-500 transition-colors text-sm resize-none" rows={2} />
                <button
                  type="button"
                  onClick={handleCreateNewClient}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" /> Create Client
                </button>
              </div>
            )}

            {/* Auto-populated fields */}
            {formData.clientId && !showNewClientForm && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">Email Address</label>
                  <input type="email" name="userEmail" value={formData.userEmail} onChange={handleFormChange}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors" required />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">
                    Billing Address
                    <span className="ml-2 text-xs text-brand-400/70">(saved to client profile)</span>
                  </label>
                  <textarea name="billingAddress" value={formData.billingAddress} onChange={handleFormChange}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors resize-none"
                    rows={2} placeholder="Street, City, Country…" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-8">

          {/* Project Details */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4">
            <h2 className="text-xl font-semibold">Project Details</h2>

            <div className="space-y-1">
              <label className="text-sm text-gray-400">Project Title *</label>
              <input type="text" name="title" value={formData.title} onChange={handleFormChange}
                placeholder="e.g. Corporate Website Redesign"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors" required />
            </div>

            <div className="space-y-1">
              <label className="text-sm text-gray-400">Description</label>
              <textarea name="description" value={formData.description} onChange={handleFormChange}
                placeholder="Summarize objectives, requirements or delivery agreements…"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors resize-none" rows={3} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-gray-400">Project Type</label>
                <select name="type" value={formData.type} onChange={handleFormChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors appearance-none cursor-pointer">
                  {PROJECT_TYPES.map(t => (
                    <option key={t} value={t} className="bg-black">{t}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-gray-400">Price (LKR) *</label>
                <input type="number" name="price" value={formData.price || ""} onChange={handleFormChange}
                  placeholder="e.g. 150000"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-gray-400">Invoice / Ref Number</label>
                <input type="text" name="invoiceNumber" value={formData.invoiceNumber} onChange={handleFormChange}
                  placeholder="PRJ-1002 (optional)"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors" />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-gray-400">Status</label>
                <select name="status" value={formData.status} onChange={handleFormChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors appearance-none cursor-pointer">
                  {STATUS_OPTIONS.map(s => (
                    <option key={s} value={s} className="bg-black capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4">
            <h2 className="text-xl font-semibold">Progress</h2>
            <p className="text-sm text-gray-400">Set the current completion percentage for this project.</p>
            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-gray-400">Completion</span>
                <span className="text-brand-400 text-lg font-bold">{formData.progress}%</span>
              </div>
              <input
                type="range"
                name="progress"
                min="0"
                max="100"
                value={formData.progress}
                onChange={handleFormChange}
                className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-brand-500 focus:outline-none"
              />
              <div className="flex justify-between text-xs text-gray-600">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-3xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Saving…</>
              ) : (
                <><Save className="w-5 h-5" /> Save Project</>
              )}
            </button>
          </div>

        </div>
      </form>
    </div>
  );
}