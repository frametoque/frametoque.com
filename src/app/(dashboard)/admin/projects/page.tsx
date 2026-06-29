"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Folder, Plus, Trash2, Search, Edit2, AlertCircle, CheckCircle, Clock, 
  RefreshCw
} from "lucide-react";
import { getProjects, deleteProject } from "../actions/actions";

const filters = ["All", "Pending", "In Progress", "Completed"];

const statusStyles: Record<string, string> = {
  "pending": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "in progress": "bg-brand-500/20 text-brand-400 border-brand-500/30",
  "completed": "bg-green-500/20 text-green-400 border-green-500/30",
};

const statusLabels: Record<string, string> = {
  "pending": "Pending",
  "in progress": "In Progress",
  "completed": "Completed",
};

const formatLKR = (amount: number) => {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0);
};

export default function ProjectsAdminMain() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const prjs = await getProjects();
      setProjects(prjs);
    } catch (e) {
      console.error("Failed to load projects:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteProject = async (id: number) => {
    if (confirm("Are you sure you want to delete this project?")) {
      try {
        await deleteProject(id);
        await loadData();
      } catch (err) {
        console.error("Delete failed:", err);
        alert("Failed to delete project.");
      }
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-400 animate-pulse">Loading projects data...</div>;
  }

  // Calculate Metrics
  const totalCount = projects.length;
  const pendingCount = projects.filter(p => p.status === "pending").length;
  const inProgressCount = projects.filter(p => p.status === "in progress").length;
  const completedCount = projects.filter(p => p.status === "completed").length;

  const stats = [
    { label: "Total Projects", value: totalCount.toString(), icon: Folder, color: "text-brand-400", bg: "bg-brand-400/10" },
    { label: "Pending", value: pendingCount.toString(), icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10" },
    { label: "In Progress", value: inProgressCount.toString(), icon: RefreshCw, color: "text-blue-400", bg: "bg-blue-400/10" },
    { label: "Completed", value: completedCount.toString(), icon: CheckCircle, color: "text-green-400", bg: "bg-green-400/10" },
  ];

  // Filter & Search Projects
  const filteredProjects = projects.filter((p) => {
    const statusMatch = activeFilter === "All" || p.status?.toLowerCase() === activeFilter.toLowerCase();
    
    const searchLower = searchTerm.toLowerCase();
    const searchMatch =
      p.title.toLowerCase().includes(searchLower) ||
      (p.description || "").toLowerCase().includes(searchLower) ||
      (p.client_name || "").toLowerCase().includes(searchLower) ||
      (p.user_email || "").toLowerCase().includes(searchLower) ||
      (p.invoice_number || "").toLowerCase().includes(searchLower);

    return statusMatch && searchMatch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Projects</h1>
          <p className="text-gray-400 text-sm mt-1">Manage project details, clients, and timelines.</p>
        </div>
        <Link
          href="/admin/projects/new"
          className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-3xl font-semibold transition-colors active:scale-95 duration-200"
        >
          <Plus className="w-5 h-5" />
          Create Project
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex items-center gap-4 hover:bg-white/10 transition-colors">
            <div className={`p-4 rounded-2xl ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-gray-400 text-sm">{stat.label}</p>
              <p className="text-2xl font-semibold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row justify-between gap-4 items-center">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-full pl-11 pr-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        {/* Tab Filters */}
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
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

      {/* Projects List Table */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
        {filteredProjects.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No projects found matching the criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 text-xs uppercase font-medium">
                  <th className="p-6">Project details</th>
                  <th className="p-6">Client</th>
                  <th className="p-6">Type</th>
                  <th className="p-6">Progress</th>
                  <th className="p-6 text-right">Price</th>
                  <th className="p-6">Invoice Num</th>
                  <th className="p-6">Status</th>
                  <th className="p-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm text-gray-300">
                {filteredProjects.map((row) => (
                  <tr key={row.id} className="hover:bg-white/5 transition-colors">
                    {/* Title */}
                    <td className="p-6 max-w-xs">
                      <p className="font-semibold text-white text-base truncate">{row.title}</p>
                      <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{row.description || "No description"}</p>
                    </td>

                    {/* Client */}
                    <td className="p-6">
                      <p className="font-medium text-white">{row.client_name || "N/A"}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{row.user_email}</p>
                    </td>

                    {/* Type */}
                    <td className="p-6">
                      <span className="text-xs bg-white/5 border border-white/10 px-3 py-1 rounded-full text-slate-300">
                        {row.type || "Other"}
                      </span>
                    </td>

                    {/* Progress */}
                    <td className="p-6 w-48">
                      <div className="flex items-center gap-3">
                        <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-brand-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${row.progress || 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-white flex items-center min-w-8">
                          {row.progress || 0}%
                        </span>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="p-6 text-right font-semibold text-white text-base">
                      {formatLKR(row.price)}
                    </td>

                    {/* Invoice */}
                    <td className="p-6">
                      <span className="font-semibold text-xs text-brand-300">
                        <Link href={`/admin/invoice/${row.invoice_number}`}>
                          {row.invoice_number}
                        </Link>
                      </span>
                    </td>

                    {/* Status */}
                    <td className="p-6">
                      <span className={`px-3 py-1 border text-xs font-semibold rounded-full ${statusStyles[row.status] || "bg-slate-500/20 text-slate-400 border-slate-500/30"}`}>
                        {statusLabels[row.status] || row.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-6">
                      <div className="flex items-center justify-center gap-3">
                        <Link
                          href={`/admin/projects/${row.id}/edit`}
                          className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white"
                          title="Edit Project"
                        >
                          <Edit2 className="w-4.5 h-4.5" />
                        </Link>
                        <button
                          onClick={() => handleDeleteProject(row.id)}
                          className="p-2 hover:bg-red-500/10 rounded-xl transition-colors text-gray-400 hover:text-red-400"
                          title="Delete Project"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
