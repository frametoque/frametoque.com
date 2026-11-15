"use client";

import React, { useState, useEffect, use } from "react";
import useSWR from "swr";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  getProjects, 
  getAllContentPlannerItems, 
  getMonthBillingLinks, 
  getSriLankaHolidays 
} from "../../../actions/workspace";
import ContentPlannerCalendar from "../../ContentPlannerCalendar";
import TasksTab from "../../TasksTab";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function WorkspaceProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const projectId = Number(resolvedParams.id);
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"planner" | "tasks">(tabParam === "tasks" ? "tasks" : "planner");

  const { data: projects = [], isLoading: projectsLoading } = useSWR("workspace-projects", getProjects);
  const { data: plannerItems = [], mutate: mutatePlanner } = useSWR("workspace-content-planner", getAllContentPlannerItems);
  const { data: monthLinks = [], mutate: mutateMonthLinks } = useSWR("workspace-month-links", () => getMonthBillingLinks());
  const { data: holidays = {} } = useSWR("sri-lanka-holidays", getSriLankaHolidays);

  const project = projects.find((p: any) => p.id === projectId);

  // Sync tab with URL searchParam if present
  useEffect(() => {
    if (project) {
      if (!project.has_planner) {
        setActiveTab("tasks");
      } else if (tabParam === "tasks") {
        setActiveTab("tasks");
      } else if (tabParam === "planner") {
        setActiveTab("planner");
      }
    }
  }, [tabParam, project]);

  // Dispatch project info and tab state to Admin top bar
  useEffect(() => {
    if (project) {
      const clientLabel = project.client_name 
        ? `${project.client_name}${project.client_company ? ` (${project.client_company})` : ""}`
        : (project.client_company || "");

      window.dispatchEvent(new CustomEvent("workspace-project:info", {
        detail: {
          name: project.name,
          client: clientLabel,
          tab: project.has_planner ? activeTab : "tasks",
          hasPlanner: Boolean(project.has_planner)
        }
      }));
    }
  }, [project, activeTab]);

  // Listen for tab changes triggered from the top bar
  useEffect(() => {
    const handleSetTab = (e: any) => {
      const newTab = e.detail === "tasks" ? "tasks" : "planner";
      setActiveTab(newTab);
      const url = new URL(window.location.href);
      url.searchParams.set("tab", newTab);
      window.history.replaceState(null, "", url.toString());
      window.dispatchEvent(new CustomEvent("workspace-project:tab-changed", { detail: newTab }));
    };
    window.addEventListener("workspace-project:set-tab", handleSetTab);
    return () => window.removeEventListener("workspace-project:set-tab", handleSetTab);
  }, []);

  if (projectsLoading) {
    return (
      <div className="space-y-6 flex flex-col h-full animate-pulse">
        <div className="bg-black border border-white/10 rounded-2xl p-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/5 rounded-xl" />
            <div className="space-y-1.5">
              <div className="h-5 bg-white/10 rounded-full w-48" />
              <div className="h-3 bg-white/5 rounded-full w-24" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-24 bg-white/5 rounded-xl" />
            <div className="h-9 w-24 bg-white/10 rounded-xl" />
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 min-h-[400px] space-y-4">
          <div className="h-6 bg-white/10 rounded-full w-48 mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-white/5 border border-white/5 rounded-2xl p-4 space-y-3">
                <div className="h-4 bg-white/10 rounded-full w-3/4" />
                <div className="h-3 bg-white/5 rounded-full w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 text-center text-gray-400 space-y-4">
        <p className="text-white text-lg font-semibold">Project not found</p>
        <Link 
          href="/admin/workspace" 
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Projects</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 flex flex-col h-full">
      {activeTab === "planner" && project.has_planner ? (
        <ContentPlannerCalendar
          projects={projects}
          items={plannerItems}
          monthLinks={monthLinks}
          onSaveMonthLinks={mutateMonthLinks}
          sriLankaHolidays={holidays}
          selectedProjectId={projectId}
          onSelectProject={(id) => {
            if (id && id !== projectId) {
              router.push(`/admin/workspace/project/${id}`);
            }
          }}
          onRefresh={mutatePlanner}
        />
      ) : (
        <TasksTab 
          projectId={projectId} 
          projectName={project.name || "Project"} 
          onBack={() => router.push("/admin/workspace")} 
        />
      )}
    </div>
  );
}

