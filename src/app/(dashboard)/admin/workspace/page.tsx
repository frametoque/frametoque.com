"use client";
import { useState, useEffect } from "react";
import CalendarTab from "./CalendarTab";
import ProjectsTab from "./ProjectsTab";

export default function WorkspacePage() {
  const [activeTab, setActiveTab] = useState("projects");

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("workspace:tab-changed", { detail: activeTab }));
  }, [activeTab]);

  useEffect(() => {
    const handleSetTab = (e: any) => setActiveTab(e.detail);
    window.addEventListener("workspace:set-tab", handleSetTab);
    
    // Initial sync
    window.dispatchEvent(new CustomEvent("workspace:tab-changed", { detail: activeTab }));
    
    return () => window.removeEventListener("workspace:set-tab", handleSetTab);
  }, [activeTab]);

  return (
    <div className="space-y-6 flex flex-col">
      <div>
        {activeTab === "events" && <CalendarTab />}
        {activeTab === "projects" && <ProjectsTab />}
      </div>
    </div>
  );
}
