"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  Camera,
  Film,
  Share2,
  Rocket,
  CheckSquare,
  Clock,
  ExternalLink,
  Filter,
  Layers,
  Sparkles,
  MapPin,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
  TrendingUp,
  Tag,
  DollarSign,
  ChevronDown,
  BarChart3,
  Loader2,
  User
} from "lucide-react";
import {
  ContentPlannerItem,
  WorkspaceProject,
  WorkspaceMonthLink,
  createContentPlannerItem,
  updateContentPlannerItem,
  deleteContentPlannerItem,
  saveMonthBillingLinks,
  getBillingOptionsForMonth
} from "../actions/workspace";

export interface ContentPlannerCalendarProps {
  projects: WorkspaceProject[];
  items: ContentPlannerItem[];
  monthLinks?: WorkspaceMonthLink[];
  onSaveMonthLinks?: () => void;
  sriLankaHolidays?: Record<string, string>;
  selectedProjectId?: number | null;
  onSelectProject?: (projectId: number | null) => void;
  onRefresh?: () => void;
  readOnly?: boolean; // True for client portal (view only)
  clientName?: string;
}

const ACTIVITY_TYPES: { id: ContentPlannerItem['activity_type']; label: string; icon: any; color: string; bg: string; border: string }[] = [
  { id: "shooting", label: "Shooting / Recording", icon: Camera, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  { id: "editing", label: "Editing Period", icon: Film, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30" },
  { id: "upload", label: "Content Upload", icon: Share2, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
  { id: "boosting", label: "Boosting Period", icon: Rocket, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  { id: "work", label: "Work / Strategy", icon: CheckSquare, color: "text-neutral-300", bg: "bg-neutral-500/10", border: "border-neutral-500/30" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  planned: { label: "Planned", color: "text-neutral-300", bg: "bg-neutral-500/20", border: "border-neutral-500/30" },
  in_progress: { label: "In Progress", color: "text-sky-300", bg: "bg-sky-500/20", border: "border-sky-500/30" },
  in_editing: { label: "In Editing", color: "text-purple-300", bg: "bg-purple-500/20", border: "border-purple-500/30" },
  review: { label: "Ready for Review", color: "text-amber-300", bg: "bg-amber-500/20", border: "border-amber-500/30" },
  approved: { label: "Client Approved", color: "text-emerald-300", bg: "bg-emerald-500/20", border: "border-emerald-500/30" },
  scheduled: { label: "Scheduled", color: "text-indigo-300", bg: "bg-indigo-500/20", border: "border-indigo-500/30" },
  published: { label: "Published / Live", color: "text-teal-300", bg: "bg-teal-500/20", border: "border-teal-500/30" },
  boosting_active: { label: "Boosting Active", color: "text-rose-300", bg: "bg-rose-500/20", border: "border-rose-500/30" },
  completed: { label: "Completed", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  cancelled: { label: "Cancelled", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" },
};

// Activity-specific valid work statuses
const ACTIVITY_STATUS_MAP: Record<ContentPlannerItem['activity_type'], ContentPlannerItem['status'][]> = {
  shooting: ["planned", "in_progress", "completed", "cancelled"],
  editing: ["planned", "in_editing", "review", "approved", "completed", "cancelled"],
  upload: ["planned", "review", "approved", "scheduled", "published", "completed", "cancelled"],
  boosting: ["planned", "scheduled", "boosting_active", "completed", "cancelled"],
  work: ["planned", "in_progress", "review", "completed", "cancelled"],
};

// Default status when switching activity type
const ACTIVITY_DEFAULT_STATUS: Record<ContentPlannerItem['activity_type'], ContentPlannerItem['status']> = {
  shooting: "planned",
  editing: "in_editing",
  upload: "planned",
  boosting: "scheduled",
  work: "planned",
};

const PLATFORMS_LIST = ["Instagram", "Facebook", "TikTok", "YouTube", "LinkedIn", "X", "Threads"];
const FORMAT_LIST = ["Reel / Short", "Multiple photos", "Single Image Post", "Story", "Long Video", "Ad Campaign", "Graphic Design"];

const toTimeInputFormat = (timeStr?: string | null) => {
  if (!timeStr) return "";
  const trimmed = timeStr.trim().toUpperCase();
  if (trimmed.includes("AM") || trimmed.includes("PM")) {
    const isPM = trimmed.includes("PM");
    const clean = trimmed.replace("AM", "").replace("PM", "").trim();
    const parts = clean.split(":");
    if (parts.length >= 2) {
      let hours = parseInt(parts[0], 10);
      const minutes = parts[1].padStart(2, "0");
      if (isPM && hours < 12) hours += 12;
      if (!isPM && hours === 12) hours = 0;
      return `${String(hours).padStart(2, "0")}:${minutes}`;
    }
  }
  return timeStr;
};

const formatTimeDisplay = (timeStr?: string | null) => {
  if (!timeStr) return "";
  if (timeStr.toLowerCase().includes("am") || timeStr.toLowerCase().includes("pm")) {
    return timeStr;
  }
  const parts = timeStr.split(":");
  if (parts.length >= 2) {
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    if (!isNaN(hours)) {
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      return `${hours}:${minutes} ${ampm}`;
    }
  }
  return timeStr;
};

export default function ContentPlannerCalendar({
  projects,
  items,
  monthLinks = [],
  onSaveMonthLinks,
  sriLankaHolidays = {},
  selectedProjectId = null,
  onSelectProject,
  onRefresh,
  readOnly = false,
  clientName
}: ContentPlannerCalendarProps) {
  // Navigation: Year & Month
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Default to calendar view mode
  const [viewMode, setViewMode] = useState<"calendar" | "timeline">("calendar");

  // Portal target for client view topbar or admin view topbar
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const [adminPortalNode, setAdminPortalNode] = useState<HTMLElement | null>(null);
  const [adminStatsPortalNode, setAdminStatsPortalNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const updatePortalNodes = () => {
      const clientEl = document.getElementById("client-planner-topbar-portal");
      setPortalNode(clientEl);
      const adminEl = document.getElementById("admin-planner-topbar-portal") || document.getElementById("inpage-planner-topbar-portal");
      setAdminPortalNode(adminEl);
      const statsEl = document.getElementById("admin-planner-stats-portal") || document.getElementById("inpage-planner-stats-portal");
      setAdminStatsPortalNode(statsEl);
    };

    updatePortalNodes();
    const t1 = setTimeout(updatePortalNodes, 60);
    const t2 = setTimeout(updatePortalNodes, 250);
    window.addEventListener("workspace-project:set-tab", updatePortalNodes);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("workspace-project:set-tab", updatePortalNodes);
    };
  }, []);

  // Filter state
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentPlannerItem | null>(null);
  const [selectedDayDetail, setSelectedDayDetail] = useState<{ dateStr: string; items: ContentPlannerItem[]; holiday?: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formProjectId, setFormProjectId] = useState<number>(selectedProjectId || (projects[0]?.id as number) || 0);
  const [formTitle, setFormTitle] = useState("");
  const [formActivityType, setFormActivityType] = useState<ContentPlannerItem['activity_type']>("upload");
  const [formPlatforms, setFormPlatforms] = useState<string[]>(["Instagram"]);
  const [formFormat, setFormFormat] = useState("Reel / Short");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("");
  const [formStatus, setFormStatus] = useState<ContentPlannerItem['status']>("planned");
  const [formCaption, setFormCaption] = useState("");
  const [formDeliverablesUrl, setFormDeliverablesUrl] = useState("");
  const [formBoostingBudget, setFormBoostingBudget] = useState("");
  const [formBoostingCurrency, setFormBoostingCurrency] = useState("USD");
  const [formBoostingTarget, setFormBoostingTarget] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formAssignedTo, setFormAssignedTo] = useState("");

  // Shoot location suggestions state (same location fetcher as event calendar)
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [loadingLocationSuggestions, setLoadingLocationSuggestions] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const locationDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target as Node)) {
        setShowLocationSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!formNotes.trim() || !showLocationSuggestions) {
      setLocationSuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoadingLocationSuggestions(true);
      try {
        const response = await fetch(`/api/location/suggest?q=${encodeURIComponent(formNotes)}`);
        if (response.ok) {
          const data = await response.json().catch(() => null);
          if (Array.isArray(data)) {
            setLocationSuggestions(data);
          }
        }
      } catch (err) {
        console.error("Error fetching location suggestions:", err);
      } finally {
        setLoadingLocationSuggestions(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [formNotes, showLocationSuggestions]);

  // Navigation handlers
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Active Project & Billing Links
  const activeProjectId = selectedProjectId || (projects[0]?.id as number) || formProjectId;
  const activeProject = useMemo(() => {
    return projects.find(p => p.id === activeProjectId) || projects[0] || null;
  }, [projects, activeProjectId]);

  const activeMonthPrefix = useMemo(() => {
    return `${year}-${String(month + 1).padStart(2, "0")}`;
  }, [year, month]);

  const currentMonthBilling = useMemo(() => {
    if (!activeProjectId || !monthLinks || monthLinks.length === 0) return null;
    return monthLinks.find(l => l.project_id === activeProjectId && l.year_month === activeMonthPrefix) || null;
  }, [monthLinks, activeProjectId, activeMonthPrefix]);

  // Billing Modal State
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingSaving, setBillingSaving] = useState(false);
  const [billingInvoiceId, setBillingInvoiceId] = useState<string>("");
  const [billingQuotationId, setBillingQuotationId] = useState<string>("");
  const [billingNotes, setBillingNotes] = useState<string>("");
  const [billingInvoicesList, setBillingInvoicesList] = useState<Array<{ invoice_id: string; project_name?: string; total: number; currency: string; payment_status: string; date: string }>>([]);
  const [billingQuotationsList, setBillingQuotationsList] = useState<Array<{ id: number; client_name?: string; amount: number; status: string; date: string }>>([]);

  const openBillingModal = async () => {
    setIsBillingModalOpen(true);
    setBillingInvoiceId(currentMonthBilling?.invoice_id || "");
    setBillingQuotationId(currentMonthBilling?.quotation_id || "");
    setBillingNotes(currentMonthBilling?.notes || "");
    try {
      setBillingLoading(true);
      const opts = await getBillingOptionsForMonth(activeProjectId);
      setBillingInvoicesList(opts.invoices || []);
      setBillingQuotationsList(opts.quotations || []);
    } catch (e) {
      console.error("Failed to load billing options:", e);
    } finally {
      setBillingLoading(false);
    }
  };

  const handleSaveBillingLinks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProjectId) return;

    try {
      setBillingSaving(true);
      await saveMonthBillingLinks({
        project_id: activeProjectId,
        year_month: activeMonthPrefix,
        invoice_id: billingInvoiceId || null,
        quotation_id: billingQuotationId || null,
        notes: billingNotes.trim() || null,
      });
      setIsBillingModalOpen(false);
      onSaveMonthLinks?.();
      onRefresh?.();
    } catch (e) {
      console.error("Failed to save billing links:", e);
      alert("Failed to save billing links. Please try again.");
    } finally {
      setBillingSaving(false);
    }
  };

  // Filter items by project, activity, status
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedProjectId && item.project_id !== selectedProjectId) return false;
      if (activityFilter !== "all" && item.activity_type !== activityFilter) return false;
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      return true;
    });
  }, [items, selectedProjectId, activityFilter, statusFilter]);

  // Current month's items
  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const currentMonthItems = useMemo(() => {
    return filteredItems.filter((item) => {
      if (item.start_date.startsWith(monthPrefix)) return true;
      if (item.end_date && item.end_date.startsWith(monthPrefix)) return true;
      return false;
    });
  }, [filteredItems, monthPrefix]);

  // Today's Date String and Formatted String for Mobile Today's Plan
  const todayDateStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }, []);

  const todayHoliday = sriLankaHolidays ? sriLankaHolidays[todayDateStr] : undefined;

  const todayFormatted = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }, []);

  const todayPlanItems = useMemo(() => {
    const matching = filteredItems.filter(
      (item) =>
        item.start_date === todayDateStr ||
        (item.end_date && todayDateStr >= item.start_date && todayDateStr <= item.end_date)
    );
    return matching.sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
  }, [filteredItems, todayDateStr]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    let shootingCount = 0;
    let editingCount = 0;
    let uploadCount = 0;
    let boostingCount = 0;
    let workCount = 0;
    const boostingBudgets: Record<string, number> = {};

    currentMonthItems.forEach((i) => {
      if (i.activity_type === "shooting") shootingCount++;
      if (i.activity_type === "editing") editingCount++;
      if (i.activity_type === "upload") uploadCount++;
      if (i.activity_type === "boosting") {
        boostingCount++;
        if (i.boosting_budget && Number(i.boosting_budget) > 0) {
          const curr = (i.boosting_currency || "USD").toUpperCase();
          boostingBudgets[curr] = (boostingBudgets[curr] || 0) + Number(i.boosting_budget);
        }
      }
      if (i.activity_type === "work") workCount++;
    });

    const budgetEntries = Object.entries(boostingBudgets);
    let formattedBudget = "";
    if (budgetEntries.length > 0) {
      formattedBudget = budgetEntries
        .map(([curr, amt]) => {
          if (curr === "USD") {
            return new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: amt % 1 === 0 ? 0 : 2,
            }).format(amt);
          }
          if (curr === "LKR") {
            return new Intl.NumberFormat("en-LK", {
              style: "currency",
              currency: "LKR",
              maximumFractionDigits: 0,
            }).format(amt);
          }
          return `${curr} ${amt.toLocaleString()}`;
        })
        .join(" + ");
    }

    return {
      total: currentMonthItems.length,
      shootingCount,
      editingCount,
      uploadCount,
      boostingCount,
      workCount,
      formattedBudget,
    };
  }, [currentMonthItems]);

  // Calendar Day Generation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    // Adjust for Monday start (0 = Mon, 6 = Sun)
    const adjustedFirstDay = (firstDayIndex + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: {
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      items: ContentPlannerItem[];
      holiday?: string;
    }[] = [];

    const todayStr = new Date().toISOString().split("T")[0];

    const sortDayItems = (items: ContentPlannerItem[]) => {
      return [...items].sort((a, b) => {
        const aMulti = Boolean(a.end_date && a.end_date > a.start_date);
        const bMulti = Boolean(b.end_date && b.end_date > b.start_date);
        // Multi-day items always come first so they align at the same vertical track
        if (aMulti && !bMulti) return -1;
        if (!aMulti && bMulti) return 1;
        // Earliest start date first
        if (a.start_date !== b.start_date) return a.start_date.localeCompare(b.start_date);
        // Longest span first
        const aEnd = a.end_date || a.start_date;
        const bEnd = b.end_date || b.start_date;
        if (aEnd !== bEnd) return bEnd.localeCompare(aEnd);
        return a.id - b.id;
      });
    };

    // Prev month padding
    for (let i = adjustedFirstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevMonthDate = new Date(year, month - 1, d);
      const dateStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        items: sortDayItems(filteredItems.filter(item => item.start_date === dateStr || (item.end_date && dateStr >= item.start_date && dateStr <= item.end_date))),
        holiday: sriLankaHolidays[dateStr],
      });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        items: sortDayItems(filteredItems.filter(item => item.start_date === dateStr || (item.end_date && dateStr >= item.start_date && dateStr <= item.end_date))),
        holiday: sriLankaHolidays[dateStr],
      });
    }

    // Next month padding to fill complete grid of 35 or 42 cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextMonthDate = new Date(year, month + 1, d);
      const dateStr = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        items: sortDayItems(filteredItems.filter(item => item.start_date === dateStr || (item.end_date && dateStr >= item.start_date && dateStr <= item.end_date))),
        holiday: sriLankaHolidays[dateStr],
      });
    }

    return days;
  }, [year, month, filteredItems, sriLankaHolidays]);

  // Form management
  const openNewModal = (defaultDate?: string) => {
    setEditingItem(null);
    setFormProjectId(selectedProjectId || (projects[0]?.id as number) || 0);
    setFormTitle("");
    setFormActivityType("upload");
    setFormPlatforms(["Instagram"]);
    setFormFormat("Reel / Short");
    setFormStartDate(defaultDate || new Date().toISOString().split("T")[0]);
    setFormEndDate("");
    setFormStartTime("");
    setFormStatus("planned");
    setFormCaption("");
    setFormDeliverablesUrl("");
    setFormBoostingBudget("");
    setFormBoostingCurrency("USD");
    setFormBoostingTarget("");
    setFormNotes("");
    setFormAssignedTo("");
    setLocationSuggestions([]);
    setShowLocationSuggestions(false);
    setIsModalOpen(true);
  };

  const openEditModal = (item: ContentPlannerItem) => {
    setEditingItem(item);
    setFormProjectId(item.project_id);
    setFormTitle(item.title);
    setFormActivityType(item.activity_type);
    setFormPlatforms(item.platforms || ["Instagram"]);
    setFormFormat(item.format || "Reel / Short");
    setFormStartDate(item.start_date);
    setFormEndDate(item.end_date || "");
    setFormStartTime(toTimeInputFormat(item.start_time));
    setFormStatus(item.status);
    setFormCaption(item.caption || "");
    setFormDeliverablesUrl(item.deliverables_url || "");
    setFormBoostingBudget(item.boosting_budget ? String(item.boosting_budget) : "");
    setFormBoostingCurrency(item.boosting_currency || "USD");
    setFormBoostingTarget(item.boosting_target || "");
    setFormNotes(item.notes || "");
    setFormAssignedTo(item.assigned_to || "");
    setLocationSuggestions([]);
    setShowLocationSuggestions(false);
    setIsModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formStartDate) return;
    if (!formProjectId) {
      alert("Please select a project.");
      return;
    }

    setSaving(true);
    try {
      const payload: ContentPlannerItem = {
        project_id: Number(formProjectId),
        title: formTitle.trim(),
        activity_type: formActivityType,
        platforms: formPlatforms,
        format: formFormat,
        start_date: formStartDate,
        end_date: formEndDate ? formEndDate : null,
        start_time: formStartTime ? formStartTime : null,
        status: formStatus,
        caption: formCaption.trim() || null,
        deliverables_url: formDeliverablesUrl.trim() || null,
        boosting_budget: formBoostingBudget ? parseFloat(formBoostingBudget) : null,
        boosting_currency: formBoostingCurrency,
        boosting_target: formBoostingTarget.trim() || null,
        notes: formNotes.trim() || null,
        assigned_to: formAssignedTo.trim() || null,
      };

      if (editingItem && editingItem.id) {
        await updateContentPlannerItem(editingItem.id, payload);
      } else {
        await createContentPlannerItem(payload);
      }

      setIsModalOpen(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error("Save error:", err);
      alert(err.message || "Failed to save content planner item.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!confirm("Are you sure you want to delete this content item?")) return;
    try {
      await deleteContentPlannerItem(id);
      if (selectedDayDetail) {
        setSelectedDayDetail(prev => prev ? { ...prev, items: prev.items.filter(i => i.id !== id) } : null);
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete content item.");
    }
  };

  const togglePlatform = (p: string) => {
    setFormPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const formatCurrency = (amount: number, currency: string = "USD") => {
    const curr = (currency || "USD").toUpperCase();
    if (curr === "USD") {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
      }).format(amount);
    }
    if (curr === "LKR") {
      return new Intl.NumberFormat("en-LK", {
        style: "currency",
        currency: "LKR",
        maximumFractionDigits: 0,
      }).format(amount);
    }
    return `${curr} ${amount.toLocaleString()}`;
  };

  const handleActivityTypeChange = (newType: ContentPlannerItem['activity_type']) => {
    setFormActivityType(newType);
    const allowed = ACTIVITY_STATUS_MAP[newType] || (Object.keys(STATUS_CONFIG) as ContentPlannerItem['status'][]);
    if (!allowed.includes(formStatus)) {
      setFormStatus(ACTIVITY_DEFAULT_STATUS[newType] || allowed[0]);
    }
  };


  return (
    <div className="space-y-3 flex flex-col w-full text-white">
      {/* If Topbar Portal exists (Client View), render controls & stats into the sticky Topbar */}
      {portalNode &&
        createPortal(
          <div className="flex items-center justify-end gap-2 sm:gap-3 shrink-0 whitespace-nowrap">
            {/* Month Navigator */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 bg-white/5 border border-white/10 px-1.5 py-1 rounded-xl">
              <button
                onClick={prevMonth}
                className="p-1 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <span className="text-xs sm:text-sm font-bold text-white tracking-wide px-1 sm:px-1.5 min-w-[65px] sm:min-w-[105px] text-center">
                <span className="sm:hidden">{monthNames[month].slice(0, 3)} {year}</span>
                <span className="hidden sm:inline">{monthNames[month]} {year}</span>
              </span>

              <button
                onClick={nextMonth}
                className="p-1 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* View Mode Toggle (Month vs Day View) */}
            <div className="flex items-center gap-0.5 bg-black/40 border border-white/10 p-0.5 rounded-xl shrink-0">
              <button
                onClick={() => setViewMode("calendar")}
                className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  viewMode === "calendar" ? "bg-white/20 text-white shadow font-bold" : "text-gray-400 hover:text-white"
                }`}
                title="Month View"
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Month</span>
              </button>
              <button
                onClick={() => setViewMode("timeline")}
                className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  viewMode === "timeline" ? "bg-white/20 text-white shadow font-bold" : "text-gray-400 hover:text-white"
                }`}
                title="Day View"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Day</span>
              </button>
            </div>

            {/* Full Stats Badges on Extra Large Screens */}
            <div className="hidden xl:flex items-center gap-1.5 shrink-0">
              <div className="bg-emerald-500/[0.08] border border-emerald-500/20 rounded-xl px-2.5 py-1 flex items-center gap-1.5">
                <span className="text-[11px] text-emerald-300">Shoots:</span>
                <span className="text-xs font-bold text-emerald-300">{summaryMetrics.shootingCount}</span>
              </div>

              <div className="bg-purple-500/[0.08] border border-purple-500/20 rounded-xl px-2.5 py-1 flex items-center gap-1.5">
                <span className="text-[11px] text-purple-300">Editing:</span>
                <span className="text-xs font-bold text-purple-300">{summaryMetrics.editingCount}</span>
              </div>

              <div className="bg-blue-500/[0.08] border border-blue-500/20 rounded-xl px-2.5 py-1 flex items-center gap-1.5">
                <span className="text-[11px] text-blue-300">Uploads:</span>
                <span className="text-xs font-bold text-blue-300">{summaryMetrics.uploadCount}</span>
              </div>

              <div className="bg-amber-500/[0.08] border border-amber-500/20 rounded-xl px-2.5 py-1 flex items-center gap-1.5">
                <span className="text-[11px] text-amber-300">Boosting:</span>
                <span className="text-xs font-bold text-amber-300">
                  {summaryMetrics.boostingCount} {summaryMetrics.formattedBudget ? `(${summaryMetrics.formattedBudget})` : ""}
                </span>
              </div>
            </div>

            {/* Medium screen compact summary pill */}
            <div className="hidden sm:flex xl:hidden items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 text-xs shrink-0">
              <span className="font-semibold text-white">{summaryMetrics.total} Items</span>
              {summaryMetrics.boostingCount > 0 && (
                <span className="text-amber-300 font-medium">({summaryMetrics.formattedBudget || `${summaryMetrics.boostingCount} Boost`})</span>
              )}
            </div>

            {/* Linked Quotation / Invoice Pills (Client Portal) */}
            {(currentMonthBilling?.quotation || currentMonthBilling?.invoice) && (
              <div className="flex items-center gap-1.5 shrink-0">
                {currentMonthBilling.quotation && (
                  <a
                    href="/dashboard/quotations"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-500/10 text-purple-300 border border-purple-500/30 hover:bg-purple-500/20 text-xs font-semibold transition-all shrink-0 cursor-pointer"
                    title={`View Quotation #${currentMonthBilling.quotation.id}`}
                  >
                    <span>Quotation #{currentMonthBilling.quotation.id}</span>
                    <span className="text-[10px] uppercase font-bold text-purple-400">({currentMonthBilling.quotation.status})</span>
                    <ExternalLink className="w-3 h-3 text-purple-400/80" />
                  </a>
                )}
                {currentMonthBilling.invoice && (
                  <a
                    href={`/dashboard/invoice/${currentMonthBilling.invoice.invoice_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all shrink-0 cursor-pointer ${
                      currentMonthBilling.invoice.payment_status === 'paid'
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                    }`}
                    title={`View & Pay Invoice #${currentMonthBilling.invoice.invoice_id}`}
                  >
                    <span>Invoice #{currentMonthBilling.invoice.invoice_id}</span>
                    <span className="text-[10px] uppercase font-bold opacity-80">({currentMonthBilling.invoice.payment_status})</span>
                    <ExternalLink className="w-3 h-3 opacity-80" />
                  </a>
                )}
              </div>
            )}
          </div>,
          portalNode
        )}

      {/* If Admin Topbar Portal exists, render Month Switcher, Day/Month Switcher, and Add Item into the Admin Topbar */}
      {adminPortalNode &&
        createPortal(
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap">
            {/* Month Navigator */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 bg-white/5 border border-white/10 px-1.5 py-1 rounded-xl">
              <button
                onClick={prevMonth}
                className="p-1 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <span className="text-xs sm:text-sm font-bold text-white tracking-wide px-1 sm:px-1.5 min-w-[65px] sm:min-w-[105px] text-center">
                <span className="sm:hidden">{monthNames[month].slice(0, 3)} {year}</span>
                <span className="hidden sm:inline">{monthNames[month]} {year}</span>
              </span>

              <button
                onClick={nextMonth}
                className="p-1 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* View Mode Toggle (Month vs Day View) */}
            <div className="flex items-center gap-0.5 bg-black/40 border border-white/10 p-0.5 rounded-xl shrink-0">
              <button
                onClick={() => setViewMode("calendar")}
                className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  viewMode === "calendar" ? "bg-white/20 text-white shadow font-bold" : "text-gray-400 hover:text-white"
                }`}
                title="Month View"
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Month</span>
              </button>
              <button
                onClick={() => setViewMode("timeline")}
                className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  viewMode === "timeline" ? "bg-white/20 text-white shadow font-bold" : "text-gray-400 hover:text-white"
                }`}
                title="Day View"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Day</span>
              </button>
            </div>

            {/* Add Item Button */}
            {!readOnly && (
              <button
                onClick={() => openNewModal()}
                className="bg-brand-600 hover:bg-brand-500 text-white font-semibold py-1.5 px-2.5 sm:px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs shadow-md shadow-brand-600/20 transition-all cursor-pointer active:scale-95 shrink-0"
                title="Add Content Planner Item"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Add Item</span>
              </button>
            )}
          </div>,
          adminPortalNode
        )}

      {/* If Admin Stats Portal exists, render Statuses (clickable -> ?tab=tasks) and Link Button */}
      {adminStatsPortalNode &&
        createPortal(
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 whitespace-nowrap">
            {/* Statuses Strip - Display metrics without link */}
            <div className="flex items-center gap-1.5 shrink-0 select-none">
              <div className="bg-emerald-500/[0.08] border border-emerald-500/20 rounded-xl px-2.5 py-1 flex items-center gap-1.5">
                <span className="text-[11px] text-emerald-400">Shooting:</span>
                <span className="text-xs font-bold text-emerald-300">{summaryMetrics.shootingCount} Days</span>
              </div>

              <div className="bg-purple-500/[0.08] border border-purple-500/20 rounded-xl px-2.5 py-1 flex items-center gap-1.5">
                <span className="text-[11px] text-purple-400">Editing:</span>
                <span className="text-xs font-bold text-purple-300">{summaryMetrics.editingCount} Items</span>
              </div>

              <div className="bg-blue-500/[0.08] border border-blue-500/20 rounded-xl px-2.5 py-1 flex items-center gap-1.5">
                <span className="text-[11px] text-blue-400">Uploads:</span>
                <span className="text-xs font-bold text-blue-300">{summaryMetrics.uploadCount} Posts</span>
              </div>

              <div className="bg-amber-500/[0.08] border border-amber-500/20 rounded-xl px-2.5 py-1 flex items-center gap-1.5">
                <span className="text-[11px] text-amber-400">Boosting:</span>
                <span className="text-xs font-bold text-amber-300">
                  {summaryMetrics.boostingCount} {summaryMetrics.formattedBudget ? `(${summaryMetrics.formattedBudget})` : ""}
                </span>
              </div>
            </div>

            {/* Link Invoice / Quotation / Billing Badges */}
            <div className="flex items-center gap-1.5 shrink-0">
              {currentMonthBilling?.quotation && (
                <a
                  href={readOnly ? "/dashboard/quotations" : "/admin/quotations"}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-500/10 text-purple-300 border border-purple-500/30 hover:bg-purple-500/20 text-xs font-semibold transition-all shrink-0 cursor-pointer"
                  title={`View Quotation #${currentMonthBilling.quotation.id}`}
                >
                  <span>Quotation #{currentMonthBilling.quotation.id}</span>
                  <span className="text-[10px] uppercase font-bold text-purple-400">({currentMonthBilling.quotation.status})</span>
                  <ExternalLink className="w-3 h-3 text-purple-400/80" />
                </a>
              )}

              {currentMonthBilling?.invoice && (
                <a
                  href={readOnly ? `/dashboard/invoice/${currentMonthBilling.invoice.invoice_id}` : "/admin/invoices"}
                  target="_blank"
                  rel="noreferrer"
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all shrink-0 cursor-pointer ${
                    currentMonthBilling.invoice.payment_status === 'paid' || currentMonthBilling.invoice.payment_status === 'fully_paid'
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                  }`}
                  title={`View Invoice #${currentMonthBilling.invoice.invoice_id}`}
                >
                  <span>Invoice #{currentMonthBilling.invoice.invoice_id.replace(/^INV-/, '')}</span>
                  <span className="text-[10px] uppercase font-bold opacity-80">
                    ({currentMonthBilling.invoice.payment_status === 'fully_paid' ? 'Paid' : currentMonthBilling.invoice.payment_status})
                  </span>
                  <ExternalLink className="w-3 h-3 opacity-80" />
                </a>
              )}

              {!readOnly && (
                <button
                  type="button"
                  onClick={openBillingModal}
                  className="inline-flex items-center px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-semibold transition-colors cursor-pointer shrink-0"
                  title="Link or edit invoice and quotation for this month"
                >
                  <span>{currentMonthBilling?.invoice || currentMonthBilling?.quotation ? "Edit Billing" : "Link Invoice / Quotation"}</span>
                </button>
              )}
            </div>
          </div>,
          adminStatsPortalNode
        )}

      {/* Fallback In-Page Top Controls Card (when not portaled to layout header) */}
      {!portalNode && !adminPortalNode && (
        <div className="bg-[#111115] border border-white/10 rounded-2xl p-2.5 sm:px-4 sm:py-3 shadow-xl backdrop-blur-xl">
          <div className="flex flex-col gap-2.5 pb-2.5 border-b border-white/10">
            {/* Top Row: Month Navigation + Project Title + Right Controls */}
            <div className="flex items-center justify-between gap-2 w-full">
              {/* Month Navigator */}
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                <button
                  onClick={prevMonth}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-1 sm:gap-1.5 px-1">
                  <span className="text-xs sm:text-base font-bold text-white tracking-wide min-w-[100px] sm:min-w-[120px] text-center">
                    {monthNames[month]} {year}
                  </span>
                </div>

                <button
                  onClick={nextMonth}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Billing Badges & Link Button */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {currentMonthBilling?.quotation && (
                  <a
                    href={readOnly ? "/dashboard/quotations" : "/admin/quotations"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-500/10 text-purple-300 border border-purple-500/30 hover:bg-purple-500/20 text-xs font-semibold transition-all shrink-0 cursor-pointer"
                    title={`View Quotation #${currentMonthBilling.quotation.id}`}
                  >
                    <span>Quotation #{currentMonthBilling.quotation.id}</span>
                    <span className="text-[10px] uppercase font-bold text-purple-400">({currentMonthBilling.quotation.status})</span>
                    <ExternalLink className="w-3 h-3 text-purple-400/80" />
                  </a>
                )}

                {currentMonthBilling?.invoice && (
                  <a
                    href={readOnly ? `/dashboard/invoice/${currentMonthBilling.invoice.invoice_id}` : "/admin/invoices"}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all shrink-0 cursor-pointer ${
                      currentMonthBilling.invoice.payment_status === 'paid'
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                    }`}
                    title={`View Invoice #${currentMonthBilling.invoice.invoice_id}`}
                  >
                    <span>Invoice #{currentMonthBilling.invoice.invoice_id}</span>
                    <span className="text-[10px] uppercase font-bold opacity-80">({currentMonthBilling.invoice.payment_status})</span>
                    <ExternalLink className="w-3 h-3 opacity-80" />
                  </a>
                )}

                {!readOnly && (
                  <button
                    onClick={openBillingModal}
                    className="inline-flex items-center px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-semibold transition-colors cursor-pointer shrink-0"
                    title="Link or edit invoice and quotation for this month"
                  >
                    <span>{currentMonthBilling?.invoice || currentMonthBilling?.quotation ? "Edit Billing" : "Link Invoice / Quotation"}</span>
                  </button>
                )}
              </div>

              {/* Right Controls: View Mode, Add Item */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* View Mode Toggle (Month vs Day View) */}
                <div className="flex items-center gap-0.5 bg-black/40 border border-white/10 p-0.5 rounded-xl">
                  <button
                    onClick={() => setViewMode("calendar")}
                    className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                      viewMode === "calendar" ? "bg-white/20 text-white shadow font-bold" : "text-gray-400 hover:text-white"
                    }`}
                    title="Month View"
                  >
                    <CalendarIcon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Month</span>
                  </button>
                  <button
                    onClick={() => setViewMode("timeline")}
                    className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                      viewMode === "timeline" ? "bg-white/20 text-white shadow font-bold" : "text-gray-400 hover:text-white"
                    }`}
                    title="Day View"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Day</span>
                  </button>
                </div>

                {!readOnly && (
                  <button
                    onClick={() => openNewModal()}
                    className="bg-brand-600 hover:bg-brand-500 text-white font-semibold py-1.5 px-2.5 sm:px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs shadow-md shadow-brand-600/20 transition-all cursor-pointer active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Add Item</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Compact Micro-Stats Strip (Always Visible, Compact) */}
          <div className="pt-2 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-2.5">
            <div className="bg-emerald-500/[0.05] border border-emerald-500/15 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-1">
              <span className="text-emerald-400 text-[11px] truncate font-medium">Shooting</span>
              <span className="text-xs font-bold text-emerald-300 shrink-0">{summaryMetrics.shootingCount} Days</span>
            </div>

            <div className="bg-purple-500/[0.05] border border-purple-500/15 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-1">
              <span className="text-purple-400 text-[11px] truncate font-medium">Editing</span>
              <span className="text-xs font-bold text-purple-300 shrink-0">{summaryMetrics.editingCount} Items</span>
            </div>

            <div className="bg-blue-500/[0.05] border border-blue-500/15 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-1">
              <span className="text-blue-400 text-[11px] truncate font-medium">Uploads</span>
              <span className="text-xs font-bold text-blue-300 shrink-0">{summaryMetrics.uploadCount} Posts</span>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-amber-500/[0.05] border border-amber-500/15 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-1">
              <span className="text-amber-400 text-[11px] truncate font-medium">Boosting</span>
              <span className="text-xs font-bold text-amber-300 shrink-0">
                {summaryMetrics.boostingCount} {summaryMetrics.formattedBudget ? `(${summaryMetrics.formattedBudget})` : "Periods"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main View: Calendar vs Timeline */}
      {viewMode === "calendar" ? (
        <div className="space-y-3.5">
          <div className="bg-[#111115] border border-white/10 rounded-3xl p-1.5 sm:p-5 shadow-2xl backdrop-blur-xl overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span className="text-amber-400/80">Sat</span>
            <span className="text-amber-400/80">Sun</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarDays.map((day, idx) => {
              const hasHoliday = Boolean(day.holiday);
              const itemCount = day.items.length;

              return (
                <div
                  key={`${day.dateStr}-${idx}`}
                  onClick={() => {
                    if (itemCount > 0 || hasHoliday || !readOnly) {
                      setSelectedDayDetail({ dateStr: day.dateStr, items: day.items, holiday: day.holiday });
                    }
                  }}
                  className={`min-h-[86px] sm:min-h-[120px] md:min-h-[135px] p-1 sm:p-2 rounded-xl sm:rounded-2xl border transition-all cursor-pointer flex flex-col justify-start gap-1 overflow-visible ${
                    day.isCurrentMonth ? "bg-black/40 border-white/5 hover:border-white/20 hover:bg-white/[0.04]" : "bg-black/15 border-white/[0.02] opacity-30"
                  } ${day.isToday ? "ring-2 ring-brand-500/60 bg-brand-500/[0.07]" : ""} ${
                    hasHoliday ? "bg-amber-500/[0.03] border-amber-500/20" : ""
                  }`}
                >
                  {/* Top Bar: Date & Holiday Pill */}
                  <div className="flex items-center justify-between gap-0.5 sm:gap-1 w-full h-5 sm:h-7 shrink-0">
                    <span
                      className={`text-[11px] sm:text-sm font-semibold rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center shrink-0 ${
                        day.isToday ? "bg-brand-500 text-white font-bold shadow-sm shadow-brand-500/30" : day.isCurrentMonth ? "text-gray-200" : "text-gray-600"
                      }`}
                    >
                      {day.dayNumber}
                    </span>

                    {/* Sri Lanka Holiday Tag */}
                    {hasHoliday && (
                      <>
                        {/* Mobile: Compact holiday pill in top bar so it doesn't shift event strip row alignment */}
                        <span
                          className="sm:hidden inline-flex items-center gap-0.5 text-[7px] leading-none px-1 py-0.5 rounded-[4px] bg-amber-500/20 text-amber-300 font-bold truncate max-w-[36px] border border-amber-500/30 shrink-0"
                          title={`Holiday: ${day.holiday}`}
                        >
                          <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                          <span className="truncate">{day.holiday}</span>
                        </span>

                        {/* Desktop Holiday Tag */}
                        <span
                          className="hidden sm:inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-medium truncate max-w-[85px] border border-amber-500/30"
                          title={day.holiday}
                        >
                          <span className="font-semibold">Holiday:</span>
                          <span className="truncate">{day.holiday}</span>
                        </span>
                      </>
                    )}
                  </div>

                  {/* Desktop Badges / Items for this day with Direct Work Status */}
                  <div className="hidden sm:flex flex-col mt-1 space-y-1.5 overflow-visible flex-1 justify-start">
                    {day.items.slice(0, 3).map((item) => {
                      const act = ACTIVITY_TYPES.find(a => a.id === item.activity_type) || ACTIVITY_TYPES[2];
                      const stat = STATUS_CONFIG[item.status] || STATUS_CONFIG.planned;

                      const isMulti = Boolean(item.end_date && item.end_date > item.start_date);
                      const colIndex = idx % 7;
                      const isEventStart = day.dateStr === item.start_date;
                      const isEventEnd = day.dateStr === item.end_date;
                      const isRowStart = colIndex === 0;
                      const isRowEnd = colIndex === 6;

                      const isSegmentStart = !isMulti || isEventStart || isRowStart;
                      const isSegmentEnd = !isMulti || isEventEnd || isRowEnd;
                      const isSegmentMiddle = isMulti && !isSegmentStart && !isSegmentEnd;

                      let stripShapeClasses = "rounded-xl border mx-0";
                      if (isMulti) {
                        if (isSegmentStart && !isSegmentEnd) {
                          stripShapeClasses = "rounded-l-xl rounded-r-none border-y border-l border-r-0 mr-[-14px] z-10 relative";
                        } else if (isSegmentMiddle) {
                          stripShapeClasses = "rounded-none border-y border-x-0 ml-[-14px] mr-[-14px] z-10 relative";
                        } else if (!isSegmentStart && isSegmentEnd) {
                          stripShapeClasses = "rounded-r-xl rounded-l-none border-y border-r border-l-0 ml-[-14px] z-10 relative";
                        }
                      }

                      return (
                        <div
                          key={item.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDayDetail({ dateStr: day.dateStr, items: day.items, holiday: day.holiday });
                          }}
                          className={`group/item text-[10px] sm:text-[11px] p-1.5 h-[52px] font-medium flex flex-col justify-between transition-all bg-[#131317] ${act.bg} ${act.color} ${act.border} ${stripShapeClasses} ${
                            isMulti ? "hover:brightness-110" : "hover:scale-[1.02] hover:shadow-lg"
                          }`}
                          title={`${item.title} • Status: ${stat.label}${isMulti ? ` (${item.start_date} to ${item.end_date})` : ""}`}
                        >
                          <div className="flex items-center gap-1.5 w-full min-w-0">
                            <span className="truncate flex-1 font-semibold text-white pl-0.5">
                              {item.title}
                            </span>
                          </div>

                          {/* Work Status Badge Shown Directly in Calendar */}
                          <div className="flex items-center justify-between gap-1 w-full min-w-0">
                            <span className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-md font-semibold border ${stat.bg} ${stat.color} ${stat.border}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${stat.color.replace('text-', 'bg-') || 'bg-gray-400'}`} />
                              <span className="truncate max-w-[80px]">{stat.label}</span>
                            </span>
                            {isMulti ? (
                              <span className="text-[9px] font-semibold text-white/50 tracking-wider hidden lg:inline shrink-0">
                                {isSegmentStart && !isSegmentEnd ? "Starts \u2192" : !isSegmentStart && isSegmentEnd ? "\u2022 Ends" : "\u2192"}
                              </span>
                            ) : (
                              item.start_time && (
                                <span className="text-[9px] text-gray-400 shrink-0 hidden lg:inline">
                                  {formatTimeDisplay(item.start_time)}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {itemCount > 3 && (
                      <span className="text-[10px] font-semibold text-gray-400 pl-1">
                        +{itemCount - 3} more
                      </span>
                    )}
                  </div>

                  {/* Mobile View: Event Preview Chips & Connected Multi-day Strips */}
                  <div className="sm:hidden flex flex-col gap-1 w-full min-w-0 flex-1 overflow-visible pt-0.5">
                    {day.items.slice(0, 3).map((item) => {
                      const stat = STATUS_CONFIG[item.status] || STATUS_CONFIG.planned;
                      const isCompleted = item.status === "completed" || item.status === "approved" || item.status === "published";

                      const isMulti = Boolean(item.end_date && item.end_date > item.start_date);
                      const colIndex = idx % 7;
                      const isEventStart = day.dateStr === item.start_date;
                      const isEventEnd = day.dateStr === item.end_date;
                      const isRowStart = colIndex === 0;
                      const isRowEnd = colIndex === 6;

                      const isSegmentStart = !isMulti || isEventStart || isRowStart;
                      const isSegmentEnd = !isMulti || isEventEnd || isRowEnd;
                      const isSegmentMiddle = isMulti && !isSegmentStart && !isSegmentEnd;

                      // Solid theme colors to ensure clean continuous strip blending across column gaps
                      let chipBg = "bg-neutral-900";
                      let chipText = "text-neutral-300";
                      let chipBorder = "border-neutral-700/60";

                      if (item.activity_type === "shooting") {
                        chipBg = "bg-[#062d1f]";
                        chipText = "text-emerald-300";
                        chipBorder = "border-emerald-500/50";
                      } else if (item.activity_type === "editing") {
                        chipBg = "bg-[#25103a]";
                        chipText = "text-purple-300";
                        chipBorder = "border-purple-500/50";
                      } else if (item.activity_type === "boosting") {
                        chipBg = "bg-[#2d1b06]";
                        chipText = "text-amber-300";
                        chipBorder = "border-amber-500/50";
                      } else if (item.activity_type === "upload") {
                        chipBg = "bg-[#0c1f38]";
                        chipText = "text-blue-300";
                        chipBorder = "border-blue-500/50";
                      }

                      // Strip shape and negative margins to link multi-day events across cells
                      let mobileShapeClasses = "rounded-[4px] border mx-0";
                      if (isMulti) {
                        if (isSegmentStart && !isSegmentEnd) {
                          mobileShapeClasses = "rounded-l-[5px] rounded-r-none border-y border-l border-r-0 mr-[-8px] z-10 relative";
                        } else if (isSegmentMiddle) {
                          mobileShapeClasses = "rounded-none border-y border-x-0 ml-[-7px] mr-[-8px] z-10 relative";
                        } else if (!isSegmentStart && isSegmentEnd) {
                          mobileShapeClasses = "rounded-r-[5px] rounded-l-none border-y border-r border-l-0 ml-[-7px] z-10 relative";
                        }
                      }

                      return (
                        <div
                          key={item.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDayDetail({ dateStr: day.dateStr, items: day.items, holiday: day.holiday });
                          }}
                          className={`h-[18px] text-[8px] leading-tight px-1 py-0.5 font-semibold flex items-center gap-1 shadow-sm shrink-0 ${chipBg} ${chipText} ${chipBorder} ${mobileShapeClasses} ${
                            isCompleted ? "opacity-85" : ""
                          }`}
                          title={`${item.title} (${stat.label})${isMulti ? ` • ${item.start_date} to ${item.end_date}` : ""}`}
                        >
                          {isSegmentStart ? (
                            <>
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${stat.color.replace('text-', 'bg-') || 'bg-current'}`} />
                              <span className="truncate font-bold text-white/95 leading-none">
                                {item.title}
                              </span>
                            </>
                          ) : isSegmentMiddle ? (
                            <span className="text-[7px] font-bold text-white/35 tracking-widest mx-auto leading-none select-none">
                              •••
                            </span>
                          ) : (
                            <span className="truncate font-bold text-white/90 leading-none pl-0.5">
                              {item.title}
                            </span>
                          )}
                        </div>
                      );
                    })}

                    {/* Overflow count if more items exist */}
                    {day.items.length > 3 && (
                      <span className="text-[7.5px] font-bold text-gray-400 pl-0.5 leading-none shrink-0">
                        +{day.items.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Client-side Mobile View: Today's Plan section in the empty bottom area */}
        {readOnly && (
          <div className="sm:hidden space-y-2.5 pb-8">
            <div className="flex items-center justify-between px-1 pt-1">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
                </span>
                <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                  <span>Today&apos;s Plan</span>
                  <span className="text-gray-400 font-normal text-xs">({todayFormatted})</span>
                </h3>
              </div>
              {todayHoliday && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 truncate max-w-[140px]">
                  {todayHoliday}
                </span>
              )}
            </div>

            {todayPlanItems.length > 0 ? (
              <div className="space-y-2">
                {todayPlanItems.map((item) => {
                  const act = ACTIVITY_TYPES.find((a) => a.id === item.activity_type) || ACTIVITY_TYPES[2];
                  const stat = STATUS_CONFIG[item.status] || STATUS_CONFIG.planned;

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedDayDetail({ dateStr: todayDateStr, items: todayPlanItems, holiday: todayHoliday });
                      }}
                      className="bg-[#111115] border border-white/10 rounded-2xl p-3.5 space-y-2.5 shadow-lg active:scale-[0.99] transition-all cursor-pointer"
                    >
                      {/* Top Row: Title & Status */}
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-white tracking-tight leading-snug">
                            {item.title}
                          </h4>
                          {item.notes && (
                            <div className="text-[11px] text-gray-300 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                              <span className="truncate">{item.notes}</span>
                            </div>
                          )}
                        </div>
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border shrink-0 ${stat.bg} ${stat.color} ${stat.border}`}>
                          {stat.label}
                        </span>
                      </div>

                      {/* Labels Row: Activity Type, Format, Time, Platforms */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${act.bg} ${act.color} ${act.border}`}>
                          {act.label}
                        </span>
                        {item.format && (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] bg-white/5 text-gray-300 border border-white/10">
                            {item.format}
                          </span>
                        )}
                        {item.start_time && (
                          <span className="text-[11px] text-gray-300 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gray-400" />
                            {formatTimeDisplay(item.start_time)}
                          </span>
                        )}
                        {item.platforms && item.platforms.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1">
                            {item.platforms.map((p) => (
                              <span key={p} className="px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-brand-500/10 text-brand-300 border border-brand-500/20">
                                {p}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Boosting info if boosting */}
                      {item.activity_type === "boosting" && (item.boosting_budget || item.boosting_target) && (
                        <div className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex flex-wrap items-center gap-2">
                          {item.boosting_budget && (
                            <span className="font-semibold">
                              Budget: {formatCurrency(Number(item.boosting_budget), item.boosting_currency || "USD")}
                            </span>
                          )}
                          {item.boosting_target && <span>Goal: {item.boosting_target}</span>}
                        </div>
                      )}

                      {/* Deliverables URL Button */}
                      {item.deliverables_url && (
                        <a
                          href={item.deliverables_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Preview Creative / Asset</span>
                        </a>
                      )}

                      {/* Caption preview if any */}
                      {item.caption && (
                        <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] text-gray-300">
                          <span className="font-semibold text-gray-400 block mb-0.5">Caption:</span>
                          <p className="whitespace-pre-line line-clamp-2">{item.caption}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-[#111115] border border-white/10 rounded-2xl p-5 text-center text-gray-400 space-y-1 shadow-lg">
                <Sparkles className="w-6 h-6 text-gray-500 mx-auto mb-1" />
                <p className="text-xs font-semibold text-white">No plans scheduled for today</p>
                <p className="text-[11px] text-gray-400">
                  {todayHoliday ? `Enjoy the ${todayHoliday} holiday!` : "Check upcoming dates on your calendar above."}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      ) : (
        /* Timeline / Agenda List View (Mobile-First!) */
        <div className="space-y-4">
          {calendarDays
            .filter((d) => d.isCurrentMonth && (d.items.length > 0 || d.holiday))
            .map((day) => {
              const dateObj = new Date(day.dateStr + "T00:00:00");
              const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" });
              const formattedDate = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

              return (
                <div
                  key={day.dateStr}
                  className={`bg-[#111115] border rounded-3xl p-4 sm:p-5 shadow-xl transition-all ${
                    day.isToday ? "border-brand-500/50 ring-1 ring-brand-500/30" : "border-white/10"
                  }`}
                >
                  {/* Date Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base sm:text-lg font-bold text-white">{dayName}, {formattedDate}</span>
                      {day.isToday && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-500 text-white">
                          Today
                        </span>
                      )}
                    </div>

                    {!readOnly && (
                      <button
                        onClick={() => openNewModal(day.dateStr)}
                        className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1 px-2.5 py-1 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Event</span>
                      </button>
                    )}
                  </div>

                  {/* Sri Lanka Holiday Banner */}
                  {day.holiday && (
                    <div className="mb-3 px-3 py-2 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center gap-2 text-xs sm:text-sm text-amber-300 font-semibold">
                      <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-amber-500/30 text-amber-200">Holiday</span>
                      <span>Sri Lanka Holiday: {day.holiday}</span>
                    </div>
                  )}

                  {/* Items for this date */}
                  <div className="space-y-3">
                    {day.items.map((item) => {
                      const act = ACTIVITY_TYPES.find(a => a.id === item.activity_type) || ACTIVITY_TYPES[2];
                      const stat = STATUS_CONFIG[item.status] || STATUS_CONFIG.planned;

                      return (
                        <div
                          key={item.id}
                          className="bg-black/50 border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-all flex flex-col gap-3"
                        >
                          {/* Top Row: Name on top with larger font, location below title, and Status on right top */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                                {item.title}
                              </h3>
                              {/* Location below title */}
                              {item.notes && (
                                <div className="text-xs text-gray-300 flex items-center gap-1.5 mt-1">
                                  <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                  <span className="truncate">{item.notes}</span>
                                </div>
                              )}
                            </div>

                            {/* Status on right top (+ admin actions) */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className={`px-2.5 py-1 rounded-xl text-xs font-semibold border ${stat.bg} ${stat.color} ${stat.border}`}>
                                {stat.label}
                              </span>

                              {!readOnly && (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => openEditModal(item)}
                                    className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                                    title="Edit"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => item.id && handleDeleteItem(item.id)}
                                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Labels: Activity Type, Format, Time, Platforms */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2.5 py-1 rounded-xl text-xs font-semibold border ${act.bg} ${act.color} ${act.border}`}>
                              {act.label}
                            </span>

                            {item.format && (
                              <span className="px-2 py-0.5 rounded-lg text-[11px] bg-white/5 text-gray-300 border border-white/10">
                                {item.format}
                              </span>
                            )}

                            {item.start_time && (
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-gray-500" />
                                {formatTimeDisplay(item.start_time)}
                              </span>
                            )}

                            {item.platforms && item.platforms.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5">
                                {item.platforms.map((p) => (
                                  <span key={p} className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-brand-500/10 text-brand-300 border border-brand-500/20">
                                    {p}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Boosting Details */}
                          {item.activity_type === "boosting" && (item.boosting_budget || item.boosting_target) && (
                            <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex flex-wrap items-center gap-3">
                              {item.boosting_budget && (
                                <span className="font-semibold flex items-center gap-1">
                                  <DollarSign className="w-3.5 h-3.5" />
                                  Budget: {formatCurrency(Number(item.boosting_budget), item.boosting_currency || "USD")}
                                </span>
                              )}
                              {item.boosting_target && (
                                <span>Goal: {item.boosting_target}</span>
                              )}
                              {item.end_date && (
                                <span className="text-amber-400/80">Period: {item.start_date} to {item.end_date}</span>
                              )}
                            </div>
                          )}

                          {/* Deliverables URL Button */}
                          {item.deliverables_url && (
                            <div className="pt-1">
                              <a
                                href={item.deliverables_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 transition-colors cursor-pointer"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Preview Creative / Video Asset</span>
                              </a>
                            </div>
                          )}

                          {/* Caption / Notes */}
                          {item.caption && (
                            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-gray-300">
                              <span className="font-semibold text-gray-400 block mb-1">Caption / Copy:</span>
                              <p className="whitespace-pre-line line-clamp-3">{item.caption}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

          {calendarDays.filter((d) => d.isCurrentMonth && (d.items.length > 0 || d.holiday)).length === 0 && (
            <div className="bg-[#111115] border border-white/10 rounded-3xl p-8 text-center text-gray-400">
              <Sparkles className="w-8 h-8 text-gray-500 mx-auto mb-2" />
              <p className="text-base font-semibold text-white">No content planner items for {monthNames[month]} {year}</p>
              <p className="text-xs text-gray-400 mt-1">Switch to previous or next month, or add your first shooting, editing, or upload date.</p>
              {!readOnly && (
                <button
                  onClick={() => openNewModal()}
                  className="mt-4 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Content
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Day Detail Modal / Bottom Sheet Drawer (when clicking a calendar date) */}
      {selectedDayDetail && (
        <div
          data-lenis-prevent
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setSelectedDayDetail(null)}
        >
          <div
            data-lenis-prevent
            className="bg-[#121217] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200 sm:zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Indicator */}
            <div className="sm:hidden w-12 h-1 bg-white/20 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>Schedule for {selectedDayDetail.dateStr}</span>
                </h3>
                {selectedDayDetail.holiday && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-300 font-semibold mt-1">
                    <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-amber-500/30 text-amber-200">Holiday</span>
                    <span>{selectedDayDetail.holiday}</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedDayDetail(null)}
                className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 custom-scrollbar flex-1">
              {selectedDayDetail.items.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <CalendarIcon className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-sm font-medium">No content scheduled on this date.</p>
                </div>
              ) : (
                selectedDayDetail.items.map((item) => {
                  const act = ACTIVITY_TYPES.find(a => a.id === item.activity_type) || ACTIVITY_TYPES[2];
                  const stat = STATUS_CONFIG[item.status] || STATUS_CONFIG.planned;

                  return (
                    <div
                      key={item.id}
                      className="bg-black/60 border border-white/10 rounded-2xl p-4 flex flex-col gap-3"
                    >
                      {/* Top Row: Name on top with larger font, location below title, and Status on right top */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                            {item.title}
                          </h4>
                          {/* Location below title */}
                          {item.notes && (
                            <div className="text-xs text-gray-300 flex items-center gap-1.5 mt-1">
                              <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              <span>{item.notes}</span>
                            </div>
                          )}
                        </div>

                        {/* Status on right top (+ admin actions) */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`px-2.5 py-1 rounded-xl text-xs font-semibold border ${stat.bg} ${stat.color} ${stat.border}`}>
                            {stat.label}
                          </span>

                          {!readOnly && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setSelectedDayDetail(null);
                                  openEditModal(item);
                                }}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => item.id && handleDeleteItem(item.id)}
                                className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Labels Row: Activity Type, Format, Time, Platforms */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-1 rounded-xl text-xs font-semibold border ${act.bg} ${act.color} ${act.border}`}>
                          {act.label}
                        </span>

                        {item.format && (
                          <span className="px-2 py-0.5 rounded-lg text-[11px] bg-white/5 text-gray-300 border border-white/10">
                            {item.format}
                          </span>
                        )}

                        {item.start_time && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gray-500" />
                            {formatTimeDisplay(item.start_time)}
                          </span>
                        )}

                        {item.platforms && item.platforms.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {item.platforms.map((p) => (
                              <span key={p} className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-brand-500/10 text-brand-300 border border-brand-500/20">
                                {p}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {item.deliverables_url && (
                        <a
                          href={item.deliverables_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 transition-colors mt-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open Preview Asset</span>
                        </a>
                      )}

                      {item.caption && (
                        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-gray-300">
                          <p className="whitespace-pre-line">{item.caption}</p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            {!readOnly && (
              <div className="p-4 border-t border-white/10 bg-black/40 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    const d = selectedDayDetail.dateStr;
                    setSelectedDayDetail(null);
                    openNewModal(d);
                  }}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add to this date
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDayDetail(null)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-gray-300 rounded-xl text-xs font-medium"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin Add / Edit Item Modal */}
      {!readOnly && isModalOpen && (
        <div data-lenis-prevent className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div data-lenis-prevent className="bg-[#121217] border border-white/15 rounded-3xl w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-white/10 flex items-center justify-between bg-black/40 shrink-0">
              <h3 className="text-base sm:text-lg font-bold text-white">
                {editingItem ? "Edit Content Planner Item" : "Create New Content / Activity"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form in 2-Column Wide Layout to Eliminate Scrolling */}
            <form onSubmit={handleSaveItem} className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 flex flex-col justify-between">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                {/* Left Column: Project, Core Concept, Schedule, Team */}
                <div className="space-y-3.5">
                  {/* Project Select */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Project *</label>
                    <select
                      value={formProjectId}
                      onChange={(e) => setFormProjectId(Number(e.target.value))}
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-brand-500 cursor-pointer"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id} className="bg-[#18181b] text-white">
                          {p.name} {p.client_name ? `(${p.client_name})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Title / Concept */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Title / Post Concept *</label>
                    <input
                      type="text"
                      required
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  {/* Activity Type & Status */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Activity Type *</label>
                      <select
                        value={formActivityType}
                        onChange={(e) => handleActivityTypeChange(e.target.value as any)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-brand-500 cursor-pointer"
                      >
                        <option value="upload" className="bg-[#18181b] text-white">Content Upload Day</option>
                        <option value="shooting" className="bg-[#18181b] text-white">Recording / Shooting Day</option>
                        <option value="editing" className="bg-[#18181b] text-white">Editing Period</option>
                        <option value="boosting" className="bg-[#18181b] text-white">Boosting / Ads Period</option>
                        <option value="work" className="bg-[#18181b] text-white">Work / Strategy / Task</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Work Status *</label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as any)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-brand-500 cursor-pointer"
                      >
                        {(ACTIVITY_STATUS_MAP[formActivityType] || (Object.keys(STATUS_CONFIG) as ContentPlannerItem['status'][])).map((key) => {
                          const v = STATUS_CONFIG[key];
                          if (!v) return null;
                          return (
                            <option key={key} value={key} className="bg-[#18181b] text-white">
                              {v.label}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  {/* Dates & Time */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Start Date *</label>
                      <input
                        type="date"
                        required
                        value={formStartDate}
                        onChange={(e) => setFormStartDate(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1 truncate">
                        End Date <span className="text-gray-500 text-[10px]">(Opt)</span>
                      </label>
                      <input
                        type="date"
                        value={formEndDate}
                        onChange={(e) => setFormEndDate(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1 truncate">
                        Time <span className="text-gray-500 text-[10px]">(Call/Post)</span>
                      </label>
                      <input
                        type="time"
                        value={formStartTime}
                        onChange={(e) => setFormStartTime(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Format & Assigned Crew */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Format</label>
                      <select
                        value={formFormat}
                        onChange={(e) => setFormFormat(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-brand-500 cursor-pointer"
                      >
                        {FORMAT_LIST.map((f) => (
                          <option key={f} value={f} className="bg-[#18181b] text-white">{f}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Assigned To / Crew</label>
                      <input
                        type="text"
                        value={formAssignedTo}
                        onChange={(e) => setFormAssignedTo(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>

                  {/* Platforms */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Platforms</label>
                    <div className="flex flex-wrap gap-1.5">
                      {PLATFORMS_LIST.map((p) => {
                        const selected = formPlatforms.includes(p);
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => togglePlatform(p)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                              selected
                                ? "bg-brand-600 text-white shadow-md shadow-brand-600/20 font-semibold"
                                : "bg-white/5 border border-white/10 text-gray-400 hover:text-white"
                            }`}
                          >
                            {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right Column: Deliverables, Copy, Location/Notes, Boosting */}
                <div className="space-y-3.5">
                  {/* Deliverables URL */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Deliverables / Preview URL <span className="text-gray-500 font-normal">(Google Drive)</span>
                    </label>
                    <input
                      type="url"
                      value={formDeliverablesUrl}
                      onChange={(e) => setFormDeliverablesUrl(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  {/* Caption / Script */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Caption / Script Draft / Copy
                    </label>
                    <textarea
                      rows={3}
                      value={formCaption}
                      onChange={(e) => setFormCaption(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-brand-500 resize-y min-h-[80px]"
                    />
                  </div>

                  {/* Shoot Location / Notes with Live Location Fetcher */}
                  <div className="relative" ref={locationDropdownRef}>
                    <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center justify-between">
                      <span>Shoot Location / Crew Notes / Props</span>
                      {loadingLocationSuggestions && (
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin text-brand-400" />
                          Searching...
                        </span>
                      )}
                    </label>

                    <div className="relative">
                      <input
                        type="text"
                        value={formNotes}
                        onChange={(e) => {
                          setFormNotes(e.target.value);
                          setShowLocationSuggestions(true);
                        }}
                        onFocus={() => setShowLocationSuggestions(true)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-brand-500"
                      />
                      {loadingLocationSuggestions && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-brand-500 border-t-transparent" />
                        </div>
                      )}
                    </div>

                    {showLocationSuggestions && locationSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto rounded-2xl border border-white/10 bg-[#161618] p-1 shadow-2xl backdrop-blur-xl custom-scrollbar">
                        {locationSuggestions.map((item, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => {
                              setFormNotes(item.name || item.display_name);
                              setShowLocationSuggestions(false);
                            }}
                            className="w-full rounded-xl px-3 py-2 text-left text-xs text-gray-200 hover:bg-white/10 transition-colors focus:outline-none flex flex-col gap-0.5 cursor-pointer"
                          >
                            <span className="font-semibold text-white flex items-center gap-1.5">
                              <MapPin className="w-3 h-3 text-brand-400 shrink-0" />
                              {item.name || "Location"}
                            </span>
                            {item.display_name && item.display_name !== item.name && (
                              <span className="text-[11px] text-gray-400 truncate w-full pl-4.5">{item.display_name}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Boosting specifics (if boosting) */}
                  {formActivityType === "boosting" && (
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2.5 animate-in fade-in duration-150">
                      <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                        Boosting Campaign Details
                      </div>
                      <div className="grid grid-cols-3 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-medium text-gray-300 mb-1">Budget</label>
                          <input
                            type="number"
                            value={formBoostingBudget}
                            onChange={(e) => setFormBoostingBudget(e.target.value)}
                            className="w-full bg-black/50 border border-white/15 rounded-xl px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-gray-300 mb-1">Currency</label>
                          <select
                            value={formBoostingCurrency}
                            onChange={(e) => setFormBoostingCurrency(e.target.value)}
                            className="w-full bg-black/50 border border-white/15 rounded-xl px-2.5 py-1.5 text-xs text-white cursor-pointer"
                          >
                            <option value="USD" className="bg-[#18181b] text-white">USD ($)</option>
                            <option value="LKR" className="bg-[#18181b] text-white">LKR (Rs.)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-gray-300 mb-1">Target / Goal</label>
                          <input
                            type="text"
                            value={formBoostingTarget}
                            onChange={(e) => setFormBoostingTarget(e.target.value)}
                            className="w-full bg-black/50 border border-white/15 rounded-xl px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 text-gray-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-brand-600/30 transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                >
                  {saving ? "Saving..." : editingItem ? "Update Item" : "Create Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link Invoice & Quotation Modal (Admin Only) */}
      {isBillingModalOpen && (
        <div data-lenis-prevent className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div data-lenis-prevent className="bg-[#121217] border border-white/10 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02] shrink-0">
              <div>
                <h3 className="text-base font-bold text-white">
                  Link Billing to Month
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {activeProject?.name || "Project"} | {activeProject?.client_name || activeProject?.client_company || "Client"} | {monthNames[month]} {year}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBillingModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            {billingLoading ? (
              <div className="p-8 flex flex-col items-center justify-center gap-2 text-center flex-1">
                <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
                <p className="text-xs text-gray-400 font-medium">Loading quotations and invoices...</p>
              </div>
            ) : (
              <form onSubmit={handleSaveBillingLinks} className="flex flex-col flex-1 overflow-hidden min-h-0">
                <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
                  {/* Quotation Selector */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Linked Quotation
                  </label>
                  <select
                    value={billingQuotationId}
                    onChange={(e) => setBillingQuotationId(e.target.value)}
                    className="w-full bg-[#18181f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="">(None / No Quotation Linked)</option>
                    {billingQuotationsList.map((q) => (
                      <option key={q.id} value={String(q.id)} className="bg-[#18181f] text-white">
                        Quotation #{q.id} | {q.client_name || "Quotation"} | LKR {q.amount.toLocaleString()} | {q.status} ({q.date})
                      </option>
                    ))}
                  </select>
                  {billingQuotationsList.length === 0 ? (
                    <p className="text-[11px] text-gray-500 mt-1">No quotations found for this client.</p>
                  ) : null}
                </div>

                {/* Invoice Selector */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Linked Invoice
                  </label>
                  <select
                    value={billingInvoiceId}
                    onChange={(e) => setBillingInvoiceId(e.target.value)}
                    className="w-full bg-[#18181f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="">(None / No Invoice Linked)</option>
                    {billingInvoicesList.map((inv) => (
                      <option key={inv.invoice_id} value={inv.invoice_id} className="bg-[#18181f] text-white">
                        Invoice #{inv.invoice_id} | {inv.project_name || "Invoice"} | {inv.currency} {inv.total.toLocaleString()} | {inv.payment_status} ({inv.date})
                      </option>
                    ))}
                  </select>
                  {billingInvoicesList.length === 0 ? (
                    <p className="text-[11px] text-gray-500 mt-1">No invoices found for this client.</p>
                  ) : null}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-white/10 shrink-0 bg-[#0c0c0e] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setBillingInvoiceId("");
                    setBillingQuotationId("");
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Clear Links
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBillingModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={billingSaving}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {billingSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>Save Links</span>
                  </button>
                </div>
              </div>
            </form>
          )}
          </div>
        </div>
      )}
    </div>
  );
}

