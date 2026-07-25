"use client";

import { useEffect, useState, useRef } from "react";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
  UploadCloud,
  Globe,
  Briefcase,
  Layers,
  Check,
  Zap,
  Clock,
  Shield,
  Users,
  Palette,
  Video,
  Music,
  Camera,
  Image as ImageIcon,
  Sliders,
  Share2,
  Trash,
  PlusCircle,
  ExternalLink,
  ChevronRight,
  GripVertical,
  ArrowUpDown
} from "lucide-react";
import Link from "next/link";
import {
  getServicesByCategory,
  createService,
  updateService,
  deleteService,
  uploadServiceCover,
  reorderServicesBatch
} from "../actions/servicesActions";

// Map slugs to human readable categories
const CATEGORIES = [
  { slug: "photo-video", name: "Photography & Videography" },
  { slug: "graphic-design", name: "Graphic Design" },
  { slug: "video-editing", name: "Video Editing" },
  { slug: "web-dev", name: "Web Development" },
];

// Available icons for features
const AVAILABLE_ICONS = [
  "Zap", "Clock", "Shield", "Users", "Palette", "Layers",
  "Video", "Music", "Globe", "Camera", "Image", "Sliders", "Share2"
];

// Icon mapping helper for rendering
const renderFeatureIcon = (iconName: string) => {
  const props = { className: "w-5 h-5" };
  switch (iconName) {
    case "Zap":      return <Zap {...props} />;
    case "Clock":    return <Clock {...props} />;
    case "Shield":   return <Shield {...props} />;
    case "Users":    return <Users {...props} />;
    case "Palette":  return <Palette {...props} />;
    case "Layers":   return <Layers {...props} />;
    case "Video":    return <Video {...props} />;
    case "Music":    return <Music {...props} />;
    case "Globe":    return <Globe {...props} />;
    case "Camera":   return <Camera {...props} />;
    case "Image":    return <ImageIcon {...props} />;
    case "Sliders":  return <Sliders {...props} />;
    case "Share2":   return <Share2 {...props} />;
    default:         return <Zap {...props} />;
  }
};

const defaultServiceForm = {
  service_id: "",
  title: "",
  description: "",
  overview: "",
  hero_image: "",
  technologies: [] as string[],
  features: [] as { icon: string; title: string; description: string }[],
  process: [] as { step: number; title: string; description: string }[],
  packages: [] as {
    tier: string;
    description: string;
    price: string;
    popular: boolean;
    duration: string;
    cta: string;
    features: string[];
  }[]
};

