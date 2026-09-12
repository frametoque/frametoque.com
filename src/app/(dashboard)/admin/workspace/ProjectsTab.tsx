"use client";
import { useState } from "react";
import useSWR from "swr";
import { getProjects, createProject, updateProject, deleteProject, getTeamMembers, getTasks, deleteTask, updateTask } from "../actions/workspace";
import { Plus, Trash2, Edit2, Image as ImageIcon, LayoutList, Layout, FolderOpen, ChevronRight, ChevronDown, Palette, Film, Code, Camera, Video } from "lucide-react";
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
  const { data: projects = [], isLoading, mutate } = useSWR("workspace-projects", getProjects);
  const { data: team = [] } = useSWR("workspace-team", getTeamMembers);
  const { data: tasks = [] } = useSWR("workspace-tasks", getTasks);
  
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"projects" | "board" | "tasks">("projects");
  const [expandedProjects, setExpandedProjects] = useState<Record<number, boolean>>({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);

  
  const [taskToEdit, setTaskToEdit] = useState<any>(null);
  const [taskName, setTaskName] = useState("");
  const [taskStatus, setTaskStatus] = useState("Not Started");
  const [taskPriority, setTaskPriority] = useState("Medium");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [taskTags, setTaskTags] = useState("");

  const openTaskEdit = (task: any) => {
    setTaskToEdit(task);
    setTaskName(task.name);
    setTaskStatus(task.status);
    setTaskPriority(task.priority || "Medium");
    setTaskAssignee(task.assignee_id || "");
    setTaskDue(task.due_date || "");
    setTaskTags((Array.isArray(task.tags) ? task.tags : (typeof task.tags === 'string' && task.tags.startsWith('[') ? JSON.parse(task.tags) : [])).join(", "));
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
      tags: taskTags.split(",").map((t: string) => t.trim()).filter(Boolean)
    });
    setTaskToEdit(null);
    mutate();
  };

  const deleteSingleTask = async (id: number) => {
    if (confirm("Are you sure?")) {
      await deleteTask(id);
      mutate();
    }
  };

  const [name, setName] = useState("");
  const [status, setStatus] = useState("Backlog");
  const [priority, setPriority] = useState("Medium");
  const [categories, setCategories] = useState<string[]>([]);
  const [ownerIds, setOwnerIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
  
  const openNewModal = () => {
    setEditingProject(null);
    setName(""); setStatus("Backlog"); setPriority("Medium"); setCategories([]); setOwnerIds([]); setStartDate(""); setDeadline("");
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
    setName(proj.name); setStatus(proj.status); setPriority(proj.priority || "Medium"); setCategories((Array.isArray(proj.categories) ? proj.categories : (typeof proj.categories === 'string' ? (proj.categories.startsWith('[') ? JSON.parse(proj.categories) : []) : []))); 
    setOwnerIds((Array.isArray(proj.owner_ids) ? proj.owner_ids : (typeof proj.owner_ids === 'string' ? (proj.owner_ids.startsWith('[') ? JSON.parse(proj.owner_ids) : []) : []))); setStartDate(proj.start_date || ""); setDeadline(proj.deadline || "");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    try {
      const payload = { 
        name, status, categories, priority,
        owner_ids: ownerIds.length ? ownerIds : undefined,
        start_date: startDate || null,
        deadline: deadline || null 
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

  const toggleExpand = (id: number) => {
    setExpandedProjects(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (selectedProjectId) {
    const proj = projects.find((p: any) => p.id === selectedProjectId);
    return <TasksTab projectId={selectedProjectId} projectName={proj?.name || "Project"} onBack={() => setSelectedProjectId(null)} />;
  }

  if (isLoading) return <div className="text-white">Loading...</div>;

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
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
        <button onClick={openNewModal} className="bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2 px-4 rounded-xl flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      <div>
        
        {viewMode === "board" && (
          <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar items-start">
            {["Backlog", "Planning", "In Progress", "Paused", "Done", "Canceled"].map(col => {
              const colProjects = projects.filter((p: any) => p.status === col);
              if (colProjects.length === 0 && col !== "Backlog" && col !== "In Progress" && col !== "Done") return null;
              
              return (
                <div key={col} className="bg-[#111] border border-white/5 rounded-3xl p-4 flex flex-col gap-4 flex-1 min-w-[300px]" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, col)}>
                  <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${statusStyles[col] || "bg-white/10"}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
                      {col}
                    </span>
                    <span className="text-gray-500 text-xs ml-auto">{colProjects.length}</span>
                  </h3>
                  <div className="flex flex-col gap-3">
                    {colProjects.map((proj: any) => (
                      <div key={proj.id} onClick={() => setSelectedProjectId(proj.id)} draggable onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.setData('projId', proj.id.toString()); }} className={`border rounded-2xl p-4 space-y-3 cursor-pointer transition-all hover:shadow-lg group ${cardBorderStyles[proj.status] || "bg-[#1a1a1a] border-white/10 hover:border-white/20"}`}>
                        <div className="flex justify-between items-start gap-2">
                          <p className="font-medium text-sm text-white flex items-center gap-2">
                            {((Array.isArray(proj.categories) ? proj.categories : (typeof proj.categories === 'string' && proj.categories.startsWith('[') ? JSON.parse(proj.categories) : [])) || [])[0] && <CategoryIcon category={((Array.isArray(proj.categories) ? proj.categories : (typeof proj.categories === 'string' && proj.categories.startsWith('[') ? JSON.parse(proj.categories) : [])) || [])[0]} className="w-4 h-4 text-brand-400 shrink-0" />} 
                            <span className="leading-tight">{proj.name}</span>
                          </p>
                          <div className="flex gap-1 shrink-0 " onClick={e => e.stopPropagation()}>
                            <button onClick={() => openEditModal(proj)} className="text-gray-400 hover:text-white p-1 hover:bg-white/10 rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                          </div>
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
                  <th className="px-4 py-4 font-semibold">Status</th>
                  <th className="px-4 py-4 font-semibold">Assigned To</th>
                  <th className="px-4 py-4 font-semibold">Dates</th>
                  <th className="px-4 py-4 font-semibold">Priority</th>
                  <th className="px-4 py-4 font-semibold">Categories</th>
                  <th className="px-4 py-4 font-semibold">Completion</th>
                  <th className="px-4 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {projects.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">No projects found.</td></tr>
                ) : projects.map((proj: any) => {
                  
                  const parsedOwnerIds = (Array.isArray(proj.owner_ids) ? proj.owner_ids : (typeof proj.owner_ids === 'string' ? (proj.owner_ids.startsWith('[') ? JSON.parse(proj.owner_ids) : []) : []));
                  const owners = parsedOwnerIds.map((id: string) => team.find((t: any) => t.id === id) || { id, name: id.includes('@') ? id.split('@')[0] : id, image: null });
                  const projTasks = tasks.filter((t: any) => t.project_id === proj.id);
                  const doneTasks = projTasks.filter((t: any) => t.status === "Done").length;
                  const completion = projTasks.length > 0 ? Math.round((doneTasks / projTasks.length) * 100) : 0;

                  return (
                    <tr key={proj.id} className="hover:bg-white/[0.02] group">
                      <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                        <button onClick={() => setSelectedProjectId(proj.id)} className="flex items-center gap-2 hover:text-brand-400 transition-colors">
                          {proj.name}
                        </button>
                        <button onClick={() => setSelectedProjectId(proj.id)} className="opacity-0 group-hover:opacity-100 px-2 py-0.5 bg-white/10 rounded text-[10px] uppercase font-bold tracking-wider hover:bg-white/20 transition-all">OPEN</button>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 pt-1">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex w-fit items-center gap-1 ${statusStyles[proj.status] || "bg-white/10"}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
                            {proj.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-0.5">
                          {owners.length > 0 ? owners.map((o: any, i: number) => (
                            <span key={i} className="flex items-center gap-1.5 text-xs">
                              {o.image ? <img src={o.image} alt={o.name} className="w-4 h-4 rounded-full" /> : <span className="w-4 h-4 rounded-full bg-brand-500 text-white flex items-center justify-center text-[8px] font-bold uppercase">{o.name.substring(0,2)}</span>}
                              {o.name}
                            </span>
                          )) : <span className="text-gray-500 text-xs">-</span>}
                        </div>
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
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openEditModal(proj)} className="text-gray-400 hover:text-white p-2 hover:bg-white/10 rounded-lg" title="Edit Property"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(proj.id)} className="text-rose-400 hover:text-rose-300 p-2 hover:bg-rose-500/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>
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
            {projects.map((proj: any) => {
              const projTasks = tasks.filter((t: any) => t.project_id === proj.id);
              const doneTasks = projTasks.filter((t: any) => t.status === "Done").length;
              const isExpanded = expandedProjects[proj.id] !== false; // default expanded
              const parsedOwnerIds = (Array.isArray(proj.owner_ids) ? proj.owner_ids : (typeof proj.owner_ids === 'string' ? (proj.owner_ids.startsWith('[') ? JSON.parse(proj.owner_ids) : []) : []));
              const owners = parsedOwnerIds.map((id: string) => team.find((t: any) => t.id === id) || { id, name: id.includes('@') ? id.split('@')[0] : id, image: null });

              return (
                <div key={proj.id} className="space-y-2">
                  <div className="flex items-center gap-4 group">
                    <div className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-1 rounded-lg w-fit" onClick={() => toggleExpand(proj.id)}>
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                      <span className="font-semibold text-white flex items-center gap-1.5">
                        {((Array.isArray(proj.categories) ? proj.categories : (typeof proj.categories === 'string' && proj.categories.startsWith('[') ? JSON.parse(proj.categories) : [])) || [])[0] && <CategoryIcon category={((Array.isArray(proj.categories) ? proj.categories : (typeof proj.categories === 'string' && proj.categories.startsWith('[') ? JSON.parse(proj.categories) : [])) || [])[0]} className="w-4 h-4 text-brand-400" />} {proj.name}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">{projTasks.length}</span>
                    </div>
                    <button onClick={() => setSelectedProjectId(proj.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2.5 py-1 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white rounded-lg">Open Board</button>
                  </div>

                  {isExpanded && (
                    <div className="pl-6 pt-2">
                      <table className="w-full text-left text-sm text-gray-300">
                        <thead className="text-xs text-gray-500 border-b border-white/10">
                          <tr>
                            <th className="pb-2 font-medium w-[30%]">Task name</th>
                            <th className="pb-2 font-medium w-[15%]">Category</th>
                            <th className="pb-2 font-medium w-[15%]">Status</th>
                            <th className="pb-2 font-medium w-[15%]">Assigned To</th>
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
                                <td className="py-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex w-fit items-center gap-1 ${statusStyles[task.status] || "bg-white/10"}`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
                                    {task.status}
                                  </span>
                                </td>
                                <td className="py-3">
                                  {assignee ? (
                                    <span className="flex items-center gap-1.5 text-xs text-white">
                                      {assignee.image ? <img src={assignee.image} alt={assignee.name} className="w-4 h-4 rounded-full" /> : <span className="w-4 h-4 rounded-full bg-brand-500 text-white flex items-center justify-center text-[8px] font-bold uppercase">{assignee.name.substring(0,2)}</span>}
                                      {assignee.name}
                                    </span>
                                  ) : owners.length > 0 ? (
                                    <div className="flex flex-col gap-0.5" title="All Project Members">
                                      {owners.map((o: any, i: number) => (
                                        <span key={i} className="flex items-center gap-1.5 text-xs text-white">
                                          {o.image ? <img src={o.image} alt={o.name} className="w-4 h-4 rounded-full" /> : <span className="w-4 h-4 rounded-full bg-brand-500 text-white flex items-center justify-center text-[8px] font-bold uppercase">{o.name.substring(0,2)}</span>}
                                          {o.name}
                                        </span>
                                      ))}
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-black border border-white/10 rounded-3xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
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
                    <option value="Not Started">Not Started</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-semibold uppercase">Due Date</label>
                  <input type="date" value={taskDue} onChange={e => setTaskDue(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white" />
                </div>
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-black border border-white/10 rounded-3xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white">{editingProject ? "Edit Project" : "Create Project"}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-semibold uppercase">Name *</label>
                <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white" />
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
                <label className="text-xs text-gray-400 font-semibold uppercase">Assign Team Members</label>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2">
                  {team.length === 0 ? <p className="text-xs text-gray-500">No team members available.</p> : team.map((t: any) => (
                    <label key={t.id} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-white/5 rounded-lg transition-colors">
                      <input type="checkbox" checked={ownerIds.includes(t.id)} onChange={() => toggleOwner(t.id)} className="rounded border-gray-600 bg-black" />
                      {t.image ? <img src={t.image} alt={t.name} className="w-8 h-8 rounded-full" /> : <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-xs text-white font-bold">{t.name.substring(0,2).toUpperCase()}</div>}
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-white">{t.name}</span>
                        <span className="text-xs text-gray-400">{t.email}</span>
                      </div>
                    </label>
                  ))}
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
