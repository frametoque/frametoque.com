"use client";

import React, { useState, useEffect } from "react";
import DomainsTab from "./DomainsTab";
import HostingTab from "./HostingTab";
import CredentialsTab from "./CredentialsTab";
import { useRouter } from "next/navigation";

export default function WebServicesView({
  initialTab = "domains",
}: {
  initialTab?: "domains" | "hosting" | "credentials";
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"domains" | "hosting" | "credentials">(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.endsWith("/hosting")) setActiveTab("hosting");
      else if (path.endsWith("/credentials")) setActiveTab("credentials");
      else if (path.endsWith("/domains")) setActiveTab("domains");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const switchTab = (tab: "domains" | "hosting" | "credentials") => {
    setActiveTab(tab);
    window.history.pushState(null, "", `/admin/web-services/${tab}`);
  };

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
  }, [activeTab, router]);

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => switchTab("domains")}
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
          onClick={() => switchTab("hosting")}
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
          onClick={() => switchTab("credentials")}
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
