"use client";

import React, { useState, useEffect, Suspense } from "react";
import DomainsTab from "./DomainsTab";
import HostingTab from "./HostingTab";
import { Globe, Server } from "lucide-react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

function WebServicesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const initialTab = searchParams.get("tab") === "hosting" ? "hosting" : "domains";
  const [activeTab, setActiveTab] = useState<"domains" | "hosting">(initialTab);

  useEffect(() => {
    // Notify layout which tab is active for header buttons
    window.dispatchEvent(new CustomEvent("web-services:tab-change", { detail: activeTab }));
    
    // Update URL without refresh
    const newUrl = `${pathname}?tab=${activeTab}`;
    window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
  }, [activeTab, pathname]);

  useEffect(() => {
    const handleOpenAdd = () => {
      if (activeTab === "domains") {
        window.dispatchEvent(new CustomEvent("domains:open-add"));
      } else {
        window.dispatchEvent(new CustomEvent("hosting:open-add"));
      }
    };
    window.addEventListener("web-services:open-add", handleOpenAdd);
    return () => {
      window.removeEventListener("web-services:open-add", handleOpenAdd);
    };
  }, [activeTab]);

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex gap-4 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab("domains")}
          className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors ${
            activeTab === "domains" ? "text-brand-400 border-b-2 border-brand-400" : "text-gray-400 hover:text-white"
          }`}
        >
          <Globe className="w-4 h-4" />
          Domains
        </button>
        <button
          onClick={() => setActiveTab("hosting")}
          className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors ${
            activeTab === "hosting" ? "text-brand-400 border-b-2 border-brand-400" : "text-gray-400 hover:text-white"
          }`}
        >
          <Server className="w-4 h-4" />
          Hosting
        </button>
      </div>

      {/* Tab Content - conditionally rendered to re-mount, but if state retention is needed we can use CSS. We will use simple unmount for now like separate pages. */}
      <div className={activeTab === "domains" ? "block" : "hidden"}>
        <DomainsTab />
      </div>
      <div className={activeTab === "hosting" ? "block" : "hidden"}>
        <HostingTab />
      </div>
    </div>
  );
}

export default function WebServicesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <WebServicesContent />
    </Suspense>
  );
}
