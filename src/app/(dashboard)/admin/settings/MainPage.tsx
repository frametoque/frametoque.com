"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import {
  User,
  IdCard,
  Mail,
  Globe,
  MapPin,
  Save,
  Phone,
  Building,
  Upload,
  Download,
  Copy,
  Check,
  Terminal,
  Sliders,
  Activity
} from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState("logs");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    clerk_id: "",
    name: "",
    email: "",
    phone: "",
    company: "",
    website: "",
    address: "",
  });

  const connectedAccounts = user?.externalAccounts || [];

  // Helper: apply a fetched profile object onto formData
  const applyProfile = (profile: any) => {
    setFormData(prev => ({
      ...prev,
      name:    profile?.fullName  || user?.fullName || "",
      email:   profile?.email     || user?.primaryEmailAddress?.emailAddress || "",
      phone:   profile?.phone     || "",
      company: profile?.company   || "",
      website: profile?.website   || "",
      address: profile?.address   || "",
    }));
  };

   // Load Clerk user + DB data
  useEffect(() => {
    if (!isLoaded) return;

    if (user) {
      const fetchProfile = async () => {
        try {
          setLoading(true);
          const res = await fetch(`/api/users/get-profile?userId=${user.id}`);
          
          if (!res.ok) {
            console.error("Failed to fetch profile:", res.status);
            applyProfile(null);
            return;
          }
          
          const data = await res.json();
          applyProfile(data.success ? data.profile : null);
        } catch (err) {
          console.error("Error fetching profile:", err);
          applyProfile(null);
        } finally {
          setLoading(false);
        }
      };

      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [isLoaded, user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("You must be signed in to save changes.");
      return;
    }

    setSaving(true);
    setSaveSuccess(false);

    try {
      const fullName = formData.name.trim();
      const [firstName, ...lastNameParts] = fullName.split(" ");
      
      if (user.fullName !== fullName) {
        await user.update({
          firstName: firstName || "",
          lastName: lastNameParts.join(" ") || "",
        });
      }

      const payload = {
        clerkId: user.id,
        email: user.primaryEmailAddress?.emailAddress || formData.email,
        fullName,
        phone: formData.phone || null,
        company: formData.company || null,
        website: formData.website || null,
        address: formData.address || null,
      };

      const res = await fetch("/api/users/save-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      
      if (res.ok && data.success) {
        // Update formData immediately from the returned profile — no refresh needed
        applyProfile(data.profile);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        console.error("API Error:", data);
        alert(`Error: ${data.error || "Failed to save profile"}`);
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const validTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!validTypes.includes(file.type)) {
      alert("Please upload a JPG, PNG, or GIF image.");
      await fetch("/api/admin/system-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: `Upload Error: Invalid file type "${file.type}" for avatar` }),
      }).catch(() => {});
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("File size must be less than 2MB.");
      await fetch("/api/admin/system-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: `Upload Error: Avatar file size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds limit` }),
      }).catch(() => {});
      return;
    }

    try {
      await user.setProfileImage({ file });
      alert("Photo updated successfully!");
      await fetch("/api/admin/system-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: `Updated admin profile photo: "${file.name}"` }),
      }).catch(() => {});
    } catch (err: any) {
      console.error("Upload error:", err);
      alert("Upload failed. Please try again.");
      await fetch("/api/admin/system-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: `Upload Error: Profile photo upload failed: ${err.message || String(err)}` }),
      }).catch(() => {});
    }
  };


  const tabs = [
    { id: "logs", name: "System Logs", icon: Terminal },
    { id: "prefs", name: "Admin Preferences", icon: Sliders },
    { id: "system", name: "System Status", icon: Activity },
    { id: "profile", name: "Profile", icon: User },
  ];

  if (!isLoaded || loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[400px] space-y-4">
        <p className="text-gray-400">You must be signed in to access settings.</p>
        <Link 
          href="/sign-in" 
          className="px-6 py-3 bg-gradient-to-r from-brand-600 to-brand-700 text-white rounded-3xl font-semibold hover:opacity-90 transition-opacity"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-2 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-3xl transition-all ${
                    activeTab === tab.id
                      ? "bg-white text-black font-semibold"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8">
            {activeTab === "profile" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white mb-6">Profile Information</h2>

                {/* Avatar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <div className="relative w-24 h-24 rounded-full overflow-hidden">
                    <img
                      src={user.imageUrl || "/default-avatar.png"}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "/default-avatar.png";
                        e.currentTarget.onerror = null;
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/10 rounded-3xl hover:bg-white/20 transition-colors mb-2 cursor-pointer">
                      <Upload className="w-4 h-4" />
                      Upload Photo
                      <input 
                        type="file" 
                        accept="image/jpeg,image/png,image/gif"
                        onChange={handlePhotoUpload} 
                        className="hidden" 
                      />
                    </label>
                    <p className="text-sm text-gray-400">JPG, PNG or GIF. Max size 2MB</p>
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSave} className="space-y-6">
                  <div className="mb-2">
                  <div className="flex items-center gap-2 mb-2">
                    <IdCard className="w-4 h-4 text-gray-400" />
                    <label className="text-sm font-medium text-gray-300">User ID</label>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      name="uid"
                      disabled
                      value={user.id || ""}
                      className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-3xl text-gray-400 text-sm font-mono cursor-not-allowed pr-24"
                    />
                    
                    {/* Copy Button */}
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(user.id || "");
                          // Show success message
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800/70 hover:bg-gray-700/70 text-gray-300 hover:text-white rounded-md text-xs transition-colors duration-200 border border-gray-700/50"
                        title="Copy to clipboard"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-brand-400" />
                            <span className="text-brand-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                      
                      <span className="text-xs px-2 py-1 bg-gray-800/50 text-gray-400 rounded">
                        Auto-generated
                      </span>
                    </div>
                  </div>
                </div>

                  {/* Personal Information Section */}
                  <div className="space-y-5">
                    <div className="border-l-4 border-brand-500 pl-4">
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {/* Name */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-3">
                          <User className="w-4 h-4" />
                          Full Name *
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-3xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/30 transition-all duration-200"
                          placeholder="Enter your full name"
                          required
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-3">
                          <Mail className="w-4 h-4" />
                          Email Address
                        </label>
                        <div className="relative">
                          <input
                            type="email"
                            name="email"
                            disabled
                            value={formData.email}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-3xl text-gray-400 pr-10"
                          />
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <span className="text-xs px-2 py-1 bg-brand-500/20 text-brand-400 rounded border border-brand-500/30">Verified</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {/* Phone */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-3">
                          <Phone className="w-4 h-4" />
                          Phone Number *
                        </label>
                        <input
                          placeholder="+1 (555) 123-4567"
                          type="tel"
                          name="phone"
                          required
                          value={formData.phone}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-3xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/30 transition-all duration-200"
                        />
                        <p className="text-xs text-gray-500 mt-2">Include country code</p>
                      </div>

                      {/* Company */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-3">
                          <Building className="w-4 h-4" />
                          Company Name
                          <span className="text-xs text-gray-500 font-normal ml-auto">Optional</span>
                        </label>
                        <input
                          type="text"
                          name="company"
                          value={formData.company}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-3xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/30 transition-all duration-200"
                          placeholder="Your company name"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Website Section */}
                  <div className="space-y-3">
                    <label className="flex items-center justify-between text-sm font-medium text-gray-300">
                      <span className="flex justify-center items-center">
                        <Globe className="w-4 h-4" />&nbsp; Website
                      </span>
                      <span className="text-xs text-gray-500 font-normal">Optional</span>
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                        https://
                      </div>
                      <input
                        type="text"
                        name="website"
                        value={formData.website.replace(/^https?:\/\//, '')}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData(prev => ({ ...prev, website: value.startsWith('http') ? value : `https://${value}` }));
                        }}
                        className="w-full pl-20 pr-4 py-3 bg-white/5 border border-white/10 rounded-3xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/30 transition-all duration-200"
                        placeholder="yourwebsite.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-5">
                   <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-3">
                      <MapPin className="w-4 h-4" />
                      Billing Address *
                    </label>
                    
                    <div>
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        rows={3}
                        required
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-3xl text-white placeholder-gray-500 resize-y focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/30 transition-all duration-200"
                        placeholder="123 Business Street, Suite 100&#10;New York, NY 10001&#10;United States"
                      />
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-xs text-gray-500">Include street, city, state, and country</p>
                        <p className="text-xs text-gray-500">{formData.address.length}/200</p>
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="pt-4 border-t border-white/10">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-sm">
                        {saveSuccess ? (
                          <p className="flex items-center gap-2 text-green-400">
                            <Check className="w-4 h-4" />
                            Profile saved successfully!
                          </p>
                        ) : (
                          <p className="flex items-center gap-2 text-gray-400">
                            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                            Updates are reflected immediately across all systems
                          </p>
                        )}
                      </div>
                      <button
                        type="submit"
                        disabled={saving || saveSuccess}
                        className={`flex items-center gap-2 px-6 py-3 rounded-3xl font-semibold shadow-lg transition-all duration-300 min-w-[160px] justify-center ${
                          saveSuccess
                            ? "bg-green-500/20 border border-green-500/40 text-green-400 cursor-default"
                            : saving
                            ? "bg-white/10 text-white opacity-70 cursor-not-allowed"
                            : "bg-white/10 text-white hover:scale-[1.02] hover:shadow-xl"
                        }`}
                      >
                        {saving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" />
                            Saving...
                          </>
                        ) : saveSuccess ? (
                          <>
                            <Check className="w-5 h-5" />
                            Saved!
                          </>
                        ) : (
                          <>
                            <Save className="w-5 h-5" />
                            Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>

                {/* Connected Accounts */}
                <div className="pt-6 border-t border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-4">Connected Accounts</h3>
                  <div className="space-y-3">
                    {connectedAccounts.length === 0 && (
                      <p className="text-gray-400 text-sm">No connected accounts</p>
                    )}
                    {connectedAccounts.map((account) => {
                      let icon;
                      let name;

                      switch (account.provider) {
                        case "google":
                          icon = (
                            <svg className="w-6 h-6" viewBox="0 0 24 24">
                              <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                              />
                              <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                              />
                              <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                              />
                              <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                              />
                            </svg>
                          );
                          name = "Google";
                          break;
                        case "apple":
                          icon = <svg className="w-6 h-6 text-white" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Apple</title><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/></svg>;
                          name = "Apple";
                          break;
                        case "github":
                          icon = <svg className="w-6 h-6 text-white" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>GitHub</title><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>;
                          name = "GitHub";
                          break;
                        default:
                          icon = <User className="w-6 h-6 text-white" />;
                          name = account.provider;
                      }

                      return (
                        <div
                          key={account.providerUserId}
                          className="flex items-center justify-between p-4 bg-white/5 rounded-3xl"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/10 rounded-3xl flex items-center justify-center">
                              {icon}
                            </div>
                            <div>
                              <p className="text-white font-medium">{name}</p>
                              <div className="text-sm text-gray-400">Connected</div>
                            </div>
                          </div>
                          <button className="text-red-400 hover:text-red-300 transition-colors text-sm">
                            Disconnect
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "prefs" && (
              <AdminPreferencesView />
            )}

            {activeTab === "system" && (
              <SystemStatusView />
            )}

            {activeTab === "logs" && (
              <SystemLogsView />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SystemLogsView() {
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
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">System Activity Logs</h2>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleClearLogs}
            disabled={loading || clearing}
            className="px-4 py-2 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-3xl transition-colors cursor-pointer font-medium disabled:opacity-50"
          >
            {clearing ? "Clearing..." : "Clear Logs"}
          </button>
          <button
            type="button"
            onClick={fetchLogs}
            disabled={loading || clearing}
            className="px-4 py-2 text-sm bg-white/10 hover:bg-white/20 text-white rounded-3xl transition-colors cursor-pointer font-medium disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

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
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 font-semibold">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Task / Action</th>
                <th className="py-3 px-4">OS & Client</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-3.5 px-4 text-gray-300 whitespace-nowrap">
                    {(() => {
                      let dateStr = log.timestamp;
                      if (typeof dateStr === "string" && !dateStr.endsWith("Z") && !dateStr.includes("+")) {
                        dateStr = dateStr.includes("T") ? `${dateStr}Z` : `${dateStr.replace(" ", "T")}Z`;
                      }
                      return new Date(dateStr).toLocaleString();
                    })()}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <p className="text-white font-medium">{log.user_email}</p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{log.device_ip}</p>
                  </td>
                  <td className="py-3.5 px-4 text-gray-200 min-w-[200px]">
                    {log.task}
                  </td>
                  <td className="py-3.5 px-4 text-gray-400 text-xs whitespace-nowrap">
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

function AdminPreferencesView() {
  const [prefs, setPrefs] = useState({
    currency: "USD",
    invoicePrefix: "INV",
    autoRefresh: "30",
    maxUploadSize: "5",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/preferences");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.prefs) {
            setPrefs(data.prefs);
          }
        }
      } catch (e) {
        console.error("Failed to load preferences", e);
      } finally {
        setLoading(false);
      }
    };
    fetchPrefs();
  }, []);

  const handleSave = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
      } else {
        alert("Failed to save preferences to database");
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred while saving preferences");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6">Admin Preferences</h2>
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Default Currency</label>
            <select
              value={prefs.currency}
              onChange={(e) => setPrefs({ ...prefs, currency: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-3xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            >
              <option value="USD">USD ($)</option>
              <option value="LKR">LKR (Rs.)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Invoice Number Prefix</label>
            <input
              type="text"
              value={prefs.invoicePrefix}
              onChange={(e) => setPrefs({ ...prefs, invoicePrefix: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-3xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              placeholder="INV"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Analytics Auto-Refresh (sec)</label>
            <select
              value={prefs.autoRefresh}
              onChange={(e) => setPrefs({ ...prefs, autoRefresh: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-3xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            >
              <option value="15">15 seconds</option>
              <option value="30">30 seconds</option>
              <option value="60">60 seconds</option>
              <option value="300">5 minutes</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Max Receipt Upload Size (MB)</label>
            <input
              type="number"
              value={prefs.maxUploadSize}
              onChange={(e) => setPrefs({ ...prefs, maxUploadSize: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-3xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              min="1"
              max="50"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 flex items-center justify-between">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-white text-black font-semibold rounded-3xl hover:opacity-95 transition-opacity"
          >
            {saving ? "Saving..." : success ? "Preferences Saved!" : "Save Preferences"}
          </button>
        </div>
      </form>
    </div>
  );
}

function SystemStatusView() {
  const [status, setStatus] = useState({
    dbStatus: "Checking...",
    blobStatus: "Checking...",
    env: "production",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/admin/system-status");
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setStatus({
              dbStatus: data.dbStatus,
              blobStatus: data.blobStatus,
              env: data.env,
            });
          }
        }
      } catch (e) {
        console.error("Failed to check status", e);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6">System Status & Diagnostics</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Database */}
        <div className="p-5 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400 mb-1">Database Connectivity</p>
            <p className={`text-lg font-bold flex items-center gap-1.5 ${status.dbStatus === "Connected" ? "text-green-400" : "text-red-400"}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${status.dbStatus === "Connected" ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
              {status.dbStatus}
            </p>
          </div>
          <Activity className="w-8 h-8 text-white/10" />
        </div>

        {/* Vercel Blob */}
        <div className="p-5 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400 mb-1">Vercel Blob CDN Status</p>
            <p className={`text-lg font-bold flex items-center gap-1.5 ${status.blobStatus === "Connected" ? "text-green-400" : "text-yellow-400"}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${status.blobStatus === "Connected" ? "bg-green-500 animate-pulse" : "bg-yellow-500"}`} />
              {status.blobStatus}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4">
        <h3 className="text-lg font-semibold text-white">Diagnostics Information</h3>
        <div className="space-y-2 text-sm text-gray-300">
          <div className="flex justify-between py-2 border-b border-white/5">
            <span>Next.js Framework</span>
            <span className="font-mono text-gray-400">16.2.9</span>
          </div>
          <div className="flex justify-between py-2 border-b border-white/5">
            <span>Clerk Authentication</span>
            <span className="font-mono text-gray-400">v6 (Active)</span>
          </div>
          <div className="flex justify-between py-2 border-b border-white/5">
            <span>Primary Database Provider</span>
            <span className="font-mono text-gray-400">Neon PostgreSQL (Serverless)</span>
          </div>
          <div className="flex justify-between py-2">
            <span>Environment Mode</span>
            <span className="font-mono text-gray-400 capitalize">{status.env}</span>
          </div>
        </div>
      </div>
    </div>
  );
}