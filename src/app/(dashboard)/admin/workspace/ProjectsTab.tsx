"use client";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { 
  getProjects, createProject, updateProject, deleteProject, toggleProjectPin,
  getTeamMembers, getTasks, deleteTask, updateTask,
  getAllContentPlannerItems, getSriLankaHolidays,
  getMonthBillingLinks, WorkspaceMonthLink
} from "../actions/workspace";
import { getClients } from "../actions/actions";
import ClientCombobox from "../components/ClientCombobox";
import ContentPlannerCalendar from "./ContentPlannerCalendar";
import { 
  Plus, Trash2, Edit2, Image as ImageIcon, LayoutList, Layout, FolderOpen, 
  ChevronRight, ChevronDown, Palette, Film, Code, Camera, Video,
  Calendar as CalendarIcon, ChevronLeft, Sparkles, Eye, CheckCircle2, Pin
} from "lucide-react";
import TasksTab from "./TasksTab";



const cardTextStyles: any = {
  "Backlog": "text-neutral-400",
  "Planning": "text-blue-400",
  "In Progress": "text-amber-400",
  "Paused": "text-purple-400",
  "Done": "text-emerald-400",
  "Canceled": "text-rose-400"
};

const cardBorderStyles: any = {
  "Backlog": "bg-[#1a1a1a] border-white/10 hover:border-white/20",
  "Planning": "bg-blue-500/[0.05] border-blue-500/20 hover:border-blue-500/30 hover:bg-blue-500/10",
  "In Progress": "bg-amber-500/[0.05] border-amber-500/20 hover:border-amber-500/30 hover:bg-amber-500/10",
  "Paused": "bg-purple-500/[0.05] border-purple-500/20 hover:border-purple-500/30 hover:bg-purple-500/10",
  "Done": "bg-emerald-500/[0.05] border-emerald-500/20 hover:border-emerald-500/30 hover:bg-emerald-500/10",
  "Canceled": "bg-rose-500/[0.05] border-rose-500/20 hover:border-rose-500/30 hover:bg-rose-500/10"
};

const statusStyles: any = {
  "Backlog": "bg-neutral-500/20 text-neutral-300",
  "Planning": "bg-blue-500/20 text-blue-300",
  "In Progress": "bg-amber-500/20 text-amber-300",
  "Paused": "bg-purple-500/20 text-purple-300",
  "Done": "bg-emerald-500/20 text-emerald-300",
  "Canceled": "bg-rose-500/20 text-rose-300"
};

const CategoryIcon = ({ category, className }: { category?: string, className?: string }) => {
  switch (category) {
    case "Graphics Design": return <Palette className={className} />;
    case "Video Editing": return <Film className={className} />;
    case "Web dev": return <Code className={className} />;
    case "Photography": return <Camera className={className} />;
    case "Videography": return <Video className={className} />;
    default: return <FolderOpen className={className} />;
  }
};

const priorityStyles: any = {
  "High": "bg-rose-500/20 text-rose-400",
  "Medium": "bg-amber-500/20 text-amber-400",
  "Low": "bg-blue-500/20 text-blue-400"
};

