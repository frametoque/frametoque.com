"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Briefcase,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  MapPin,
  Clock,
  Mail,
  X,
  Loader2,
  Filter,
  Sparkles,
  Layers,
  ArrowUpRight,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import AnimatedNumber from "../components/AnimatedNumber";
import {
  getCareersAdmin,
  createCareer,
  updateCareer,
  deleteCareer,
  toggleCareerStatus,
  type CareerItem,
} from "../actions/careersActions";

const DEPARTMENTS = ["All", "Digital", "Productions", "Operations"];
const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Freelance", "Internship"];

export default function AdminCareersPage() {
  const [careers, setCareers] = useState<CareerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CareerItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    department: "Digital",
    employment_type: "Full-time",
    location: "Remote / Hybrid",
    description: "",
    requirements: [""],
    responsibilities: [""],
    apply_email: "careers@frametoque.com",
    apply_url: "",
    is_active: true,
  });

  const loadCareers = async () => {
    try {
      setLoading(true);
      const data = await getCareersAdmin();
      setCareers(data);
    } catch (err) {
      console.error("Failed to load careers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCareers();
    const handleOpenNew = () => openCreateModal();
    window.addEventListener("careers:open-new", handleOpenNew);
    return () => window.removeEventListener("careers:open-new", handleOpenNew);
  }, []);

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({
      title: "",
      department: selectedDept !== "All" ? selectedDept : "Digital",
      employment_type: "Full-time",
      location: "Remote / Hybrid",
      description: "",
      requirements: [""],
      responsibilities: [""],
      apply_email: "careers@frametoque.com",
      apply_url: "",
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: CareerItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      department: item.department,
      employment_type: item.employment_type || "Full-time",
      location: item.location || "Remote / Hybrid",
      description: item.description || "",
      requirements: item.requirements?.length ? item.requirements : [""],
      responsibilities: item.responsibilities?.length ? item.responsibilities : [""],
      apply_email: item.apply_email || "careers@frametoque.com",
      apply_url: item.apply_url || "",
      is_active: item.is_active,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return alert("Role title is required");

    setSaving(true);
    try {
      const cleanedReqs = formData.requirements.map((r) => r.trim()).filter(Boolean);
      const cleanedResp = formData.responsibilities.map((r) => r.trim()).filter(Boolean);

      const payload = {
        ...formData,
        requirements: cleanedReqs,
        responsibilities: cleanedResp,
      };

      if (editingItem) {
        await updateCareer(editingItem.id, payload);
      } else {
        await createCareer(payload);
      }
      setIsModalOpen(false);
      await loadCareers();
    } catch (err: any) {
      alert(err?.message || "Failed to save career opening");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: CareerItem) => {
    if (!confirm(`Are you sure you want to delete the role "${item.title}"?`)) return;

    try {
      await deleteCareer(item.id);
      await loadCareers();
    } catch (err: any) {
      alert(err?.message || "Failed to delete role");
    }
  };

  const handleToggleStatus = async (item: CareerItem) => {
    try {
      const nextStatus = !item.is_active;
      await toggleCareerStatus(item.id, nextStatus);
      setCareers((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, is_active: nextStatus } : c))
      );
    } catch (err: any) {
      alert(err?.message || "Failed to update status");
    }
  };

  // Dynamic Array Handlers for Responsibilities & Requirements
  const handleListChange = (
    field: "requirements" | "responsibilities",
    index: number,
    value: string
  ) => {
    setFormData((prev) => {
      const list = [...prev[field]];
      list[index] = value;
      return { ...prev, [field]: list };
    });
  };

  const addListItem = (field: "requirements" | "responsibilities") => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], ""],
    }));
  };

  const removeListItem = (
    field: "requirements" | "responsibilities",
    index: number
  ) => {
    setFormData((prev) => {
      const list = prev[field].filter((_, i) => i !== index);
      return { ...prev, [field]: list.length ? list : [""] };
    });
  };

  // Filtered List
  const filteredCareers = useMemo(() => {
    return careers.filter((item) => {
      const matchDept = selectedDept === "All" || item.department.toLowerCase() === selectedDept.toLowerCase();
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && item.is_active) ||
        (statusFilter === "inactive" && !item.is_active);
      const matchSearch =
        !search.trim() ||
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase()) ||
        item.location.toLowerCase().includes(search.toLowerCase());

      return matchDept && matchStatus && matchSearch;
    });
  }, [careers, selectedDept, statusFilter, search]);

  const activeCount = careers.filter((c) => c.is_active).length;
  const closedCount = careers.length - activeCount;

  const stats = [
    {
      label: "Total Positions",
      value: careers.length,
      icon: Briefcase,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
    },
    {
      label: "Active Openings",
      value: activeCount,
      icon: CheckCircle2,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
    },
    {
      label: "Closed / Draft",
      value: closedCount,
      icon: XCircle,
      color: "text-gray-400",
      bg: "bg-gray-400/10",
    },
  ];

  return (
    <div className="space-y-6 text-white min-h-screen">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex items-center gap-4 hover:bg-white/10 transition-colors min-w-0"
          >
            <div className={`p-4 rounded-2xl flex-shrink-0 ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-gray-400 text-sm">{stat.label}</p>
              <p className="text-2xl font-bold truncate text-white mt-0.5">
                <AnimatedNumber value={stat.value} />
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Department Tabs & Search/Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Department Tabs */}
        <div className="flex flex-wrap gap-2">
          {DEPARTMENTS.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                selectedDept === dept
                  ? "bg-white text-black border-white shadow-md font-bold"
                  : "bg-white/5 text-gray-400 border-white/10 hover:text-white hover:bg-white/10"
              }`}
            >
              {dept}
            </button>
          ))}
        </div>

        {/* Search & Status Filter */}
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search roles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-2 outline-none focus:border-brand-500 transition-colors text-xs text-white placeholder-gray-400"
            />
          </div>

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300 focus:outline-none focus:border-brand-500 cursor-pointer appearance-none pr-8"
            >
              <option value="all" className="bg-black">All Statuses</option>
              <option value="active" className="bg-black">Active Only</option>
              <option value="inactive" className="bg-black">Closed Only</option>
            </select>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Careers Table */}
      {loading ? (
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 animate-pulse space-y-4">
          <div className="h-6 bg-white/10 rounded-full w-48 mb-6" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex justify-between items-center py-4 border-b border-white/5 last:border-0">
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-white/10 rounded-full w-1/3" />
                <div className="h-3 bg-white/5 rounded-full w-1/4" />
              </div>
              <div className="h-6 bg-white/10 rounded-full w-20" />
            </div>
          ))}
        </div>
      ) : filteredCareers.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 text-gray-400">
            <Briefcase className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No Careers Found</h3>
          <p className="text-gray-400 text-sm max-w-sm mx-auto mb-6">
            {search || selectedDept !== "All" || statusFilter !== "all"
              ? "No roles match your search or filters. Try adjusting them."
              : "No career openings have been published yet. Post your first job role to get started."}
          </p>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-lg shadow-brand-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Post New Role</span>
          </button>
        </div>
      ) : (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 text-xs uppercase tracking-wider font-semibold">
                  <th className="p-4 pl-6">Role</th>
                  <th className="p-4 hidden sm:table-cell">Department</th>
                  <th className="p-4 hidden md:table-cell">Type</th>
                  <th className="p-4 hidden lg:table-cell">Location</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {filteredCareers.map((item) => (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                    <td className="p-4 pl-6">
                      <div className="space-y-1">
                        <p className="font-semibold text-white group-hover:text-brand-300 transition-colors">
                          {item.title}
                        </p>
                        <p className="text-xs text-gray-400 line-clamp-1 max-w-md">
                          {item.description || "No description provided."}
                        </p>
                      </div>
                    </td>
                    <td className="p-4 hidden sm:table-cell">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20">
                        {item.department}
                      </span>
                    </td>
                    <td className="p-4 hidden md:table-cell text-gray-300 text-xs">
                      <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300">
                        {item.employment_type}
                      </span>
                    </td>
                    <td className="p-4 hidden lg:table-cell text-xs text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                        <span className="truncate max-w-[150px]">{item.location}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(item)}
                        title={item.is_active ? "Click to deactivate" : "Click to activate"}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                          item.is_active
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                            : "bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${item.is_active ? "bg-emerald-400" : "bg-gray-500"}`} />
                        <span>{item.is_active ? "Active" : "Closed"}</span>
                      </button>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
                          title="Edit Role"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-2 rounded-full bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                          title="Delete Role"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL (Landscape with Fixed Sticky Header & Footer) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-hidden">
          <div className="relative w-full max-w-5xl bg-[#0c0c0e] border border-white/15 rounded-3xl shadow-2xl h-[90vh] max-h-[850px] flex flex-col overflow-hidden">
            <form onSubmit={handleSave} className="flex flex-col h-full overflow-hidden">
              {/* Modal Header (Fixed) */}
              <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-white/10 shrink-0 bg-[#0c0c0e]">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {editingItem ? "Edit Career Opening" : "Post New Career Opening"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body (Scrollable 2-Column Grid) */}
              <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
                  {/* Left Column: Core Role Details */}
                  <div className="space-y-5">
                    <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                      <span className="text-xs font-bold uppercase tracking-wider text-brand-400">General Information</span>
                    </div>

                    {/* Title & Department */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                          Job Title *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                          Department *
                        </label>
                        <select
                          value={formData.department}
                          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500 cursor-pointer"
                        >
                          <option value="Digital" className="bg-black">Digital</option>
                          <option value="Productions" className="bg-black">Productions</option>
                          <option value="Operations" className="bg-black">Operations</option>
                        </select>
                      </div>
                    </div>

                    {/* Employment Type & Location */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                          Employment Type
                        </label>
                        <select
                          value={formData.employment_type}
                          onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500 cursor-pointer"
                        >
                          {EMPLOYMENT_TYPES.map((type) => (
                            <option key={type} value={type} className="bg-black">{type}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                          Location
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Remote / Hybrid (Colombo)"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
                        />
                      </div>
                    </div>

                    {/* Role Description */}
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                        Role Overview / Description
                      </label>
                      <textarea
                        rows={4}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 resize-none leading-relaxed"
                      />
                    </div>

                    {/* Application Receiving Channels */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                          Application Receiving Email
                        </label>
                        <input
                          type="email"
                          value={formData.apply_email}
                          onChange={(e) => setFormData({ ...formData, apply_email: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                          External Link (Optional)
                        </label>
                        <input
                          type="url"
                          placeholder="https://..."
                          value={formData.apply_url}
                          onChange={(e) => setFormData({ ...formData, apply_url: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
                        />
                      </div>
                    </div>

                    {/* Status Toggle */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/10">
                      <div>
                        <p className="text-sm font-semibold text-white">Active & Accepting Applications</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                        className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                          formData.is_active ? "bg-brand-500" : "bg-white/10"
                        }`}
                      >
                        <span
                          className={`block w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                            formData.is_active ? "left-7" : "left-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Responsibilities & Requirements Lists */}
                  <div className="space-y-6">
                    {/* Responsibilities list */}
                    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-white/5">
                        <div>
                          <label className="text-xs font-bold text-gray-200 uppercase tracking-wider">
                            Key Responsibilities
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={() => addListItem("responsibilities")}
                          className="text-xs text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/20 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Item</span>
                        </button>
                      </div>
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {formData.responsibilities.map((resp, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-gray-500 w-5 shrink-0 text-right">#{idx + 1}</span>
                            <input
                              type="text"
                              placeholder={`Responsibility item...`}
                              value={resp}
                              onChange={(e) => handleListChange("responsibilities", idx, e.target.value)}
                              className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
                            />
                            {formData.responsibilities.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeListItem("responsibilities", idx)}
                                className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-md cursor-pointer transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Requirements list */}
                    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-white/5">
                        <div>
                          <label className="text-xs font-bold text-gray-200 uppercase tracking-wider">
                            Requirements & Skills
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={() => addListItem("requirements")}
                          className="text-xs text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/20 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Item</span>
                        </button>
                      </div>
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {formData.requirements.map((req, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-gray-500 w-5 shrink-0 text-right">#{idx + 1}</span>
                            <input
                              type="text"
                              placeholder={`Requirement item...`}
                              value={req}
                              onChange={(e) => handleListChange("requirements", idx, e.target.value)}
                              className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
                            />
                            {formData.requirements.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeListItem("requirements", idx)}
                                className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-md cursor-pointer transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer (Sticky & Always Visible) */}
              <div className="flex items-center justify-end px-6 sm:px-8 py-4 border-t border-white/10 bg-[#0c0c0e] shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-sm font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-semibold shadow-lg shadow-brand-500/20 transition-all cursor-pointer hover:scale-105 active:scale-95"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{editingItem ? "Save Changes" : "Publish Opening"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
