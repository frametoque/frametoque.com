"use client";
import React, { useState, useEffect, Fragment } from "react";
import useSWR from "swr";
import { getTasks, createTask, updateTask, deleteTask, getTeamMembers, getMoodboards, saveMoodboard, getProjects } from "../actions/workspace";
import { Plus, Trash2, Edit2, Image as ImageIcon, ChevronLeft, Layout, FolderOpen, Palette, Film, Code, Camera, Video } from "lucide-react";


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

const statusStyles: any = {
  "Not Started": "bg-neutral-500/20 text-neutral-300",
  "Backlog": "bg-neutral-500/20 text-neutral-300",
  "Planning": "bg-blue-500/20 text-blue-300",
  "In Progress": "bg-amber-500/20 text-amber-300",
  "Paused": "bg-purple-500/20 text-purple-300",
  "Done": "bg-emerald-500/20 text-emerald-300",
  "Canceled": "bg-rose-500/20 text-rose-300"
};
const priorityStyles: any = {
  "High": "bg-rose-500/20 text-rose-400",
  "Medium": "bg-amber-500/20 text-amber-400",
  "Low": "bg-blue-500/20 text-blue-400"
};


const cardBgStyles: any = {
  "Not Started": "bg-[#1a1a1a] border-white/10 hover:border-white/20",
  "In Progress": "bg-amber-500/[0.05] border-amber-500/20 hover:border-amber-500/30 hover:bg-amber-500/10",
  "Done": "bg-emerald-500/[0.05] border-emerald-500/20 hover:border-emerald-500/30 hover:bg-emerald-500/10"
};

