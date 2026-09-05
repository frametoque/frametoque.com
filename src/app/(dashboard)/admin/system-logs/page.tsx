"use client";

import React, { useState, useEffect } from "react";
import { Terminal } from "lucide-react";

export default function SystemLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [clearing, setClearing] = useState(false);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/admin/system-logs");
      if (!res.ok) {
        throw new Error(`Failed to fetch logs: ${res.statusText}`);
      }
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      } else {
        throw new Error(data.error || "Failed to load logs");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleClearLogs = async () => {
    if (!confirm("Are you sure you want to clear all system logs? This action cannot be undone.")) {
      return;
    }
    try {
      setClearing(true);
      setError("");
      const res = await fetch("/api/admin/system-logs", {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error(`Failed to clear logs: ${res.statusText}`);
      }
      const data = await res.json();
      if (data.success) {
        alert("System logs cleared successfully!");
        fetchLogs();
      } else {
        throw new Error(data.error || "Failed to clear logs");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setClearing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    window.dispatchEvent(new CustomEvent("update-title", { detail: "System Logs" }));
    
    const handleRefresh = () => fetchLogs();
    const handleClear = () => handleClearLogs();
    
    window.addEventListener("system-logs:refresh", handleRefresh);
    window.addEventListener("system-logs:clear", handleClear);
    
    return () => {
      window.removeEventListener("system-logs:refresh", handleRefresh);
      window.removeEventListener("system-logs:clear", handleClear);
    };
  }, []);

  return (
    <div className="space-y-6">


      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-500/10 border border-red-500/35 text-red-400 rounded-3xl text-sm">
          {error}
        </div>
      ) : logs.length === 0 ? (
        <div className="p-8 text-center text-gray-400 bg-white/5 rounded-3xl">
          No system logs available yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse bg-[#0c0c0e] rounded-3xl overflow-hidden border border-white/5">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 font-semibold bg-white/5">
                <th className="py-4 px-6">Timestamp</th>
                <th className="py-4 px-6">User</th>
                <th className="py-4 px-6">Task / Action</th>
                <th className="py-4 px-6">OS & Client</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-4 px-6 text-gray-300 whitespace-nowrap">
                    {(() => {
                      let dateStr = log.timestamp;
                      if (typeof dateStr === "string" && !dateStr.endsWith("Z") && !dateStr.includes("+")) {
                        dateStr = dateStr.includes("T") ? `${dateStr}Z` : `${dateStr.replace(" ", "T")}Z`;
                      }
                      return new Date(dateStr).toLocaleString();
                    })()}
                  </td>
                  <td className="py-4 px-6 whitespace-nowrap">
                    <p className="text-white font-medium">{log.user_email}</p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{log.device_ip}</p>
                  </td>
                  <td className="py-4 px-6 text-gray-200 min-w-[200px]">
                    {log.task}
                  </td>
                  <td className="py-4 px-6 text-gray-400 text-xs whitespace-nowrap">
                    <span className="px-2 py-1 bg-white/5 rounded border border-white/10 mr-1.5 text-[10px]">
                      {log.device_os}
                    </span>
                    <span className="px-2 py-1 bg-white/5 rounded border border-white/10 text-[10px]">
                      {log.device_type}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