export default function ServicesAdminPage() {
  const [activeCategory, setActiveCategory] = useState("photo-video");
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal control
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState(defaultServiceForm);
  const [formTab, setFormTab] = useState<"general" | "features" | "process" | "packages">("general");

  // Save states
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag and Drop reordering states
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [dragItems, setDragItems] = useState<any[]>([]);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  
  // Icon dropdown control
  const [openIconDropdownIdx, setOpenIconDropdownIdx] = useState<number | null>(null);

  // Load services
  const loadServices = async () => {
    setLoading(true);
    try {
      const data = await getServicesByCategory(activeCategory);
      setServices(data);
      setDragItems(data);
    } catch (err) {
      console.error("Failed to load services:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setIsReorderMode(false);
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await getServicesByCategory(activeCategory);
        if (!cancelled) {
          setServices(data);
          setDragItems(data);
        }
      } catch (err) {
        console.error("Failed to load services:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [activeCategory]);

  // Lock body & document scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    } else {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    }
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [isModalOpen]);

  // Form input changes
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Technologies comma separation helper
  const handleTechChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.value.split(",").map((tech) => tech.trim());
    setFormData((prev) => ({ ...prev, technologies: list }));
  };

  // Cover image file upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const uploadData = new FormData();
      uploadData.append("file", file);
      const url = await uploadServiceCover(uploadData);
      setFormData((prev) => ({ ...prev, hero_image: url }));
    } catch (err) {
      console.error("Image upload failed:", err);
      alert("Image upload failed. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  };

  // --- Features Helpers ---
  const addFeature = () => {
    setFormData((prev) => ({
      ...prev,
      features: [...prev.features, { icon: "Zap", title: "", description: "" }]
    }));
  };

  const updateFeature = (index: number, field: string, value: string) => {
    setFormData((prev) => {
      const updated = [...prev.features];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, features: updated };
    });
  };

  const removeFeature = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.filter((_, idx) => idx !== index)
    }));
  };

  // Drag & drop handlers for rows
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggingIdx(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggingIdx === null || draggingIdx === index) return;
    
    const list = [...dragItems];
    const draggedItem = list[draggingIdx];
    list.splice(draggingIdx, 1);
    list.splice(index, 0, draggedItem);
    setDraggingIdx(index);
    setDragItems(list);
  };

  const handleDragEnd = () => {
    setDraggingIdx(null);
  };

  // Save the custom dragged order to database
  const handleSaveOrder = async () => {
    setSaving(true);
    try {
      const orderedIds = dragItems.map(item => item.id);
      await reorderServicesBatch(activeCategory, orderedIds);
      setIsReorderMode(false);
      await loadServices();
    } catch (err) {
      console.error("Failed to save reordered services:", err);
      alert("Failed to save the new order. Check logs.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelReorder = () => {
    setIsReorderMode(false);
    setDragItems(services);
  };
  const addProcessStep = () => {
    setFormData((prev) => {
      const nextStep = prev.process.length + 1;
      return {
        ...prev,
        process: [...prev.process, { step: nextStep, title: "", description: "" }]
      };
    });
  };

  const updateProcessStep = (index: number, field: string, value: any) => {
    setFormData((prev) => {
      const updated = [...prev.process];
      updated[index] = { ...updated[index], [field]: value };
      // Re-assign step numbers in sequence
      const resequenced = updated.map((item, idx) => ({
        ...item,
        step: idx + 1
      }));
      return { ...prev, process: resequenced };
    });
  };

  const removeProcessStep = (index: number) => {
    setFormData((prev) => {
      const filtered = prev.process.filter((_, idx) => idx !== index);
      const resequenced = filtered.map((item, idx) => ({
        ...item,
        step: idx + 1
      }));
      return { ...prev, process: resequenced };
    });
  };

  // --- Packages Pricing Helpers ---
  const addPackage = () => {
    setFormData((prev) => ({
      ...prev,
      packages: [
        ...prev.packages,
        {
          tier: "",
          description: "",
          price: "",
          popular: false,
          duration: "",
          cta: "Order Now",
          features: []
        }
      ]
    }));
  };

  const updatePackage = (index: number, field: string, value: any) => {
    setFormData((prev) => {
      const updated = [...prev.packages];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, packages: updated };
    });
  };

  const removePackage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      packages: prev.packages.filter((_, idx) => idx !== index)
    }));
  };

  const addPackageFeature = (pkgIndex: number, text: string) => {
    if (!text.trim()) return;
    setFormData((prev) => {
      const updatedPkgs = [...prev.packages];
      updatedPkgs[pkgIndex] = {
        ...updatedPkgs[pkgIndex],
        features: [...updatedPkgs[pkgIndex].features, text.trim()]
      };
      return { ...prev, packages: updatedPkgs };
    });
  };

  const removePackageFeature = (pkgIndex: number, featIndex: number) => {
    setFormData((prev) => {
      const updatedPkgs = [...prev.packages];
      updatedPkgs[pkgIndex] = {
        ...updatedPkgs[pkgIndex],
        features: updatedPkgs[pkgIndex].features.filter((_, idx) => idx !== featIndex)
      };
      return { ...prev, packages: updatedPkgs };
    });
  };

  // --- Save / Create Flow ---
  const openNew = () => {
    setEditingId(null);
    setFormData({
      ...defaultServiceForm,
      hero_image: "/services/eventpulse.png" // Default fallback
    });
    setFormTab("general");
    setIsModalOpen(true);
  };

  const openEdit = (service: any) => {
    setEditingId(service.id);
    setFormData({
      service_id: service.service_id || "",
      title: service.title || "",
      description: service.description || "",
      overview: service.overview || "",
      hero_image: service.hero_image || "/services/eventpulse.png",
      technologies: Array.isArray(service.technologies) ? service.technologies : [],
      features: Array.isArray(service.features) ? service.features : [],
      process: Array.isArray(service.process) ? service.process : [],
      packages: Array.isArray(service.packages) ? service.packages : []
    });
    setFormTab("general");
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.service_id.trim()) {
      alert("Service ID (URL slug) is required.");
      return;
    }
    if (!formData.title.trim()) {
      alert("Service title is required.");
      return;
    }
    if (!formData.overview.trim()) {
      alert("Service overview is required.");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await updateService(activeCategory, editingId, formData);
      } else {
        await createService(activeCategory, formData);
      }
      setIsModalOpen(false);
      await loadServices();
    } catch (err) {
      console.error("Failed to save service:", err);
      alert("Failed to save service. Check logs for details.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (service: any) => {
    if (!confirm(`Are you sure you want to delete "${service.title}"? This action is permanent.`)) {
      return;
    }
    setDeletingId(service.id);
    try {
      await deleteService(activeCategory, service.id);
      await loadServices();
    } catch (err) {
      console.error("Failed to delete service:", err);
      alert("Failed to delete service.");
    } finally {
      setDeletingId(null);
    }
  };

  // Filter list by search query
  const filteredServices = services.filter(
    (s) =>
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.service_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.overview.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 text-white bg-black min-h-screen">

      {/* Category Tabs & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => setActiveCategory(cat.slug)}
              className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                activeCategory === cat.slug
                  ? "bg-white text-black border-white shadow-md font-bold"
                  : "bg-white/5 text-gray-400 border-white/10 hover:text-white hover:bg-white/10"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap self-end lg:self-auto">
          {isReorderMode ? (
            <>
              <button
                onClick={handleCancelReorder}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-3xl text-sm font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveOrder}
                disabled={saving}
                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-3xl text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                {saving ? "Saving..." : "Save Order"}
              </button>
            </>
          ) : (
            <>
              {services.length > 1 && (
                <button
                  onClick={() => setIsReorderMode(true)}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white rounded-3xl text-sm font-semibold transition-colors cursor-pointer"
                >
                  <ArrowUpDown className="w-4 h-4" /> Change Order
                </button>
              )}
              <button
                onClick={openNew}
                className="flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-3xl font-semibold transition-colors whitespace-nowrap text-sm cursor-pointer"
              >
                <Plus className="w-5 h-5" /> Add Service
              </button>
            </>
          )}
        </div>
      </div>

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
      ) : (
        <>
          {/* Table View */}
          {filteredServices.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center text-gray-500">
              <p className="text-lg">No services found in this category.</p>
              <button
                onClick={openNew}
                className="mt-4 px-5 py-2 bg-brand-600 text-white rounded-3xl text-sm font-semibold hover:bg-brand-500 transition-colors cursor-pointer"
              >
                Create the First Service
              </button>
            </div>
          ) : (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-400 text-sm">
                      {isReorderMode && <th className="p-4 w-10"></th>}
                      <th className="p-4 font-medium">Service</th>
                      <th className="p-4 font-medium hidden md:table-cell">Overview</th>
                      <th className="p-4 font-medium hidden sm:table-cell">Base Price</th>
                      <th className="p-4 font-medium text-center">Packages</th>
                      <th className="p-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {dragItems.map((service, idx) => (
                      <tr
                        key={service.id}
                        draggable={isReorderMode}
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDragEnd={handleDragEnd}
                        className={`hover:bg-white/5 transition-colors group ${
                          isReorderMode ? "cursor-move select-none" : ""
                        } ${draggingIdx === idx ? "opacity-40 bg-white/10" : ""}`}
                      >
                        {isReorderMode && (
                          <td className="p-4 w-10 text-gray-500 group-hover:text-gray-300">
                            <GripVertical className="w-4 h-4 cursor-grab active:cursor-grabbing" />
                          </td>
                        )}
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-16 h-10 rounded-lg overflow-hidden bg-slate-900 flex-shrink-0 border border-white/10">
                              <img
                                src={service.hero_image || "/services/eventpulse.png"}
                                alt={service.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <p className="font-semibold text-white text-sm">{service.title}</p>
                              <span className="text-[10px] text-brand-400 font-mono">{service.service_id}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-gray-300 hidden md:table-cell max-w-xs truncate" title={service.overview}>
                          {service.overview}
                        </td>
                        <td className="p-4 hidden sm:table-cell text-sm text-gray-300">
                          {service.packages?.[0] ? (
                            <span className="font-semibold text-white">LKR {service.packages[0].price}</span>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>
                        <td className="p-4 text-sm text-gray-300 text-center">
                          <span className="px-2 py-1 bg-white/5 border border-white/10 rounded-full text-xs">
                            {service.packages?.length || 0}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!isReorderMode && (
                              <Link
                                href={`/services/${activeCategory}/${service.service_id}`}
                                target="_blank"
                                className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors cursor-pointer"
                                title="View Public Page"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Link>
                            )}
                            <button
                              onClick={() => openEdit(service)}
                              disabled={isReorderMode}
                              className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-blue-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                              title="Edit Service"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(service)}
                              disabled={deletingId === service.id || isReorderMode}
                              className="p-2 bg-white/5 hover:bg-red-500/10 hover:text-red-400 rounded-full text-gray-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                              title="Delete Service"
                            >
                              {deletingId === service.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
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
        </>
      )}

      {/* Modal Backdrop / Wrapper */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overscroll-contain" data-lenis-prevent>
          <div className="bg-zinc-950 border border-white/10 w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overscroll-contain overflow-hidden" data-lenis-prevent>
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-white/10 flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold">
                  {editingId ? `Edit Service: ${formData.title}` : "Add New Service"}
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Adding to category: <span className="text-brand-400 font-semibold">{CATEGORIES.find(c => c.slug === activeCategory)?.name}</span>
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex bg-white/5 p-1.5 border-b border-white/10 flex-shrink-0 gap-1">
              {(["general", "features", "process", "packages"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFormTab(tab)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl capitalize transition-all cursor-pointer
                    ${
                      formTab === tab
                        ? "bg-white text-black"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 overscroll-contain min-h-0" data-lenis-prevent>
              
              {/* Tab 1: General */}
              {formTab === "general" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                        Service ID (Slug / URL path) *
                      </label>
                      <input
                        type="text"
                        name="service_id"
                        value={formData.service_id}
                        onChange={handleTextChange}
                        placeholder="e.g. enterprise-web-development"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:border-brand-500 outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                        Service Title *
                      </label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleTextChange}
                        placeholder="e.g. Enterprise Web Applications"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:border-brand-500 outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                        Summary / Overview *
                      </label>
                      <input
                        type="text"
                        name="overview"
                        value={formData.overview}
                        onChange={handleTextChange}
                        placeholder="Short card summary description"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:border-brand-500 outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                        Full Description (HTML / Markdown friendly)
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleTextChange}
                        placeholder="Detailed service description..."
                        rows={4}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:border-brand-500 outline-none transition-colors resize-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Cover image uploader */}
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                        Cover Image / Hero Image
                      </label>
                      <div className="border border-dashed border-white/20 rounded-2xl p-4 flex flex-col items-center justify-center space-y-4 bg-white/5 hover:border-brand-500/50 transition-colors relative min-h-[200px]">
                        {formData.hero_image ? (
                          <div className="w-full h-40 rounded-xl overflow-hidden relative group">
                            <img
                              src={formData.hero_image}
                              alt="Cover Preview"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl text-xs font-semibold cursor-pointer"
                              >
                                Change Image
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <UploadCloud className="w-10 h-10 text-gray-400" />
                            <div className="text-center">
                              <p className="text-sm font-semibold">Upload cover photo</p>
                              <p className="text-xs text-gray-500 mt-1">PNG, JPG, SVG up to 10MB</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl text-xs font-semibold cursor-pointer"
                            >
                              Browse Files
                            </button>
                          </>
                        )}
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleImageUpload}
                          accept="image/*"
                          className="hidden"
                        />
                        {uploadingImage && (
                          <div className="absolute inset-0 bg-black/75 rounded-2xl flex items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
                            <span className="text-xs">Uploading...</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-3">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase">Cover Image Path</label>
                        <input
                          type="text"
                          name="hero_image"
                          value={formData.hero_image}
                          onChange={handleTextChange}
                          placeholder="/services/image.png"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs focus:border-brand-500 outline-none text-gray-300 mt-1"
                        />
                      </div>
                    </div>

                    {/* Technologies list */}
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                        Technologies (comma separated)
                      </label>
                      <input
                        type="text"
                        value={formData.technologies.join(", ")}
                        onChange={handleTechChange}
                        placeholder="e.g. Next.js, TailwindCSS, React, PostgreSQL"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:border-brand-500 outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Features */}
              {formTab === "features" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Features Checklist</h3>
                    <button
                      type="button"
                      onClick={addFeature}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl text-xs font-semibold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Feature
                    </button>
                  </div>

                  <div className="space-y-4">
                    {formData.features.map((feature, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col md:flex-row gap-4 items-start md:items-center relative group"
                      >
                        {/* Icon Selection */}
                        <div className="w-full md:w-1/4 relative">
                          <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Icon</label>
                          <button
                            type="button"
                            onClick={() => setOpenIconDropdownIdx(openIconDropdownIdx === idx ? null : idx)}
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-500 flex items-center justify-between cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              {renderFeatureIcon(feature.icon)}
                              {feature.icon}
                            </span>
                            <span className="text-[10px] text-gray-400">▼</span>
                          </button>
                          {openIconDropdownIdx === idx && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setOpenIconDropdownIdx(null)}
                              />
                              <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-zinc-950 border border-white/15 rounded-xl py-1 shadow-xl z-20 divide-y divide-white/5">
                                {AVAILABLE_ICONS.map((ico) => (
                                  <button
                                    key={ico}
                                    type="button"
                                    onClick={() => {
                                      updateFeature(idx, "icon", ico);
                                      setOpenIconDropdownIdx(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-xs text-gray-300 hover:bg-white/10 hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
                                  >
                                    {renderFeatureIcon(ico)}
                                    <span>{ico}</span>
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Title */}
                        <div className="w-full md:w-1/3">
                          <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Title</label>
                          <input
                            type="text"
                            value={feature.title}
                            onChange={(e) => updateFeature(idx, "title", e.target.value)}
                            placeholder="Feature Title"
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-500"
                          />
                        </div>

                        {/* Description */}
                        <div className="w-full md:w-5/12 flex items-center gap-3">
                          <div className="flex-1">
                            <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Description</label>
                            <input
                              type="text"
                              value={feature.description}
                              onChange={(e) => updateFeature(idx, "description", e.target.value)}
                              placeholder="Feature Description"
                              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-500"
                            />
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => removeFeature(idx)}
                            className="p-2 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-full transition-colors self-end md:self-auto cursor-pointer"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {formData.features.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-6">No features configured yet. Click "Add Feature" to get started.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Process Steps */}
              {formTab === "process" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Process Timeline Steps</h3>
                    <button
                      type="button"
                      onClick={addProcessStep}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl text-xs font-semibold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Step
                    </button>
                  </div>

                  <div className="space-y-4">
                    {formData.process.map((step, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-white/5 border border-white/10 rounded-2xl flex gap-4 items-start relative group"
                      >
                        {/* Step Number Circle */}
                        <div className="w-10 h-10 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 flex items-center justify-center font-bold text-sm flex-shrink-0 mt-4">
                          {step.step}
                        </div>

                        {/* Title & Desc inputs */}
                        <div className="flex-1 space-y-3">
                          <div className="flex gap-4 items-center">
                            <input
                              type="text"
                              value={step.title}
                              onChange={(e) => updateProcessStep(idx, "title", e.target.value)}
                              placeholder={`Step ${step.step} Title`}
                              className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-brand-500"
                            />
                            
                            <button
                              type="button"
                              onClick={() => removeProcessStep(idx)}
                              className="p-2 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-full transition-colors cursor-pointer"
                            >
                              <Trash className="w-4 h-4" />
                            </button>
                          </div>
                          <textarea
                            value={step.description}
                            onChange={(e) => updateProcessStep(idx, "description", e.target.value)}
                            placeholder="What happens in this stage?"
                            rows={2}
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-brand-500 resize-none"
                          />
                        </div>
                      </div>
                    ))}

                    {formData.process.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-6">No process steps configured yet. Click "Add Step" to define steps.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 4: Packages */}
              {formTab === "packages" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Pricing Tiers / Packages</h3>
                    <button
                      type="button"
                      onClick={addPackage}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl text-xs font-semibold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Package
                    </button>
                  </div>

                  <div className="space-y-8">
                    {formData.packages.map((pkg, idx) => {
                      const newFeatureInputId = `pkg-${idx}-new-feat`;
                      return (
                        <div
                          key={idx}
                          className="p-6 bg-white/5 border border-white/10 rounded-3xl relative group space-y-4"
                        >
                          {/* Close / Remove Package */}
                          <button
                            type="button"
                            onClick={() => removePackage(idx)}
                            className="absolute top-4 right-4 p-2 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-full transition-colors cursor-pointer"
                            title="Remove Package Tier"
                          >
                            <Trash className="w-4 h-4" />
                          </button>

                          {/* Inputs Row 1 */}
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                            <div>
                              <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Tier Name</label>
                              <input
                                type="text"
                                value={pkg.tier}
                                onChange={(e) => updatePackage(idx, "tier", e.target.value)}
                                placeholder="e.g. Standard"
                                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Price (LKR text)</label>
                              <input
                                type="text"
                                value={pkg.price}
                                onChange={(e) => updatePackage(idx, "price", e.target.value)}
                                placeholder="e.g. 25,000"
                                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Duration</label>
                              <input
                                type="text"
                                value={pkg.duration}
                                onChange={(e) => updatePackage(idx, "duration", e.target.value)}
                                placeholder="e.g. 2-3 weeks"
                                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">CTA Text</label>
                              <input
                                type="text"
                                value={pkg.cta}
                                onChange={(e) => updatePackage(idx, "cta", e.target.value)}
                                placeholder="e.g. Order Now"
                                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-500"
                              />
                            </div>
                          </div>

                          {/* Description & Popularity Toggle */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                            <div className="sm:col-span-2">
                              <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Short Description</label>
                              <input
                                type="text"
                                value={pkg.description}
                                onChange={(e) => updatePackage(idx, "description", e.target.value)}
                                placeholder="Package description details..."
                                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-500"
                              />
                            </div>
                            <div className="flex items-center mt-4">
                              <input
                                type="checkbox"
                                id={`popular-${idx}`}
                                checked={pkg.popular}
                                onChange={(e) => updatePackage(idx, "popular", e.target.checked)}
                                className="w-4 h-4 bg-zinc-900 border border-white/10 rounded accent-brand-500 cursor-pointer"
                              />
                              <label
                                htmlFor={`popular-${idx}`}
                                className="ml-2 text-xs font-bold text-gray-400 uppercase tracking-wider cursor-pointer"
                              >
                                Popular Tier Badge
                              </label>
                            </div>
                          </div>

                          {/* Bullet Points / Included Features */}
                          <div className="border-t border-white/10 pt-4">
                            <label className="block text-[10px] text-gray-400 font-bold uppercase mb-2">
                              What's Included
                            </label>
                            
                            {/* Tags list */}
                            <div className="flex flex-wrap gap-2 mb-3">
                              {pkg.features.map((feat, fIdx) => (
                                <span
                                  key={fIdx}
                                  className="text-xs bg-brand-500/10 border border-brand-500/20 text-brand-300 px-3 py-1 rounded-full flex items-center gap-1.5"
                                >
                                  {feat}
                                  <button
                                    type="button"
                                    onClick={() => removePackageFeature(idx, fIdx)}
                                    className="hover:text-red-400 transition-colors font-bold cursor-pointer"
                                  >
                                    &times;
                                  </button>
                                </span>
                              ))}
                              {pkg.features.length === 0 && (
                                <span className="text-xs text-gray-600">No bullet points added yet.</span>
                              )}
                            </div>

                            {/* Add bullet input */}
                            <div className="flex gap-2 max-w-md">
                              <input
                                type="text"
                                id={newFeatureInputId}
                                placeholder="Add feature bullet (e.g. Responsive Design)"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    const input = document.getElementById(newFeatureInputId) as HTMLInputElement;
                                    addPackageFeature(idx, input.value);
                                    input.value = "";
                                  }
                                }}
                                className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-brand-500"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const input = document.getElementById(newFeatureInputId) as HTMLInputElement;
                                  addPackageFeature(idx, input.value);
                                  input.value = "";
                                }}
                                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold cursor-pointer"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {formData.packages.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-6">No pricing packages configured yet. Click "Add Package" to set pricing.</p>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-white/10 flex justify-between items-center bg-black/40 flex-shrink-0 rounded-b-2xl">
              <span className="text-[10px] text-gray-500 font-bold uppercase">
                {formTab === "general" ? "Page 1 of 4: Details" : formTab === "features" ? "Page 2 of 4: Features" : formTab === "process" ? "Page 3 of 4: Steps" : "Page 4 of 4: Tiers"}
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-3xl font-semibold text-sm transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSave}
                  className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-3xl font-semibold text-sm transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