const PROJECT_CATEGORIES = ["Graphics Design", "Video Editing", "Web dev", "Photography", "Videography"];
export default function ProjectsTab() {
  const router = useRouter();
  const { data: projects = [], isLoading, mutate } = useSWR("workspace-projects", getProjects);
  const { data: team = [] } = useSWR("workspace-team", getTeamMembers);
  const { data: tasks = [], mutate: mutateTasks } = useSWR("workspace-tasks", getTasks);
  const { data: clients = [], isLoading: clientsLoading } = useSWR("admin-clients", getClients);
  const { data: plannerItems = [], mutate: mutatePlanner } = useSWR("workspace-content-planner", getAllContentPlannerItems);
  const { data: monthLinks = [], mutate: mutateMonthLinks } = useSWR("workspace-month-links", () => getMonthBillingLinks());
  const { data: holidays = {} } = useSWR("sri-lanka-holidays", getSriLankaHolidays);
  
  const existingProjectCategories = Array.from(new Set(projects.flatMap((p: any) => {
    return (Array.isArray(p.categories) ? p.categories : (typeof p.categories === 'string' && p.categories.startsWith('[') ? JSON.parse(p.categories) : [])) || [];
  }).filter((c: string) => c && !PROJECT_CATEGORIES.includes(c))));
  const existingTaskCategories = Array.from(new Set(tasks.map((t: any) => t.category).filter((c: string) => c && !PROJECT_CATEGORIES.includes(c))));

  // Sort projects so pinned projects appear at the top, and completed / Done projects appear at the bottom
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a: any, b: any) => {
      const aPinned = Boolean(a.is_pinned);
      const bPinned = Boolean(b.is_pinned);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      const aDone = a.status === "Done";
      const bDone = b.status === "Done";
      if (aDone && !bDone) return 1;
      if (!aDone && bDone) return -1;
      return 0;
    });
  }, [projects]);
  
  const handleTogglePin = async (proj: any) => {
    const newPinned = !proj.is_pinned;
    mutate(
      (prev: any) =>
        prev
          ? prev.map((p: any) =>
              p.id === proj.id ? { ...p, is_pinned: newPinned } : p
            )
          : prev,
      false
    );
    try {
      await toggleProjectPin(proj.id, newPinned);
      mutate();
    } catch (err) {
      console.error("Failed to toggle pin:", err);
      mutate();
    }
  };
  
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [projectActiveTab, setProjectActiveTab] = useState<"planner" | "tasks">("planner");

  useEffect(() => {
    if (selectedProjectId) {
      router.push(`/admin/workspace/project/${selectedProjectId}?tab=${projectActiveTab}`);
      setSelectedProjectId(null);
    }
  }, [selectedProjectId, projectActiveTab, router]);
  const [viewMode, setViewMode] = useState<"projects" | "board" | "tasks">("projects");
  const [expandedProjects, setExpandedProjects] = useState<Record<number, boolean>>({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPlannerProject, setIsPlannerProject] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [clientId, setClientId] = useState<string>("");

  
  const [taskToEdit, setTaskToEdit] = useState<any>(null);
  const [taskName, setTaskName] = useState("");
  const [taskStatus, setTaskStatus] = useState("Not Started");
  const [taskPriority, setTaskPriority] = useState("Medium");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [taskTags, setTaskTags] = useState("");
  const [taskCategory, setTaskCategory] = useState("");
  const [taskCustomCategory, setTaskCustomCategory] = useState("");

  const openTaskEdit = (task: any) => {
    setTaskToEdit(task);
    setTaskName(task.name);
    setTaskStatus(task.status);
    setTaskPriority(task.priority || "Medium");
    setTaskAssignee(task.assignee_id || "");
    setTaskDue(task.due_date || "");
    setTaskTags((Array.isArray(task.tags) ? task.tags : (typeof task.tags === 'string' && task.tags.startsWith('[') ? JSON.parse(task.tags) : [])).join(", "));
    
    const tCat = task.category || "";
    if (tCat && !PROJECT_CATEGORIES.includes(tCat)) {
      setTaskCategory("Custom");
      setTaskCustomCategory(tCat);
    } else {
      setTaskCategory(tCat);
      setTaskCustomCategory("");
    }
  };

  const saveTaskEdit = async (e: any) => {
    e.preventDefault();
    if (!taskToEdit) return;
    await updateTask(taskToEdit.id, {
      ...taskToEdit,
      name: taskName,
      status: taskStatus,
      priority: taskPriority,
      assignee_id: taskAssignee || null,
      due_date: taskDue || null,
      category: taskCategory === "Custom" ? taskCustomCategory : (taskCategory || null),
      tags: taskTags.split(",").map((t: string) => t.trim()).filter(Boolean)
    });
    setTaskToEdit(null);
    mutateTasks();
  };

  const deleteSingleTask = async (id: number) => {
    if (confirm("Are you sure?")) {
      await deleteTask(id);
      mutateTasks();
    }
  };

  const [name, setName] = useState("");
  const [status, setStatus] = useState("Backlog");
  const [priority, setPriority] = useState("Medium");
  const [categories, setCategories] = useState<string[]>([]);
  const [ownerIds, setOwnerIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  
  const openNewModal = () => {
    setEditingProject(null);
    setIsPlannerProject(false);
    setIsPinned(false);
    setName(""); setStatus("Backlog"); setPriority("Medium"); setCategories([]); setOwnerIds([]); setStartDate(""); setDeadline("");
    setClientId("");
    setIsModalOpen(true);
  };

  const openNewPlannerProjectModal = () => {
    setEditingProject(null);
    setIsPlannerProject(true);
    setIsPinned(false);
    setName(""); 
    setStatus("In Progress"); 
    setPriority("Medium"); 
    setCategories(["Content Planner", "Social Media"]); 
    setOwnerIds([]); 
    setStartDate(new Date().toISOString().split("T")[0]); 
    setDeadline("");
    setClientId("");
    setIsModalOpen(true);
  };

  const handleStatusChange = async (proj: any, newStatus: string) => {
    await updateProject(proj.id, { ...proj, status: newStatus });
    mutate();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const projId = e.dataTransfer.getData("projId");
    if (!projId) return;
    const proj = projects.find((p: any) => p.id.toString() === projId);
    if (proj && proj.status !== newStatus) {
      await handleStatusChange(proj, newStatus);
    }
  };

  const openEditModal = (proj: any) => {
    setEditingProject(proj);
    const hasPlanner = Boolean(proj.has_planner || (Array.isArray(proj.categories) ? proj.categories.includes("Content Planner") : (typeof proj.categories === 'string' && proj.categories.includes("Content Planner"))));
    setIsPlannerProject(hasPlanner);
    setIsPinned(Boolean(proj.is_pinned));
    setName(proj.name); setStatus(proj.status); setPriority(proj.priority || "Medium"); 
    setCategories((Array.isArray(proj.categories) ? proj.categories : (typeof proj.categories === 'string' ? (proj.categories.startsWith('[') ? JSON.parse(proj.categories) : []) : []))); 
    setOwnerIds((Array.isArray(proj.owner_ids) ? proj.owner_ids : (typeof proj.owner_ids === 'string' ? (proj.owner_ids.startsWith('[') ? JSON.parse(proj.owner_ids) : []) : []))); 
    setStartDate(proj.start_date || ""); setDeadline(proj.deadline || "");
    setClientId(proj.client_id ? String(proj.client_id) : "");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    try {
      const selectedClient = clients.find((c: any) => String(c.id) === String(clientId));
      const finalCategories = isPlannerProject
        ? (categories.includes("Content Planner") ? categories : [...categories, "Content Planner"])
        : categories.filter(c => c !== "Content Planner");

      const payload: any = { 
        name, 
        status, 
        categories: finalCategories, 
        priority,
        owner_ids: ownerIds,
        start_date: startDate || null,
        deadline: deadline || null,
        client_id: clientId ? Number(clientId) : null,
        client_name: selectedClient ? selectedClient.name : null,
        client_email: selectedClient ? selectedClient.email : null,
        client_company: selectedClient ? selectedClient.company : null,
        has_planner: isPlannerProject,
        is_pinned: isPinned,
      };
      if (editingProject) {
        await updateProject(editingProject.id, payload);
      } else {
        await createProject(payload);
      }
      setIsModalOpen(false);
      mutate();
    } catch (err) {
      console.error(err);
      alert("Failed to save project");
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure?")) {
      try {
        await deleteProject(id);
        if (selectedProjectId === id) setSelectedProjectId(null);
        mutate();
      } catch (err) {
        console.error(err);
        alert("Failed to delete project");
      }
    }
  };

  const toggleOwner = (id: string) => {
    setOwnerIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAllOwners = () => {
    const allIds = team.map((t: any) => t.id);
    const isAllSelected = allIds.length > 0 && allIds.every((id: string) => ownerIds.includes(id));
    if (isAllSelected) {
      setOwnerIds([]);
    } else {
      setOwnerIds(allIds);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedProjects(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (selectedProjectId) {
    const proj = projects.find((p: any) => p.id === selectedProjectId);
    if (!proj) {
      setSelectedProjectId(null);
      return null;
    }

    // If project does not have a planner, render TasksTab directly
    if (!proj.has_planner) {
      return (
        <TasksTab
          projectId={selectedProjectId}
          projectName={proj.name || "Project"}
          onBack={() => setSelectedProjectId(null)}
        />
      );
    }

    // Projects with a planner: show header with tab switcher between Planner & Tasks
    return (
      <div className="space-y-2.5 flex flex-col h-full">
        {/* Project View Header */}
        <div className="bg-[#111115] border border-white/10 rounded-2xl p-2 sm:px-3 sm:py-2 flex flex-wrap items-center justify-between gap-2 shadow-lg backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedProjectId(null)}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors border border-white/10 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Projects</span>
            </button>
            <span className="text-gray-600">/</span>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>{proj.name}</span>
              </h2>
              <div id="inpage-planner-topbar-portal" className="flex items-center gap-1.5 sm:gap-2 shrink-0" />
            </div>
          </div>

          {projectActiveTab === "tasks" ? (
            <button
              onClick={() => setProjectActiveTab("planner")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600/15 hover:bg-brand-600/25 text-brand-300 border border-brand-500/30 rounded-xl font-semibold transition-colors cursor-pointer text-xs whitespace-nowrap"
              title="Switch back to Monthly Content Planner"
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Monthly Content Planner</span>
            </button>
          ) : (
            <div id="inpage-planner-stats-portal" className="flex items-center gap-2 shrink-0" />
          )}
        </div>

        {projectActiveTab === "planner" ? (
          <ContentPlannerCalendar
            projects={projects}
            items={plannerItems}
            monthLinks={monthLinks}
            onSaveMonthLinks={mutateMonthLinks}
            sriLankaHolidays={holidays}
            selectedProjectId={selectedProjectId}
            onSelectProject={(id) => setSelectedProjectId(id)}
            onRefresh={mutatePlanner}
          />
        ) : (
          <TasksTab projectId={selectedProjectId} projectName={proj.name || "Project"} onBack={() => setSelectedProjectId(null)} />
        )}
      </div>
    );
  }

  if (isLoading) return <div className="text-white">Loading...</div>;

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setViewMode("projects")} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 ${viewMode === "projects" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"}`}>
            <FolderOpen className="w-4 h-4" /> List
          </button>
          <button onClick={() => setViewMode("board")} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 ${viewMode === "board" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"}`}>
            <Layout className="w-4 h-4" /> Board
          </button>
          <button onClick={() => setViewMode("tasks")} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 ${viewMode === "tasks" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"}`}>
            <LayoutList className="w-4 h-4" /> Tasks
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button 
            onClick={openNewPlannerProjectModal} 
            className="bg-brand-600/15 hover:bg-brand-600/25 border border-brand-500/30 text-brand-300 font-semibold py-2 px-4 rounded-xl flex items-center gap-2 text-sm shadow-md transition-all cursor-pointer"
          >
            <CalendarIcon className="w-4 h-4 text-brand-400" /> Create Project with Planner
          </button>
          <button 
            onClick={openNewModal} 
            className="bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2 px-4 rounded-xl flex items-center gap-2 text-sm shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> New Project
          </button>
        </div>
      </div>

      <div>
        
        {viewMode === "board" && (
          <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar items-start">
            {["Backlog", "Planning", "In Progress", "Paused", "Done", "Canceled"].map(col => {
              const colProjects = sortedProjects.filter((p: any) => !p.has_planner && p.status === col);
              if (colProjects.length === 0 && col !== "Backlog" && col !== "In Progress" && col !== "Done") return null;
              
              return (
                <div key={col} className="bg-[#111] border border-white/5 rounded-3xl p-4 flex flex-col gap-4 flex-1 min-w-[300px]" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, col)}>
                  <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium inline-flex whitespace-nowrap shrink-0 items-center gap-1.5 ${statusStyles[col] || "bg-white/10"}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
                      {col}
                    </span>
                    <span className="text-gray-500 text-xs ml-auto">{colProjects.length}</span>
                  </h3>
                  <div className="flex flex-col gap-3">
                    {colProjects.map((proj: any) => (
                      <div key={proj.id} onClick={() => router.push(`/admin/workspace/project/${proj.id}`)} draggable onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.setData('projId', proj.id.toString()); }} className={`border rounded-2xl p-4 space-y-3 cursor-pointer transition-all hover:shadow-lg group ${proj.is_pinned ? "border-amber-400/40 bg-amber-400/[0.03]" : (cardBorderStyles[proj.status] || "bg-[#1a1a1a] border-white/10 hover:border-white/20")}`}>
                        <div className="flex justify-between items-start gap-2">
                          <p className="font-medium text-sm text-white flex items-center gap-2">
                            {((Array.isArray(proj.categories) ? proj.categories : (typeof proj.categories === 'string' && proj.categories.startsWith('[') ? JSON.parse(proj.categories) : [])) || [])[0] && <CategoryIcon category={((Array.isArray(proj.categories) ? proj.categories : (typeof proj.categories === 'string' && proj.categories.startsWith('[') ? JSON.parse(proj.categories) : [])) || [])[0]} className="w-4 h-4 text-brand-400 shrink-0" />} 
                            <span className="leading-tight">{proj.name}</span>
                          </p>
                          <div className="flex gap-1 shrink-0 items-center" onClick={e => e.stopPropagation()}>
                            <button 
                              onClick={() => handleTogglePin(proj)} 
                              className={`p-1 rounded transition-colors cursor-pointer ${proj.is_pinned ? "text-amber-400 hover:text-amber-300" : "text-gray-500 hover:text-amber-400"}`}
                              title={proj.is_pinned ? "Unpin from top" : "Pin to top"}
                            >
                              <Pin className={`w-3.5 h-3.5 ${proj.is_pinned ? "fill-amber-400 -rotate-45" : ""}`} />
                            </button>
                            <button onClick={() => openEditModal(proj)} className="text-gray-400 hover:text-white p-1 hover:bg-white/10 rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {proj.client_name && (
                            <div className="flex items-center gap-1 text-[10px] text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md w-fit">
                              <span className="truncate">{proj.client_name}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {((Array.isArray(proj.categories) ? proj.categories : (typeof proj.categories === 'string' && proj.categories.startsWith('[') ? JSON.parse(proj.categories) : [])) || []).map((c: string, idx: number) => (
                            <span key={idx} className={`px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold flex items-center gap-1.5 bg-black/20 ${cardTextStyles[proj.status] || "text-gray-400"}`}>
                              <CategoryIcon category={c} className="w-3 h-3 shrink-0 opacity-70" />
                              {c}
                            </span>
                          ))}
                        </div>
                        {(proj.start_date || proj.deadline) && (
                          <div className="text-xs text-gray-400 mt-1">
                            {proj.start_date ? proj.start_date : ''}
                            {proj.start_date && proj.deadline ? ' → ' : ''}
                            {proj.deadline ? proj.deadline : ''}
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-2 border-t border-white/5" onClick={e => e.stopPropagation()}>
                          {proj.has_planner && (
                            <button
                              onClick={() => router.push(`/admin/workspace/project/${proj.id}?tab=planner`)}
                              className="text-[11px] font-semibold text-brand-400 hover:text-brand-300 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 transition-colors cursor-pointer"
                            >
                              <CalendarIcon className="w-3 h-3" /> Planner
                            </button>
                          )}
                          <button
                            onClick={() => router.push(`/admin/workspace/project/${proj.id}?tab=tasks`)}
                            className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                          >
                            <LayoutList className="w-3 h-3" /> Tasks
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    <button onClick={() => {
                      openNewModal();
                      setStatus(col);
                    }} className="flex items-center gap-2 text-gray-500 hover:text-white text-sm font-medium py-2 px-1 transition-colors mt-1">
                      <Plus className="w-4 h-4" /> New project
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {viewMode === "projects" && (
          <div className="bg-black border border-white/10 rounded-3xl overflow-hidden">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-white/5 text-xs uppercase text-gray-400">
                <tr>
                  <th className="px-6 py-4 font-semibold w-[300px]">Project name</th>
                  <th className="px-4 py-4 font-semibold whitespace-nowrap">Status</th>
                  <th className="px-4 py-4 font-semibold whitespace-nowrap">Assigned To</th>
                  <th className="px-4 py-4 font-semibold">Dates</th>
                  <th className="px-4 py-4 font-semibold">Priority</th>
                  <th className="px-4 py-4 font-semibold">Categories</th>
                  <th className="px-4 py-4 font-semibold">Completion</th>
                  <th className="px-4 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {sortedProjects.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">No projects found.</td></tr>
                ) : sortedProjects.map((proj: any) => {
                  const isPinned = Boolean(proj.is_pinned);
                  const isDone = proj.status === "Done";
                  const parsedOwnerIds = (Array.isArray(proj.owner_ids) ? proj.owner_ids : (typeof proj.owner_ids === 'string' ? (proj.owner_ids.startsWith('[') ? JSON.parse(proj.owner_ids) : []) : []));
                  const isAllAssigned = team.length > 0 && team.every((t: any) => parsedOwnerIds.includes(t.id));
                  const owners = parsedOwnerIds.map((id: string) => {
                    const m = team.find((t: any) => t.id === id);
                    if (m) {
                      const fn = (m.first_name || m.name || "").split(" ")[0];
                      return { ...m, name: fn };
                    }
                    const fallback = id.includes('@') ? id.split('@')[0] : id;
                    return { id, name: fallback.split(" ")[0], image: null };
                  });
                  const projTasks = tasks.filter((t: any) => t.project_id === proj.id);
                  const doneTasks = projTasks.filter((t: any) => t.status === "Done").length;
                  const completion = projTasks.length > 0 ? Math.round((doneTasks / projTasks.length) * 100) : 0;

                  return (
                    <tr 
                      key={proj.id} 
                      className={`group transition-all ${
                        isPinned
                          ? "bg-amber-400/[0.04] hover:bg-amber-400/[0.07] border-l-2 border-l-amber-400"
                          : isDone 
                            ? "bg-emerald-950/[0.08] hover:bg-emerald-950/[0.18] opacity-75 hover:opacity-100" 
                            : "hover:bg-white/[0.02]"
                      }`}
                    >
                      <td className="px-6 py-4 font-medium text-white">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            {isDone && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            )}
                            <button
                              onClick={() => router.push(`/admin/workspace/project/${proj.id}${proj.has_planner ? '?tab=planner' : '?tab=tasks'}`)}
                              className={`transition-colors font-semibold text-left cursor-pointer ${
                                isDone ? "text-gray-200 hover:text-emerald-300" : "hover:text-brand-400 text-white"
                              }`}
                            >
                              {proj.name}
                            </button>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {proj.client_name && (
                              <span className="text-[11px] text-purple-300">
                                {proj.client_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 pt-1">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold inline-flex whitespace-nowrap shrink-0 items-center gap-1.5 ${
                            isDone 
                              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" 
                              : statusStyles[proj.status] || "bg-white/10"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isDone ? "bg-emerald-400" : "bg-current opacity-70"}`}></span>
                            {proj.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {isAllAssigned ? (
                          <span className="text-xs text-gray-200 font-medium">All</span>
                        ) : owners.length > 0 ? (
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <div className="flex items-center -space-x-1.5 shrink-0">
                              {owners.map((o: any, i: number) => {
                                const firstName = (o.first_name || o.name || "").split(" ")[0];
                                return o.image ? (
                                  <img
                                    key={i}
                                    src={o.image}
                                    alt={firstName}
                                    title={firstName}
                                    className="w-5 h-5 rounded-full object-cover ring-2 ring-[#0c0c0e] shrink-0"
                                  />
                                ) : (
                                  <span
                                    key={i}
                                    title={firstName}
                                    className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-[9px] font-bold uppercase ring-2 ring-[#0c0c0e] shrink-0"
                                  >
                                    {firstName.substring(0, 2)}
                                  </span>
                                );
                              })}
                            </div>
                            <span className="text-xs text-gray-200">
                              {owners
                                .map((o: any) => (o.first_name || o.name || "").split(" ")[0])
                                .filter(Boolean)
                                .join(", ")}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-500 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-xs whitespace-nowrap">
                        {proj.start_date || proj.deadline ? (
                          <div className="flex flex-col text-gray-400">
                            {proj.start_date && <span>{proj.start_date} &rarr;</span>}
                            {proj.deadline && <span>{proj.deadline}</span>}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-4">
                        {proj.priority ? <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${priorityStyles[proj.priority] || "bg-white/10"}`}>{proj.priority}</span> : '-'}
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-400">
                        {((Array.isArray(proj.categories) ? proj.categories : (typeof proj.categories === 'string' && proj.categories.startsWith('[') ? JSON.parse(proj.categories) : [])) || []).join(", ") || "-"}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs w-10 text-right">{completion}%</span>
                          <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${completion}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end items-center gap-1">
                          {proj.has_planner ? (
                            <button 
                              onClick={() => router.push(`/admin/workspace/project/${proj.id}?tab=planner`)} 
                              className="text-brand-300 hover:text-white px-2.5 py-1 hover:bg-brand-500/20 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all border border-brand-500/20 mr-1 cursor-pointer"
                              title="Open Monthly Content Planner"
                            >
                              <CalendarIcon className="w-3.5 h-3.5 text-brand-400" />
                              <span className="hidden md:inline">Planner</span>
                            </button>
                          ) : (
                            <button 
                              onClick={() => router.push(`/admin/workspace/project/${proj.id}?tab=tasks`)} 
                              className="text-sky-300 hover:text-white px-2.5 py-1 hover:bg-sky-500/20 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all border border-sky-500/20 mr-1 cursor-pointer"
                              title="Open Project Tasks Board"
                            >
                              <Eye className="w-3.5 h-3.5 text-sky-400" />
                              <span className="hidden md:inline">View</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleTogglePin(proj)}
                            className={`p-2 rounded-lg transition-colors cursor-pointer ${
                              isPinned
                                ? "text-amber-400 hover:text-amber-300 bg-amber-400/10 hover:bg-amber-400/20"
                                : "text-gray-500 hover:text-amber-400 hover:bg-white/10"
                            }`}
                            title={isPinned ? "Unpin from top" : "Pin to top"}
                          >
                            <Pin className={`w-4 h-4 ${isPinned ? "fill-amber-400 -rotate-45" : ""}`} />
                          </button>
                          <button onClick={() => openEditModal(proj)} className="text-gray-400 hover:text-white p-2 hover:bg-white/10 rounded-lg cursor-pointer" title="Edit Property"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(proj.id)} className="text-rose-400 hover:text-rose-300 p-2 hover:bg-rose-500/10 rounded-lg cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {viewMode === "tasks" && (
          <div className="space-y-6 pb-20">
            {sortedProjects.filter((p: any) => !p.has_planner).map((proj: any) => {
              const isDone = proj.status === "Done";
              const projTasks = tasks.filter((t: any) => t.project_id === proj.id);
              const doneTasks = projTasks.filter((t: any) => t.status === "Done").length;
              const isExpanded = expandedProjects[proj.id] !== false; // default expanded
              const parsedOwnerIds = (Array.isArray(proj.owner_ids) ? proj.owner_ids : (typeof proj.owner_ids === 'string' ? (proj.owner_ids.startsWith('[') ? JSON.parse(proj.owner_ids) : []) : []));
              const owners = parsedOwnerIds.map((id: string) => {
                const m = team.find((t: any) => t.id === id);
                if (m) {
                  const fn = (m.first_name || m.name || "").split(" ")[0];
                  return { ...m, name: fn };
                }
                const fallback = id.includes('@') ? id.split('@')[0] : id;
                return { id, name: fallback.split(" ")[0], image: null };
              });

              return (
                <div key={proj.id} className={`space-y-2 transition-all ${isDone ? "opacity-75 hover:opacity-100" : ""}`}>
                  <div className="flex items-center gap-4 group flex-wrap">
                    <div className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-1 rounded-lg w-fit" onClick={() => toggleExpand(proj.id)}>
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                      {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      <span className={`font-semibold flex items-center gap-1.5 ${isDone ? "text-gray-200" : "text-white"}`}>
                        {((Array.isArray(proj.categories) ? proj.categories : (typeof proj.categories === 'string' && proj.categories.startsWith('[') ? JSON.parse(proj.categories) : [])) || [])[0] && <CategoryIcon category={((Array.isArray(proj.categories) ? proj.categories : (typeof proj.categories === 'string' && proj.categories.startsWith('[') ? JSON.parse(proj.categories) : [])) || [])[0]} className="w-4 h-4 text-brand-400" />} {proj.name}
                      </span>
                      {proj.client_name && (
                        <span className="text-[11px] text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-lg">
                          {proj.client_name}
                        </span>
                      )}
                      <span className="text-xs text-gray-500 ml-2">{projTasks.length}</span>
                    </div>
                    <button onClick={() => router.push(`/admin/workspace/project/${proj.id}?tab=tasks`)} className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2.5 py-1 bg-sky-600/20 text-sky-300 hover:bg-sky-600/30 rounded-lg flex items-center gap-1 cursor-pointer">
                      <Eye className="w-3 h-3 text-sky-400" /> Open Board
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="pl-6 pt-2">
                      <table className="w-full text-left text-sm text-gray-300">
                        <thead className="text-xs text-gray-500 border-b border-white/10">
                          <tr>
                            <th className="pb-2 font-medium w-[30%]">Task name</th>
                            <th className="pb-2 font-medium w-[15%]">Category</th>
                            <th className="pb-2 font-medium w-[15%] whitespace-nowrap">Status</th>
                            <th className="pb-2 font-medium w-[15%] whitespace-nowrap">Assigned To</th>
                            <th className="pb-2 font-medium w-[15%]">Due</th>
                            <th className="pb-2 font-medium w-[10%] text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {projTasks.length === 0 ? (
                            <tr><td colSpan={6} className="py-4 text-gray-500 text-xs">No tasks.</td></tr>
                          ) : projTasks.map((task: any) => {
                            const assignee = team.find((t: any) => t.id === task.assignee_id) || (task.assignee_id ? { id: task.assignee_id, name: task.assignee_id.includes('@') ? task.assignee_id.split('@')[0] : task.assignee_id, image: null } : null);
                            return (
                              <tr key={task.id} className="hover:bg-white/[0.02] group">
                                <td className="py-3 font-medium text-white">
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-white/5 rounded border border-white/10 flex items-center justify-center shrink-0">
                                      <div className="w-2 h-0.5 bg-gray-400"></div>
                                    </div>
                                    <span className="truncate">{task.name}</span>
                                  </div>
                                </td>
                                <td className="py-3">
                                  {(() => {
  const displayCategory = task.category || ((Array.isArray(proj.categories) ? proj.categories : (typeof proj.categories === 'string' && proj.categories.startsWith('[')) ? JSON.parse(proj.categories) : []) || [])[0];
  return displayCategory ? (
    <span className={`px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold border w-fit flex items-center gap-1.5 ${
      displayCategory === "Graphics Design" ? "text-purple-400 bg-purple-500/10 border-purple-500/20" :
      displayCategory === "Video Editing" ? "text-rose-400 bg-rose-500/10 border-rose-500/20" :
      displayCategory === "Web dev" ? "text-blue-400 bg-blue-500/10 border-blue-500/20" :
      displayCategory === "Photography" ? "text-amber-400 bg-amber-500/10 border-amber-500/20" :
      displayCategory === "Videography" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" :
      "text-gray-400 bg-white/5 border-white/10"
    }`}>
      <CategoryIcon category={displayCategory} className="w-3 h-3 shrink-0 opacity-70" />
      {displayCategory}
    </span>
  ) : <span className="text-gray-500">-</span>;
})()}
                                </td>
                                <td className="py-3 whitespace-nowrap">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium inline-flex whitespace-nowrap shrink-0 items-center gap-1 ${statusStyles[task.status] || "bg-white/10"}`}>
                                    <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-current opacity-70"></span>
                                    {task.status}
                                  </span>
                                </td>
                                <td className="py-3">
                                  {assignee ? (
                                    <span className="flex items-center gap-1.5 text-xs text-white">
                                      {assignee.image ? <img src={assignee.image} alt={assignee.name.split(' ')[0]} className="w-4 h-4 rounded-full object-cover shrink-0" /> : <span className="w-4 h-4 rounded-full bg-brand-500 text-white flex items-center justify-center text-[8px] font-bold uppercase shrink-0">{assignee.name.substring(0,2)}</span>}
                                      {assignee.name.split(' ')[0]}
                                    </span>
                                  ) : owners.length > 0 ? (
                                    <div className="flex items-center gap-1.5 whitespace-nowrap" title="All Project Members">
                                      <div className="flex items-center -space-x-1 shrink-0">
                                        {owners.map((o: any, i: number) => {
                                          const fn = (o.first_name || o.name || "").split(" ")[0];
                                          return o.image ? (
                                            <img key={i} src={o.image} alt={fn} title={fn} className="w-4 h-4 rounded-full object-cover ring-1 ring-black shrink-0" />
                                          ) : (
                                            <span key={i} title={fn} className="w-4 h-4 rounded-full bg-brand-500 text-white flex items-center justify-center text-[8px] font-bold uppercase ring-1 ring-black shrink-0">{fn.substring(0, 2)}</span>
                                          );
                                        })}
                                      </div>
                                      <span className="text-xs text-white">
                                        {owners.map((o: any) => (o.first_name || o.name || "").split(" ")[0]).filter(Boolean).join(", ")}
                                      </span>
                                    </div>
                                  ) : '-'}
                                </td>
                                <td className="py-3 text-xs">{task.due_date || '-'}</td>
                                
                                <td className="py-3 text-right">
                                  <div className="flex justify-end gap-2 items-center ">
                                    <button onClick={() => openTaskEdit(task)} className="text-gray-400 hover:text-white p-1 hover:bg-white/10 rounded"><Edit2 className="w-4 h-4" /></button>
                                    <button onClick={() => deleteSingleTask(task.id)} className="text-rose-400 hover:text-rose-300 p-1 hover:bg-rose-500/10 rounded"><Trash2 className="w-4 h-4" /></button>
                                    
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-2 ml-2">COMPLETE {doneTasks}/{projTasks.length}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      
      {taskToEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" data-lenis-prevent>
          <div data-lenis-prevent className="bg-black border border-white/10 rounded-3xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto overscroll-contain custom-scrollbar">
            <h3 className="text-lg font-bold text-white">Edit Task</h3>
            <form onSubmit={saveTaskEdit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-semibold uppercase">Name *</label>
                <input type="text" required value={taskName} onChange={e => setTaskName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white" />
              </div>
              
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-semibold uppercase">Status</label>
                  <select value={taskStatus} onChange={e => setTaskStatus(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white">
                    <option value="Planned">Planned</option>
                    <option value="In Progress">In Progress (Shooting)</option>
                    <option value="In Editing">In Editing</option>
                    <option value="Ready for Review">Ready for Review</option>
                    <option value="Client Approved">Client Approved</option>
                    <option value="Completed">Completed</option>
                    <option value="Not Started">Not Started</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-semibold uppercase">Due Date</label>
                  <input type="date" value={taskDue} onChange={e => setTaskDue(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-semibold uppercase">Category</label>
                <select value={taskCategory} onChange={e => setTaskCategory(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white">
                  <option value="">Default (Project Category)</option>
                  <option value="Graphics Design">Graphics Design</option>
                  <option value="Video Editing">Video Editing</option>
                  <option value="Web dev">Web dev</option>
                  <option value="Photography">Photography</option>
                  <option value="Videography">Videography</option>
                  {existingTaskCategories.map(c => <option key={c as string} value={c as string}>{c as string}</option>)}
                  <option value="Custom">Custom...</option>
                </select>
                {taskCategory === "Custom" && (
                  <input type="text" placeholder="Enter custom category" value={taskCustomCategory} onChange={e => setTaskCustomCategory(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white mt-2" />
                )}
              </div>
              
              <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-semibold uppercase">Assigned To</label>
                  <select value={taskAssignee} onChange={e => setTaskAssignee(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white">
                    <option value="">All / Unassigned</option>
                    {team.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                
              
  

              

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setTaskToEdit(null)} className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-semibold">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" data-lenis-prevent>
          <div data-lenis-prevent className="bg-black border border-white/10 rounded-3xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto overscroll-contain custom-scrollbar">
            <h3 className="text-lg font-bold text-white">{editingProject ? (isPlannerProject ? "Edit Project (with Planner)" : "Edit Project") : (isPlannerProject ? "Create Project (with Planner)" : "Create Project")}</h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-semibold uppercase">Name *</label>
                <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white" />
              </div>

              {/* Monthly Content Planner Option */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3 transition-colors hover:bg-white/[0.05]">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    isPlannerProject 
                      ? "bg-brand-500/20 text-brand-400 border border-brand-500/40" 
                      : "bg-white/5 text-gray-400 border border-white/10"
                  }`}>
                    <CalendarIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                      Monthly Content Planner
                      {isPlannerProject && (
                        <span className="text-[10px] font-bold text-brand-400 bg-brand-500/20 px-1.5 py-0.5 rounded">
                          Enabled
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 leading-tight mt-0.5">
                      Add monthly calendar, shooting/editing schedules & client view
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isPlannerProject}
                  onClick={() => {
                    const next = !isPlannerProject;
                    setIsPlannerProject(next);
                    if (next && !categories.includes("Content Planner")) {
                      setCategories(prev => [...prev, "Content Planner"]);
                    }
                  }}
                  className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors shrink-0 ${
                    isPlannerProject ? "bg-brand-500 justify-end" : "bg-white/20 justify-start"
                  }`}
                  title={isPlannerProject ? "Disable Content Planner" : "Enable Content Planner"}
                >
                  <span className="bg-white w-4 h-4 rounded-full shadow-md" />
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-semibold uppercase">{isPlannerProject ? "Assign Client *" : "Assign Client"}</label>
                <ClientCombobox
                  name="clientId"
                  value={String(clientId || "")}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "new") {
                      window.open("/admin/clients", "_blank");
                    } else {
                      setClientId(val);
                    }
                  }}
                  clients={clients}
                  loading={clientsLoading}
                />
              </div>
              
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1 col-span-3">
                  <label className="text-xs text-gray-400 font-semibold uppercase">Categories</label>
                  <div className="flex flex-wrap gap-2">
                    {PROJECT_CATEGORIES.map(c => (
                      <button type="button" key={c} onClick={() => setCategories(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])} className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${categories.includes(c) ? 'bg-brand-500/20 text-brand-400 border-brand-500/50' : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20'}`}>
                        <CategoryIcon category={c} className="w-3.5 h-3.5" />
                        {c}
                      </button>
                    ))}
                    {Array.from(new Set([...existingProjectCategories, ...categories.filter(c => !PROJECT_CATEGORIES.includes(c))])).map((c: string) => (
                      <button type="button" key={c} onClick={() => setCategories(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])} className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${categories.includes(c) ? 'bg-brand-500/20 text-brand-400 border-brand-500/50' : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20'}`}>
                        <FolderOpen className="w-3.5 h-3.5" />
                        {c}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <input 
                      type="text" 
                      placeholder="+ Custom Category (Press Enter)" 
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-brand-500 min-w-[200px]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = e.currentTarget.value.trim();
                          if (val && !categories.includes(val)) {
                            setCategories(prev => [...prev, val]);
                          }
                          e.currentTarget.value = "";
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-semibold uppercase">Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white">
                    <optgroup label="To-do">
                      <option value="Backlog">Backlog</option>
                    </optgroup>
                    <optgroup label="In Progress">
                      <option value="Planning">Planning</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Paused">Paused</option>
                    </optgroup>
                    <optgroup label="Complete">
                      <option value="Done">Done</option>
                      <option value="Canceled">Canceled</option>
                    </optgroup>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-semibold uppercase">Priority</label>
                  <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white">
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400 font-semibold uppercase">Assign Team Members</label>
                  {team.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleAllOwners}
                      className="text-xs text-brand-400 hover:text-brand-300 font-semibold transition-colors cursor-pointer"
                    >
                      {team.every((t: any) => ownerIds.includes(t.id)) ? "Deselect All" : "Assign to ALL"}
                    </button>
                  )}
                </div>
                <div 
                  data-lenis-prevent 
                  className="bg-white/5 border border-white/10 rounded-xl p-3 max-h-52 overflow-y-auto overscroll-contain space-y-2 custom-scrollbar touch-pan-y"
                >
                  {team.length === 0 ? (
                    <p className="text-xs text-gray-500">No team members available.</p>
                  ) : (
                    <>
                      <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-white/5 rounded-lg transition-colors border-b border-white/10 pb-2 mb-1">
                        <input 
                          type="checkbox" 
                          checked={team.length > 0 && team.every((t: any) => ownerIds.includes(t.id))} 
                          onChange={toggleAllOwners} 
                          className="rounded border-gray-600 bg-black shrink-0 text-brand-600 focus:ring-brand-500" 
                        />
                        <div className="w-8 h-8 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 flex items-center justify-center text-xs font-bold shrink-0">
                          ALL
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-semibold text-white truncate">Assign to ALL</span>
                          <span className="text-xs text-gray-400 truncate">Select all {team.length} team members</span>
                        </div>
                      </label>
                      {team.map((t: any) => {
                        const firstName = (t.first_name || t.name || "").split(" ")[0];
                        return (
                          <label key={t.id} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-white/5 rounded-lg transition-colors">
                            <input type="checkbox" checked={ownerIds.includes(t.id)} onChange={() => toggleOwner(t.id)} className="rounded border-gray-600 bg-black shrink-0" />
                            {t.image ? <img src={t.image} alt={firstName} className="w-8 h-8 rounded-full shrink-0 object-cover" /> : <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-xs text-white font-bold shrink-0">{firstName.substring(0,2).toUpperCase()}</div>}
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-medium text-white truncate">{firstName}</span>
                              <span className="text-xs text-gray-400 truncate">{t.email}</span>
                            </div>
                          </label>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-semibold uppercase">Start Date</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-semibold uppercase">Deadline</label>
                  <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white" />
                </div>
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="rounded border-gray-600 bg-black text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                />
                <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <Pin className={`w-3.5 h-3.5 ${isPinned ? "text-amber-400 fill-amber-400 -rotate-45" : "text-gray-400"}`} />
                  <span>Pin this project to top of the list</span>
                </div>
              </label>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-semibold">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
