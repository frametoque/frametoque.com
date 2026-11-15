"use client";

import React, { useState, useEffect } from "react";
import useSWR from "swr";
import {
  getSiteCredentials,
  addSiteCredential,
  updateSiteCredential,
  deleteSiteCredential,
  SiteCredential,
} from "../actions/siteCredentials";
import {
  KeyRound,
  ExternalLink,
  Copy,
  Check,
  Eye,
  EyeOff,
  Plus,
  Edit2,
  Trash2,
  X,
  Server,
  Globe,
  Lock,
  Search,
  FileText,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import AnimatedNumber from "../components/AnimatedNumber";

const TECH_CATEGORIES = [
  "WordPress",
  "Next.js",
  "Shopify",
  "Laravel",
  "PHP",
  "Webflow",
  "React",
  "Custom Code",
  "Other",
];

const HOSTING_TYPES = [
  "cPanel",
  "Plesk",
  "VPS",
  "Vercel",
  "AWS",
  "DigitalOcean",
  "Netlify",
  "Cloudflare",
  "Dedicated Server",
  "Other",
];

function getControlPanelUrl(ipOrUrl?: string | null, port?: string | null): string | null {
  if (!ipOrUrl) return null;
  const trimmed = ipOrUrl.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (
    trimmed.includes(":2083") ||
    trimmed.includes(":8443") ||
    trimmed.includes(":2222") ||
    trimmed.includes(":2082") ||
    trimmed.includes(":8442") ||
    trimmed.toLowerCase().includes("cpanel.") ||
    trimmed.toLowerCase().includes("plesk.") ||
    port === "2083" ||
    port === "8443" ||
    port === "2222"
  ) {
    const hasPort = trimmed.includes(":");
    const finalPort = !hasPort && port ? `:${port}` : "";
    return `https://${trimmed}${finalPort}`;
  }
  return null;
}

export default function CredentialsTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const { data: credentials = [], isLoading: loading, mutate } = useSWR(
    ["admin-site-credentials"],
    () => getSiteCredentials()
  );

  // Copy status feedback per field: key format `${id}-${field}`
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  // Password visibility map { id: boolean }
  const [showPasswordMap, setShowPasswordMap] = useState<Record<number, boolean>>({});
  const toggleShowPassword = (id: number) => {
    setShowPasswordMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Server password visibility map { id: boolean }
  const [showServerPassMap, setShowServerPassMap] = useState<Record<number, boolean>>({});
  const toggleShowServerPass = (id: number) => {
    setShowServerPassMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Add modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addSiteName, setAddSiteName] = useState("");
  const [addDomain, setAddDomain] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addCategory, setAddCategory] = useState("WordPress");
  const [addHostingType, setAddHostingType] = useState("cPanel");
  const [addLoginUrl, setAddLoginUrl] = useState("");
  const [addUsername, setAddUsername] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addShowPassword, setAddShowPassword] = useState(false);
  const [addServerIp, setAddServerIp] = useState("");
  const [addServerPort, setAddServerPort] = useState("22");
  const [addServerUser, setAddServerUser] = useState("");
  const [addServerPass, setAddServerPass] = useState("");
  const [addNotes, setAddNotes] = useState("");
  const [savingAdd, setSavingAdd] = useState(false);

  // Edit modal state
  const [editingCred, setEditingCred] = useState<SiteCredential | null>(null);
  const [editSiteName, setEditSiteName] = useState("");
  const [editDomain, setEditDomain] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editCategory, setEditCategory] = useState("WordPress");
  const [editHostingType, setEditHostingType] = useState("cPanel");
  const [editLoginUrl, setEditLoginUrl] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editShowPassword, setEditShowPassword] = useState(false);
  const [editServerIp, setEditServerIp] = useState("");
  const [editServerPort, setEditServerPort] = useState("22");
  const [editServerUser, setEditServerUser] = useState("");
  const [editServerPass, setEditServerPass] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Listen for global "credentials:open-add" event
  useEffect(() => {
    const handleOpenAdd = () => openAddModal();
    window.addEventListener("credentials:open-add", handleOpenAdd);
    return () => window.removeEventListener("credentials:open-add", handleOpenAdd);
  }, []);

  const openAddModal = () => {
    setAddSiteName("");
    setAddDomain("");
    setAddEmail("");
    setAddCategory("WordPress");
    setAddHostingType("cPanel");
    setAddLoginUrl("");
    setAddUsername("");
    setAddPassword("");
    setAddShowPassword(false);
    setAddServerIp("");
    setAddServerPort("22");
    setAddServerUser("");
    setAddServerPass("");
    setAddNotes("");
    setIsAddOpen(true);
  };

  const openEditModal = (c: SiteCredential) => {
    setEditingCred(c);
    setEditSiteName(c.site_name);
    setEditDomain(c.domain_name || "");
    setEditEmail(c.client_email || "");
    setEditCategory(c.category || "WordPress");
    setEditHostingType(c.hosting_type || "cPanel");
    setEditLoginUrl(c.login_url || "");
    setEditUsername(c.username || "");
    setEditPassword(c.password || "");
    setEditShowPassword(false);
    setEditServerIp(c.server_ip || "");
    setEditServerPort(c.server_port || "22");
    setEditServerUser(c.server_user || "");
    setEditServerPass(c.server_pass || "");
    setEditNotes(c.notes || "");
  };

  // Password generator helper
  const generateRandomPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+";
    let pass = "";
    for (let i = 0; i < 16; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAdd(true);
    try {
      const res = await addSiteCredential({
        site_name: addSiteName,
        domain_name: addDomain,
        client_email: addEmail,
        category: addCategory,
        hosting_type: addHostingType,
        login_url: addLoginUrl,
        username: addUsername,
        password: addPassword,
        server_ip: addServerIp,
        server_port: addServerPort,
        server_user: addServerUser,
        server_pass: addServerPass,
        notes: addNotes,
      });

      if (res.success) {
        setIsAddOpen(false);
        await mutate();
      } else {
        alert("Failed to save: " + res.error);
      }
    } catch (err: any) {
      alert("Error saving credentials: " + err.message);
    } finally {
      setSavingAdd(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCred) return;
    setSavingEdit(true);
    try {
      const res = await updateSiteCredential(editingCred.id, {
        site_name: editSiteName,
        domain_name: editDomain,
        client_email: editEmail,
        category: editCategory,
        hosting_type: editHostingType,
        login_url: editLoginUrl,
        username: editUsername,
        password: editPassword,
        server_ip: editServerIp,
        server_port: editServerPort,
        server_user: editServerUser,
        server_pass: editServerPass,
        notes: editNotes,
      });

      if (res.success) {
        setEditingCred(null);
        await mutate();
      } else {
        alert("Failed to update: " + res.error);
      }
    } catch (err: any) {
      alert("Error updating credentials: " + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete credentials for "${name}"?`)) return;
    try {
      const res = await deleteSiteCredential(id);
      if (res.success) {
        await mutate();
      } else {
        alert("Failed to delete: " + res.error);
      }
    } catch (err: any) {
      alert("Error deleting credential: " + err.message);
    }
  };

  // Filtered credentials
  const filteredCredentials = credentials.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    const matchQuery =
      !q ||
      c.site_name.toLowerCase().includes(q) ||
      (c.domain_name && c.domain_name.toLowerCase().includes(q)) ||
      (c.client_email && c.client_email.toLowerCase().includes(q)) ||
      (c.category && c.category.toLowerCase().includes(q)) ||
      (c.hosting_type && c.hosting_type.toLowerCase().includes(q)) ||
      (c.username && c.username.toLowerCase().includes(q)) ||
      (c.login_url && c.login_url.toLowerCase().includes(q)) ||
      (c.server_ip && c.server_ip.toLowerCase().includes(q)) ||
      (c.notes && c.notes.toLowerCase().includes(q));

    const matchFilter =
      activeFilter === "All" ||
      c.category?.toLowerCase() === activeFilter.toLowerCase() ||
      c.hosting_type?.toLowerCase() === activeFilter.toLowerCase() ||
      (activeFilter === "cPanel" && (
        c.hosting_type?.toLowerCase() === "cpanel" ||
        c.server_port === "2083" ||
        c.server_ip?.includes("2083")
      )) ||
      (activeFilter === "VPS" && (
        c.hosting_type?.toLowerCase() === "vps" ||
        c.server_port === "22"
      ));

    return matchQuery && matchFilter;
  });

  return (
    <div className="space-y-6 pb-12 mt-2">
      {/* Controls & Filter Pills */}
      <PageHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search website, domain, login, client..."
        filters={["All", "WordPress", "Next.js", "cPanel", "Plesk", "VPS", "Vercel", "AWS"]}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        primaryActionLabel="Add Site"
        onPrimaryAction={openAddModal}
      />

      {/* Credentials Table */}
      <Table>
        <TableHeader>
          <TableHead>Website &amp; Stack</TableHead>
          <TableHead>Admin Login URL</TableHead>
          <TableHead>Username / Email</TableHead>
          <TableHead>Password (Encrypted)</TableHead>
          <TableHead>Server / Host / cPanel</TableHead>
          <TableHead>Secure Notes</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-brand-400" />
                Decrypting secure credentials vault...
              </TableCell>
            </TableRow>
          ) : filteredCredentials.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-16 text-gray-500">
                <KeyRound className="w-10 h-10 mx-auto mb-3 opacity-30 text-gray-400" />
                <p className="font-semibold text-gray-400">No website credentials found</p>
                <p className="text-xs text-gray-600 mt-1">
                  Click "Add Site" above to store your first website's login &amp; server credentials securely.
                </p>
              </TableCell>
            </TableRow>
          ) : (
            filteredCredentials.map((c) => {
              const isRevealed = !!showPasswordMap[c.id];
              const isServerRevealed = !!showServerPassMap[c.id];

              return (
                <TableRow key={c.id}>
                  {/* Website & Stack */}
                  <TableCell>
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <span>{c.site_name}</span>
                    </div>
                    {c.domain_name && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        <span>{c.domain_name}</span>
                      </div>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300">
                        {c.category || "WordPress"}
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-300 flex items-center gap-1">
                        <Server className="w-2.5 h-2.5 text-gray-400" />
                        {c.hosting_type || "cPanel"}
                      </span>
                      {c.client_email && (
                        <span className="text-[10px] text-gray-500 truncate max-w-[130px]" title={c.client_email}>
                          {c.client_email}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Login URL */}
                  <TableCell>
                    {c.login_url ? (
                      <div className="flex items-center gap-1.5">
                        <a
                          href={c.login_url.startsWith("http") ? c.login_url : `https://${c.login_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-brand-400 hover:text-brand-300 hover:underline flex items-center gap-1 truncate max-w-[180px]"
                          title={c.login_url}
                        >
                          <span className="truncate">{c.login_url.replace(/^https?:\/\//, "")}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleCopy(c.login_url || "", `${c.id}-url`)}
                          title="Copy login URL"
                          className="p-1 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-colors"
                        >
                          {copiedKey === `${c.id}-url` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">—</span>
                    )}
                  </TableCell>

                  {/* Username */}
                  <TableCell>
                    {c.username ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-200 select-all font-medium truncate max-w-[140px]">
                          {c.username}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(c.username || "", `${c.id}-user`)}
                          title="Copy username"
                          className="p-1 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-colors"
                        >
                          {copiedKey === `${c.id}-user` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">—</span>
                    )}
                  </TableCell>

                  {/* Password */}
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs select-all bg-white/5 border border-white/10 px-2 py-1 rounded-lg">
                        {isRevealed ? c.password : "••••••••••••"}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleShowPassword(c.id)}
                        title={isRevealed ? "Hide Password" : "Show Password"}
                        className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                      >
                        {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(c.password || "", `${c.id}-pass`)}
                        title="Copy Password"
                        className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                      >
                        {copiedKey === `${c.id}-pass` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </TableCell>

                  {/* Server / Host / cPanel */}
                  <TableCell>
                    {c.server_ip || c.server_user ? (() => {
                      const cpUrl = getControlPanelUrl(c.server_ip, c.server_port);
                      if (cpUrl) {
                        return (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs">
                              <a
                                href={cpUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1 font-medium truncate max-w-[150px]"
                                title={`Open Control Panel: ${cpUrl}`}
                              >
                                <ExternalLink className="w-3 h-3 shrink-0" />
                                <span className="truncate">{c.server_ip.replace(/^https?:\/\//i, '')}</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => handleCopy(cpUrl, `${c.id}-host`)}
                                className="p-0.5 hover:bg-white/10 rounded text-gray-500 hover:text-white"
                                title="Copy Link"
                              >
                                {copiedKey === `${c.id}-host` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                            {c.server_user && (
                              <div className="flex items-center gap-1 text-[11px] text-gray-400">
                                <span className="truncate max-w-[120px]">User: {c.server_user}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(c.server_user || "", `${c.id}-srvuser`)}
                                  className="p-0.5 text-gray-500 hover:text-white"
                                  title="Copy Username"
                                >
                                  {copiedKey === `${c.id}-srvuser` ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            )}
                            {c.server_pass && (
                              <div className="flex items-center gap-1 text-[11px] text-gray-400">
                                <span>Pass: {isServerRevealed ? c.server_pass : "••••••••"}</span>
                                <button
                                  type="button"
                                  onClick={() => toggleShowServerPass(c.id)}
                                  className="p-0.5 text-gray-500 hover:text-white"
                                >
                                  {isServerRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(c.server_pass || "", `${c.id}-srvpass`)}
                                  className="p-0.5 text-gray-500 hover:text-white"
                                  title="Copy Password"
                                >
                                  {copiedKey === `${c.id}-srvpass` ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-xs text-gray-300">
                            <span className="truncate max-w-[130px]">
                              {c.server_user ? `${c.server_user}@` : ""}
                              {c.server_ip}
                              {c.server_port ? `:${c.server_port}` : ""}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopy(
                                  `${c.server_user ? `${c.server_user}@` : ""}${c.server_ip}${c.server_port ? `:${c.server_port}` : ""}`,
                                  `${c.id}-host`
                                )
                              }
                              className="p-0.5 hover:bg-white/10 rounded text-gray-500 hover:text-white"
                            >
                              {copiedKey === `${c.id}-host` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          {c.server_pass && (
                            <div className="flex items-center gap-1 text-[11px] text-gray-400">
                              <span>Key: {isServerRevealed ? c.server_pass : "••••••••"}</span>
                              <button
                                type="button"
                                onClick={() => toggleShowServerPass(c.id)}
                                className="p-0.5 text-gray-500 hover:text-white"
                              >
                                {isServerRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopy(c.server_pass || "", `${c.id}-srvpass`)}
                                className="p-0.5 text-gray-500 hover:text-white"
                              >
                                {copiedKey === `${c.id}-srvpass` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })() : (
                      <span className="text-xs text-gray-500">—</span>
                    )}
                  </TableCell>

                  {/* Secure Notes */}
                  <TableCell>
                    {c.notes ? (
                      <div className="relative group max-w-[160px]">
                        <p className="text-xs text-gray-400 truncate">{c.notes}</p>
                        <button
                          type="button"
                          onClick={() => handleCopy(c.notes || "", `${c.id}-notes`)}
                          className="absolute right-0 top-0 p-1 bg-black/80 rounded opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white"
                          title="Copy notes"
                        >
                          {copiedKey === `${c.id}-notes` ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">—</span>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(c)}
                        className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors cursor-pointer"
                        title="Edit credentials"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id, c.site_name)}
                        className="p-2 hover:bg-red-500/10 rounded-xl text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                        title="Delete credentials"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {/* Add Credential Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md px-4">
          <div className="bg-black border border-white/10 rounded-3xl w-full max-w-4xl max-h-[85vh] relative shadow-2xl text-white flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-white/10 shrink-0">
              <h3 className="text-lg font-bold text-white">Add Website &amp; Server Login</h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} autoComplete="off" data-form-type="other" className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Site Name & Domain */}
                <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Website / Project Name *</label>
                  <input
                    type="text"
                    required
                    value={addSiteName}
                    onChange={(e) => setAddSiteName(e.target.value)}
                    placeholder="e.g. Acme Online Store"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Domain Name</label>
                  <input
                    type="text"
                    value={addDomain}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAddDomain(val);
                      const clean = val.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
                      if (clean && (!addLoginUrl || addLoginUrl.endsWith("/admin") || addLoginUrl.endsWith("/wp-admin"))) {
                        setAddLoginUrl(`https://${clean}/admin`);
                      }
                    }}
                    onBlur={() => {
                      setAddDomain((prev) => prev.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, ""));
                    }}
                    placeholder="e.g. acmestore.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 text-white"
                  />
                </div>
              </div>

              {/* Site Technology / CMS & Hosting Type */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Site Technology / CMS</label>
                  <select
                    value={addCategory}
                    onChange={(e) => setAddCategory(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-500 text-white"
                  >
                    {TECH_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Hosting Type</label>
                  <select
                    value={addHostingType}
                    onChange={(e) => setAddHostingType(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-500 text-white"
                  >
                    {HOSTING_TYPES.map((ht) => (
                      <option key={ht} value={ht}>
                        {ht}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Admin Login URL & Client Email */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Admin Login URL</label>
                  <input
                    type="text"
                    value={addLoginUrl}
                    onChange={(e) => setAddLoginUrl(e.target.value)}
                    placeholder="https://acmestore.com/admin"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Client Email (Optional)</label>
                  <input
                    type="email"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    placeholder="client@acmestore.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 text-white"
                  />
                </div>
              </div>

              {/* Username & Password */}
              <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">
                    Admin Login Credentials
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400 block">Username / Email</label>
                    <input
                      type="text"
                      name="site_credential_username"
                      autoComplete="off"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-bwignore="true"
                      data-form-type="other"
                      value={addUsername}
                      onChange={(e) => setAddUsername(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400 block">Password *</label>
                    <div className="relative">
                      <input
                        type="text"
                        name="site_credential_password"
                        autoComplete="off"
                        data-lpignore="true"
                        data-1p-ignore="true"
                        data-bwignore="true"
                        data-form-type="other"
                        style={{ WebkitTextSecurity: addShowPassword ? "none" : "disc" } as any}
                        required
                        value={addPassword}
                        onChange={(e) => setAddPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-sm outline-none focus:border-brand-500 text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setAddShowPassword(!addShowPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {addShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Server / Shared Hosting / cPanel / Plesk Details */}
              <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white">
                    Server / Shared Hosting / cPanel / Plesk (Optional)
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const cleanDom = addDomain ? addDomain.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '') : '';
                        setAddServerPort("2083");
                        setAddServerIp(cleanDom ? `https://${cleanDom}:2083` : "https://cpanel.domain.com:2083");
                        setAddHostingType("cPanel");
                      }}
                      className="text-[10px] px-2 py-0.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-md transition-colors cursor-pointer"
                      title="Quick fill cPanel port & URL"
                    >
                      + cPanel (:2083)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const cleanDom = addDomain ? addDomain.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '') : '';
                        setAddServerPort("8443");
                        setAddServerIp(cleanDom ? `https://${cleanDom}:8443` : "https://plesk.domain.com:8443");
                        setAddHostingType("Plesk");
                      }}
                      className="text-[10px] px-2 py-0.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-md transition-colors cursor-pointer"
                      title="Quick fill Plesk port & URL"
                    >
                      + Plesk (:8443)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddServerPort("22");
                        setAddHostingType("VPS");
                      }}
                      className="text-[10px] px-2 py-0.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 rounded-md transition-colors cursor-pointer"
                    >
                      SSH (:22)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddServerPort("21")}
                      className="text-[10px] px-2 py-0.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 rounded-md transition-colors cursor-pointer"
                    >
                      FTP (:21)
                    </button>
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-gray-400 block">
                      Server Host / IP / Control Panel URL (cPanel, Plesk)
                    </label>
                    <input
                      type="text"
                      value={addServerIp}
                      onChange={(e) => setAddServerIp(e.target.value)}
                      placeholder="e.g. https://cpanel.domain.com:2083 or 192.168.1.1"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-500 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400 block">Port</label>
                    <input
                      type="text"
                      value={addServerPort}
                      onChange={(e) => setAddServerPort(e.target.value)}
                      placeholder="22, 2083, 8443"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-500 text-white"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400 block">
                      Username (cPanel / Plesk / SSH)
                    </label>
                    <input
                      type="text"
                      name="site_server_username"
                      autoComplete="off"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-bwignore="true"
                      data-form-type="other"
                      value={addServerUser}
                      onChange={(e) => setAddServerUser(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-500 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400 block">
                      Password / Key
                    </label>
                    <input
                      type="text"
                      name="site_server_password"
                      autoComplete="off"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-bwignore="true"
                      data-form-type="other"
                      style={{ WebkitTextSecurity: "disc" } as any}
                      value={addServerPass}
                      onChange={(e) => setAddServerPass(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-500 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Secure Notes */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 block">
                  Encrypted Notes (API tokens, recovery codes, database configs)
                </label>
                <textarea
                  rows={2}
                  value={addNotes}
                  onChange={(e) => setAddNotes(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-500 text-white"
                />
              </div>

              </div>

              <div className="flex justify-end gap-3 p-6 pt-4 border-t border-white/10 shrink-0 bg-[#0c0c0e]">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-2xl font-semibold transition-colors text-sm text-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAdd}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-semibold transition-colors text-sm disabled:opacity-50 cursor-pointer"
                >
                  {savingAdd ? "Encrypting & Saving..." : "Save to Vault"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Credential Modal */}
      {editingCred && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md px-4">
          <div className="bg-black border border-white/10 rounded-3xl w-full max-w-4xl max-h-[85vh] relative shadow-2xl text-white flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-white/10 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-white">Edit Website Credentials</h3>
                <p className="text-xs text-gray-400">{editingCred.site_name}</p>
              </div>
              <button
                onClick={() => setEditingCred(null)}
                className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} autoComplete="off" data-form-type="other" className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Site Name & Domain */}
                <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Website / Project Name *</label>
                  <input
                    type="text"
                    required
                    value={editSiteName}
                    onChange={(e) => setEditSiteName(e.target.value)}
                    placeholder="e.g. Acme Online Store"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Domain Name</label>
                  <input
                    type="text"
                    value={editDomain}
                    onChange={(e) => setEditDomain(e.target.value)}
                    placeholder="e.g. acmestore.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 text-white"
                  />
                </div>
              </div>

              {/* Site Technology / CMS & Hosting Type */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Site Technology / CMS</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-500 text-white"
                  >
                    {TECH_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Hosting Type</label>
                  <select
                    value={editHostingType}
                    onChange={(e) => setEditHostingType(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-500 text-white"
                  >
                    {HOSTING_TYPES.map((ht) => (
                      <option key={ht} value={ht}>
                        {ht}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Admin Login URL & Client Email */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Admin Login URL</label>
                  <input
                    type="text"
                    value={editLoginUrl}
                    onChange={(e) => setEditLoginUrl(e.target.value)}
                    placeholder="https://acmestore.com/admin"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 block">Client Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="client@acmestore.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 text-white"
                  />
                </div>
              </div>

              {/* Username & Password */}
              <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">
                    Admin Login Credentials
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400 block">Username / Email</label>
                    <input
                      type="text"
                      name="edit_site_credential_username"
                      autoComplete="off"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-bwignore="true"
                      data-form-type="other"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400 block">Password *</label>
                    <div className="relative">
                      <input
                        type="text"
                        name="edit_site_credential_password"
                        autoComplete="off"
                        data-lpignore="true"
                        data-1p-ignore="true"
                        data-bwignore="true"
                        data-form-type="other"
                        style={{ WebkitTextSecurity: editShowPassword ? "none" : "disc" } as any}
                        required
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-sm outline-none focus:border-brand-500 text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setEditShowPassword(!editShowPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {editShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Server / Shared Hosting / cPanel / Plesk Details */}
              <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white">
                    Server / Shared Hosting / cPanel / Plesk (Optional)
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const cleanDom = editDomain ? editDomain.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '') : '';
                        setEditServerPort("2083");
                        setEditServerIp(cleanDom ? `https://${cleanDom}:2083` : "https://cpanel.domain.com:2083");
                        setEditHostingType("cPanel");
                      }}
                      className="text-[10px] px-2 py-0.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-md transition-colors cursor-pointer"
                      title="Quick fill cPanel port & URL"
                    >
                      + cPanel (:2083)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const cleanDom = editDomain ? editDomain.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '') : '';
                        setEditServerPort("8443");
                        setEditServerIp(cleanDom ? `https://${cleanDom}:8443` : "https://plesk.domain.com:8443");
                        setEditHostingType("Plesk");
                      }}
                      className="text-[10px] px-2 py-0.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-md transition-colors cursor-pointer"
                      title="Quick fill Plesk port & URL"
                    >
                      + Plesk (:8443)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditServerPort("22");
                        setEditHostingType("VPS");
                      }}
                      className="text-[10px] px-2 py-0.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 rounded-md transition-colors cursor-pointer"
                    >
                      SSH (:22)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditServerPort("21")}
                      className="text-[10px] px-2 py-0.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 rounded-md transition-colors cursor-pointer"
                    >
                      FTP (:21)
                    </button>
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-gray-400 block">
                      Server Host / IP / Control Panel URL (cPanel, Plesk)
                    </label>
                    <input
                      type="text"
                      value={editServerIp}
                      onChange={(e) => setEditServerIp(e.target.value)}
                      placeholder="e.g. https://cpanel.domain.com:2083 or 192.168.1.1"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-500 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400 block">Port</label>
                    <input
                      type="text"
                      value={editServerPort}
                      onChange={(e) => setEditServerPort(e.target.value)}
                      placeholder="22, 2083, 8443"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-500 text-white"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400 block">
                      Username (cPanel / Plesk / SSH)
                    </label>
                    <input
                      type="text"
                      name="edit_site_server_username"
                      autoComplete="off"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-bwignore="true"
                      data-form-type="other"
                      value={editServerUser}
                      onChange={(e) => setEditServerUser(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-500 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400 block">Server Password / Key</label>
                    <input
                      type="text"
                      name="edit_site_server_password"
                      autoComplete="off"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-bwignore="true"
                      data-form-type="other"
                      style={{ WebkitTextSecurity: "disc" } as any}
                      value={editServerPass}
                      onChange={(e) => setEditServerPass(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-500 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Secure Notes */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 block">
                  Encrypted Notes (API tokens, recovery codes, database configs)
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-500 text-white"
                />
              </div>

              </div>

              <div className="flex justify-end gap-3 p-6 pt-4 border-t border-white/10 shrink-0 bg-[#0c0c0e]">
                <button
                  type="button"
                  onClick={() => setEditingCred(null)}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-2xl font-semibold transition-colors text-sm text-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-semibold transition-colors text-sm disabled:opacity-50 cursor-pointer"
                >
                  {savingEdit ? "Updating & Encrypting..." : "Update Vault"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