export default function TasksTab({ projectId, projectName, onBack }: { projectId: number, projectName: string, onBack: () => void }) {
  const { data: allTasks = [], isLoading, mutate } = useSWR("workspace-tasks", getTasks);
  const { data: team = [] } = useSWR("workspace-team", getTeamMembers);
  const { data: projects = [] } = useSWR("workspace-projects", getProjects);
  const { data: moodboards = [], mutate: mutateMoodboards } = useSWR("workspace-moodboards", getMoodboards);
  const currentProject = projects.find((p: any) => p.id === projectId);

    const tasks = allTasks.filter((t: any) => t.project_id === projectId);
  
  const projectMembers = (Array.isArray(currentProject?.owner_ids) ? currentProject.owner_ids : (typeof currentProject?.owner_ids === 'string' && (currentProject.owner_ids as string).startsWith('[') ? JSON.parse(currentProject.owner_ids) : [])).map((id: string) => team.find((t: any) => t.id === id) || { id, name: id.includes('@') ? id.split('@')[0] : id, image: null });
  const availableMembers = projectMembers.length > 0 ? projectMembers : team;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMoodboardModalOpen, setIsMoodboardModalOpen] = useState(false);
  const [dropIndicator, setDropIndicator] = useState<{ col: string, index: number } | null>(null);
    const [selectedTask, setSelectedTask] = useState<any>(null);

  const [name, setName] = useState("");
  const [status, setStatus] = useState("Not Started");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState("");
  
  const [moodboardTitle, setMoodboardTitle] = useState("");
  const [moodboardImages, setMoodboardImages] = useState("");

  const openNewModal = () => {
    setSelectedTask(null);
    setName(""); setStatus("Not Started"); setAssigneeId(""); setDueDate(new Date().toISOString().split("T")[0]); setPriority("Medium"); setTags(""); setCategory("");
    setIsModalOpen(true);
  };

  const openEditModal = (task: any) => {
    setSelectedTask(task);
    setName(task.name); setStatus(task.status);
    setAssigneeId(task.assignee_id?.toString() || ""); setDueDate(task.due_date || "");
    setPriority(task.priority || "Medium");
    setCategory(task.category || "");
    setTags((Array.isArray(task.tags) ? task.tags : (typeof task.tags === 'string' && task.tags.startsWith('[') ? JSON.parse(task.tags) : [])).join(", "));
    setIsModalOpen(true);
  };

  const openMoodboardModal = (task: any) => {
    setSelectedTask(task);
    const existing = moodboards.find((m: any) => m.task_id === task.id);
    if (existing) {
      setMoodboardTitle(existing.title);
      setMoodboardImages((Array.isArray(existing.images) ? existing.images : (typeof existing.images === 'string' && existing.images.startsWith('[') ? JSON.parse(existing.images) : [])).join(", "));
    } else {
      setMoodboardTitle(task.name + " Moodboard");
      setMoodboardImages("");
    }
    setIsMoodboardModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    try {
      const data: any = {
        name, status, 
        project_id: projectId,
        assignee_id: assigneeId ? assigneeId : null,
        due_date: dueDate || null,
        priority,
        category: category || null,
        tags: tags.split(",").map(t => t.trim()).filter(Boolean)
      };
      if (!selectedTask) {
        const minIndex = Math.min(0, ...tasks.filter((t: any) => t.status === status).map((t: any) => t.order_index || 0));
        data.order_index = minIndex - 1000;
      }
      if (selectedTask) {
        await updateTask(selectedTask.id, data);
      } else {
        await createTask(data);
      }
      setIsModalOpen(false);
      mutate();
    } catch (err) {
      console.error(err);
      alert("Failed to save task");
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure?")) {
      await deleteTask(id);
      mutate();
    }
  };

  const handleSaveMoodboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    try {
      const existing = moodboards.find((m: any) => m.task_id === selectedTask.id);
      const imagesArr = moodboardImages.split(",").map(s => s.trim()).filter(Boolean);
      await saveMoodboard({
        id: existing?.id,
        task_id: selectedTask.id,
        title: moodboardTitle,
        images: imagesArr
      });
      setIsMoodboardModalOpen(false);
      mutateMoodboards();
    } catch (err) {
      console.error(err);
      alert("Failed to save moodboard");
    }
  };


  const handleStatusChange = async (task: any, newStatus: string) => {
    await updateTask(task.id, { ...task, status: newStatus });
    mutate();
  };

  const handleDragOverColumn = (e: React.DragEvent, col: string) => {
    e.preventDefault();
    const columnContainer = e.currentTarget as HTMLElement;
    const cards = Array.from(columnContainer.querySelectorAll('.task-card'));
    const y = e.clientY;
    
    let insertIndex = cards.length;
    for (let i = 0; i < cards.length; i++) {
      const rect = cards[i].getBoundingClientRect();
      const middleY = rect.top + rect.height / 2;
      if (y < middleY) {
        insertIndex = i;
        break;
      }
    }
    setDropIndicator({ col, index: insertIndex });
  };

  const handleDragLeaveColumn = () => {
    setDropIndicator(null);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const currentIndicator = dropIndicator;
    setDropIndicator(null);
    
    const taskId = e.dataTransfer.getData('taskId');
    const task = tasks.find((t: any) => t.id.toString() === taskId);
    if (!task) return;

    let colTasks = tasks.filter((t: any) => t.status === newStatus).sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));
    const filteredColTasks = colTasks.filter((t: any) => t.id !== task.id);
    
    let insertIndex = currentIndicator?.col === newStatus ? currentIndicator.index : filteredColTasks.length;
    
    let newOrderIndex = 0;
    if (filteredColTasks.length === 0) {
      newOrderIndex = 1000;
    } else if (insertIndex === 0) {
      newOrderIndex = (filteredColTasks[0].order_index || 0) - 1000;
    } else if (insertIndex >= filteredColTasks.length) {
      newOrderIndex = (filteredColTasks[filteredColTasks.length - 1].order_index || 0) + 1000;
    } else {
      newOrderIndex = ((filteredColTasks[insertIndex - 1].order_index || 0) + (filteredColTasks[insertIndex].order_index || 0)) / 2;
    }
    
    mutate(tasks.map((t: any) => t.id === task.id ? { ...t, status: newStatus, order_index: newOrderIndex } : t), false);
    await updateTask(task.id, { ...task, status: newStatus, order_index: newOrderIndex });
    mutate();
  };


  if (isLoading) return <div className="text-white">Loading...</div>;

  const columns = ["Not Started", "In Progress", "Done"];

  return (
    <div className="space-y-6 flex flex-col min-w-0">
      <div className="flex justify-between items-center bg-black border border-white/10 rounded-2xl p-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-300 transition-colors shrink-0">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col gap-1.5 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <CategoryIcon category={((Array.isArray(currentProject?.categories) ? currentProject.categories : (typeof currentProject?.categories === 'string' && (currentProject.categories as string).startsWith('[')) ? JSON.parse(currentProject.categories as string) : []) || [])[0]} className="w-4 h-4 text-brand-400" /> 
                {projectName}
              </h2>
              {currentProject?.status && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 ${statusStyles[currentProject.status] || "bg-white/10"}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
                  {currentProject.status}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
              <p>Board View</p>
              
              {(currentProject?.start_date || currentProject?.deadline) && (
                <div className="flex items-center gap-1.5 border-l border-white/10 pl-4">
                  <span className="opacity-70">Timeline:</span>
                  <span className="text-gray-300 font-medium">
                    {currentProject.start_date || '-'} &rarr; {currentProject.deadline || '-'}
                  </span>
                </div>
              )}

              {projectMembers.length > 0 && (
                <div className="flex items-center gap-2 border-l border-white/10 pl-4">
                  <span className="opacity-70">Team:</span>
                  <div className="flex items-center -space-x-1.5">
                    {projectMembers.map((pm: any) => (
                      pm.image ? <img key={pm.id} src={pm.image} alt={pm.name} title={pm.name} className="w-5 h-5 rounded-full border-2 border-black" /> : <span key={pm.id} title={pm.name} className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-[8px] font-bold uppercase border-2 border-black">{pm.name.substring(0,2)}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <button onClick={openNewModal} className="bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2 px-4 rounded-xl flex items-center gap-2 text-sm transition-colors shrink-0">
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar items-start">
        {columns.map(col => {
          const colTasks = tasks.filter((t: any) => t.status === col).sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));
          // All 3 columns should be shown even if empty // hide empty columns except main ones
          
          return (
            <div key={col} className="bg-[#111] border border-white/5 rounded-3xl p-4 flex flex-col gap-4 flex-1 min-w-[300px] relative" onDragOver={(e) => handleDragOverColumn(e, col)} onDragLeave={handleDragLeaveColumn} onDrop={(e) => handleDrop(e, col)}>
              <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${statusStyles[col] || "bg-white/10"}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
                  {col}
                </span>
                <span className="text-gray-500 text-xs ml-auto">{colTasks.length}</span>
              </h3>
              <div className="flex flex-col gap-3">
                {colTasks.map((task: any, index: number) => {
                  const assignee = team.find((trm: any) => trm.id === task.assignee_id) || (task.assignee_id ? { id: task.assignee_id, name: task.assignee_id.includes('@') ? task.assignee_id.split('@')[0] : task.assignee_id, image: null } : null);
                  const showIndicator = dropIndicator?.col === col && dropIndicator.index === index;
                  return (
                    <Fragment key={task.id}>
                      {showIndicator && <div className="h-1 bg-brand-500 rounded-full my-1 transition-all" />}
                      <div draggable onDragStart={(e) => { e.dataTransfer.setData('taskId', task.id.toString()); }} onClick={() => openEditModal(task)} className={`task-card rounded-2xl p-4 space-y-3 cursor-pointer transition-all hover:shadow-lg group border ${cardBgStyles[task.status] || "bg-[#1a1a1a] border-white/10 hover:border-white/20"}`}>
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex flex-col gap-2 flex-1 min-w-0">
                          {(() => {
  const displayCategory = task.category || ((Array.isArray(currentProject?.categories) ? currentProject.categories : (typeof currentProject?.categories === 'string' && (currentProject.categories as string).startsWith('[')) ? JSON.parse(currentProject.categories as string) : []) || [])[0];
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
  ) : null;
})()}
                          <p className="font-medium text-sm text-white leading-tight">{task.name}</p>
                          
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={(e) => { e.stopPropagation(); openEditModal(task); }} className="p-1 text-gray-400 hover:text-white" title="Edit Task"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }} className="p-1 text-rose-400 hover:text-rose-300" title="Delete Task"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      
                      

                      <div className="flex justify-between items-end text-xs text-gray-400">
                        <div className="flex flex-col gap-1">
                          {task.due_date && <span>{task.due_date}</span>}
                        </div>
                        {assignee ? (
                          <div className="flex items-center gap-1.5" title={assignee.name}>
                            <span className="text-[10px] font-medium text-gray-400">{assignee.name.split(' ')[0]}</span>
                            {assignee.image ? <img src={assignee.image} alt={assignee.name} className="w-5 h-5 rounded-full" /> : <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[9px] font-bold uppercase">{assignee.name.substring(0,2)}</span>}
                          </div>
                        ) : projectMembers.length > 0 ? (
                          <div className="flex items-center gap-1.5" title="All Project Members">
                            {projectMembers.length === 1 && <span className="text-[10px] font-medium text-gray-400">{projectMembers[0].name.split(' ')[0]}</span>}
                            <div className="flex items-center -space-x-1">
                              {projectMembers.map((pm: any) => (
                                pm.image ? <img key={pm.id} src={pm.image} alt={pm.name} className="w-5 h-5 rounded-full border border-[#1a1a1a]" /> : <span key={pm.id} className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[9px] font-bold uppercase border border-[#1a1a1a]">{pm.name.substring(0,2)}</span>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </Fragment>
                );
              })}
              {dropIndicator?.col === col && dropIndicator.index === colTasks.length && <div className="h-1 bg-brand-500 rounded-full my-1 transition-all" />}
            </div>
          </div>
        );
      })}

        </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-black border border-white/10 rounded-3xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">{selectedTask ? "Edit Task" : "Create Task"}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-semibold uppercase">Name *</label>
                <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white" />
              </div>
              
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-semibold uppercase">Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white">
                    <option value="Not Started">Not Started</option>
<option value="In Progress">In Progress</option>
<option value="Done">Done</option>
                  </select>
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-semibold uppercase">Due Date</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white" />
                </div>
              </div>
              
              <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-semibold uppercase">Assigned To</label>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-white/5 rounded-lg transition-colors overflow-hidden">
                      <input type="radio" name="assignee" checked={!assigneeId} onChange={() => setAssigneeId("")} className="rounded-full border-gray-600 bg-black shrink-0" />
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs text-white shrink-0">?</div>
                      <span className="text-sm font-medium text-white truncate block flex-1">{projectMembers.length > 0 ? "All Project Members" : "Unassigned"}</span>
                    </label>
                    {availableMembers.map((t: any) => (
                      <label key={t.id} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-white/5 rounded-lg transition-colors overflow-hidden">
                        <input type="radio" name="assignee" checked={assigneeId === t.id} onChange={() => setAssigneeId(t.id)} className="rounded-full border-gray-600 bg-black shrink-0" />
                        {t.image ? <img src={t.image} alt={t.name} className="w-8 h-8 rounded-full shrink-0" /> : <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs text-white font-bold shrink-0">{t.name.substring(0,2).toUpperCase()}</div>}
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-sm font-medium text-white truncate block">{t.name}</span>
                          <span className="text-xs text-gray-400 truncate block">{t.email}</span>
                        </div>
                      </label>
                    ))}
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

      {isMoodboardModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-black border border-white/10 rounded-3xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white flex items-center gap-2"><ImageIcon className="w-5 h-5 text-indigo-400" /> Moodboard</h3>
            <form onSubmit={handleSaveMoodboard} className="space-y-4">
              
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-semibold uppercase">Image URLs (comma separated)</label>
                <textarea rows={3} value={moodboardImages} onChange={e => setMoodboardImages(e.target.value)} placeholder="https://..., https://..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                {moodboardImages.split(",").map((url, i) => url.trim() && (
                  <div key={i} className="aspect-square bg-white/5 rounded-xl border border-white/10 overflow-hidden relative group">
                    <img src={url.trim()} alt="Moodboard item" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsMoodboardModalOpen(false)} className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl">Close</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
