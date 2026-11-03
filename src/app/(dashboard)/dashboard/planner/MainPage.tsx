"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Sparkles,
  AlertCircle,
  Loader2,
  FolderOpen,
  MessageCircle,
  Camera,
  Share2,
  Rocket
} from "lucide-react";
import {
  getClientContentPlanner,
  getSriLankaHolidays,
  WorkspaceProject,
  ContentPlannerItem,
  WorkspaceMonthLink
} from "@/app/(dashboard)/admin/actions/workspace";
import ContentPlannerCalendar from "@/app/(dashboard)/admin/workspace/ContentPlannerCalendar";

export default function ClientPlannerMainPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [items, setItems] = useState<ContentPlannerItem[]>([]);
  const [monthLinks, setMonthLinks] = useState<WorkspaceMonthLink[]>([]);
  const [holidays, setHolidays] = useState<Record<string, string>>({});
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  useEffect(() => {
    if (activeProject) {
      window.dispatchEvent(
        new CustomEvent("client-planner:project-change", {
          detail: {
            projectName: activeProject.name,
            projects: projects.map((p) => ({ id: p.id, name: p.name })),
            selectedProjectId: activeProject.id,
          },
        })
      );
    }
    return () => {
      window.dispatchEvent(
        new CustomEvent("client-planner:project-change", {
          detail: null,
        })
      );
    };
  }, [activeProject, projects]);

  useEffect(() => {
    const handleSelect = (e: Event) => {
      const custom = e as CustomEvent<{ projectId: number }>;
      if (custom.detail?.projectId) {
        setSelectedProjectId(custom.detail.projectId);
      }
    };
    window.addEventListener("client-planner:select-project", handleSelect);
    return () => window.removeEventListener("client-planner:select-project", handleSelect);
  }, []);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/login");
    }
  }, [isLoaded, isSignedIn, router]);

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const email = user.primaryEmailAddress?.emailAddress || "";
      const [plannerRes, holidaysRes] = await Promise.all([
        getClientContentPlanner(email),
        getSriLankaHolidays().catch(() => ({})),
      ]);

      if (!plannerRes.projects || plannerRes.projects.length === 0) {
        router.replace("/dashboard");
        return;
      }

      setProjects(plannerRes.projects || []);
      setItems(plannerRes.items || []);
      setMonthLinks(plannerRes.monthLinks || []);
      setHolidays(holidaysRes || {});

      if (plannerRes.projects && plannerRes.projects.length > 0) {
        setSelectedProjectId(plannerRes.projects[0].id || null);
      }
    } catch (err: any) {
      console.error("Failed to load client content planner:", err);
      setError("Unable to retrieve your content planner schedule. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      loadData();
    }
  }, [isLoaded, isSignedIn, user]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-8 text-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin mb-3" />
        <p className="text-sm font-semibold text-white">Loading your content calendar...</p>
        <p className="text-xs text-gray-400 mt-1">Retrieving scheduled shoots, uploads, and marketing timeline.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#111115] border border-red-500/20 rounded-3xl p-8 text-center max-w-lg mx-auto">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <h3 className="text-base font-bold text-white">Something went wrong</h3>
        <p className="text-xs text-gray-400 mt-1 mb-4">{error}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // If no projects assigned yet, redirecting to dashboard
  if (projects.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {projects.length > 1 && (
        <div className="bg-[#111115] border border-white/10 rounded-2xl p-2 sm:p-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-none">
          <span className="text-xs text-gray-400 font-semibold px-2 shrink-0">Projects:</span>
          {projects.map((p) => {
            const isSelected = selectedProjectId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedProjectId(p.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-brand-600 text-white shadow-sm"
                    : "bg-white/5 text-gray-400 hover:text-white border border-white/5"
                }`}
              >
                {p.name}
              </button>
            );
          })}
        </div>
      )}

      <ContentPlannerCalendar
        projects={projects}
        items={items}
        monthLinks={monthLinks}
        sriLankaHolidays={holidays}
        selectedProjectId={selectedProjectId}
        onSelectProject={(id) => setSelectedProjectId(id)}
        onRefresh={loadData}
        readOnly={true}
        clientName={user?.fullName || user?.firstName || undefined}
      />
    </div>
  );
}

