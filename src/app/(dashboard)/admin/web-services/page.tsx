"use client";

import React, { useState, useEffect, Suspense } from "react";
import DomainsTab from "./DomainsTab";
import HostingTab from "./HostingTab";
import CredentialsTab from "./CredentialsTab";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

function WebServicesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const tabParam = searchParams.get("tab");
  const initialTab = tabParam === "hosting" ? "hosting" : tabParam === "credentials" ? "credentials" : "domains";
  const [activeTab, setActiveTab] = useState<"domains" | "hosting" | "credentials">(initialTab);

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
        router.push("/admin/web-services/domains/new");
      } else if (activeTab === "hosting") {
        window.dispatchEvent(new CustomEvent("hosting:open-add"));
      } else {
        window.dispatchEvent(new CustomEvent("credentials:open-add"));
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
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("domains")}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
            activeTab === "domains"
              ? "bg-white text-black shadow-lg"
              : "bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10"
          }`}
        >
          Domains
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("hosting")}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
            activeTab === "hosting"
              ? "bg-white text-black shadow-lg"
              : "bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10"
          }`}
        >
          Hosting
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("credentials")}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
            activeTab === "credentials"
              ? "bg-white text-black shadow-lg"
              : "bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10"
          }`}
        >
          Credentials Vault
        </button>
      </div>

      {/* Tab Content */}
      <div className={activeTab === "domains" ? "block" : "hidden"}>
        <DomainsTab />
      </div>
      <div className={activeTab === "hosting" ? "block" : "hidden"}>
        <HostingTab />
      </div>
      <div className={activeTab === "credentials" ? "block" : "hidden"}>
        <CredentialsTab />
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
