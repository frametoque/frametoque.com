"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useUser, SignOutButton } from "@clerk/nextjs";
import {
  motion,
  AnimatePresence,
  type Transition,
  type Variants,
} from "framer-motion";
import DateRangeSelector from "./components/DateRangeSelector";
import { AdminDateRangeProvider, useAdminDateRange } from "./context/AdminDateRangeContext";
import { AnalyticsDateRangeProvider, useAnalyticsDateRange } from "./context/AnalyticsDateRangeContext";

import {
  Bell,
  Menu,
  Search,
  LayoutDashboard,
  Wallet,
  Receipt,
  FileText,
  Users, Package,
  BarChart3,
  LogOut,
  X,
  ChevronLeft,
  ChevronRight,
  NotepadTextDashed,
  FolderOpenDot,
  Briefcase,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
  FilePenLine,
  ChartLine,
  Calendar,
  CalendarPlus,
  Plus,
  ExternalLink,
  Clock,
  Globe,
  RefreshCw,
  Server,
  Settings,
  DollarSign,
  Download,
  Cloud,
  Megaphone,
  BookOpen,
  Landmark
} from "lucide-react";

// Framer Motion spring config for sidebar width
const sidebarSpring = {
  type: "spring",
  stiffness: 280,
  damping: 28,
  mass: 0.8,
} as const;

// Fade + slide config for labels
const labelVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -8,
    width: 0,
  },
  visible: {
    opacity: 1,
    x: 0,
    width: "auto",
    transition: {
      duration: 0.2,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    x: -8,
    width: 0,
    transition: {
      duration: 0.15,
      ease: "easeIn",
    },
  },
};

export default function DashboardLayout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [ignoreHover, setIgnoreHover] = useState(false);

  useEffect(() => {
    const match = document.cookie.match(/(?:^|; )sidebar-collapsed=([^;]*)/);
    const saved = match ? match[1] === "true" : false;
    setCollapsed(saved);
    setMounted(true);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      document.cookie = `sidebar-collapsed=${next}; path=/; max-age=31536000; SameSite=Lax`;
      if (next) {
        setIgnoreHover(true);
      }
      return next;
    });
  };

  // On desktop, the sidebar is visually expanded if it is not collapsed,
  // OR if the user is hovering over it while it is collapsed.
  const desktopExpanded = !collapsed || (sidebarHovered && !ignoreHover);

  const { user, isLoaded } = useUser();

  return (
    <AnalyticsDateRangeProvider>
    <AdminDateRangeProvider>
      <div className="min-h-screen bg-black text-white">
        <Sidebar
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          collapsed={collapsed}
          toggleCollapsed={toggleCollapsed}
          sidebarHovered={sidebarHovered}
          setSidebarHovered={setSidebarHovered}
          ignoreHover={ignoreHover}
          setIgnoreHover={setIgnoreHover}
          desktopExpanded={desktopExpanded}
        />

        {/* Content padding is driven by the *persistent* collapsed state, not hover, so layout doesn't shift on hover */}
        <motion.div
          animate={{ paddingLeft: collapsed ? 80 : 200 }}
          transition={sidebarSpring}
          className="min-h-screen lg:block hidden"
        >
          <Header user={user} isLoaded={isLoaded} setMobileMenuOpen={setMobileMenuOpen} />
          <main className="p-4 sm:p-6 lg:p-8">{children}</main>
        </motion.div>

        {/* Mobile: no left padding */}
        <div className="lg:hidden">
          <Header user={user} isLoaded={isLoaded} setMobileMenuOpen={setMobileMenuOpen} />
          <main className="p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </AdminDateRangeProvider>
    </AnalyticsDateRangeProvider>
  );
}

// ------------------ Header ------------------
const Header = ({ user, isLoaded, setMobileMenuOpen }) => {
  const pathname = usePathname();
  const isAnalytics = pathname === "/admin/analytics";
  const isBookings = pathname === "/admin/bookings";
  const isClients = pathname === "/admin/clients";
  const isInventory = pathname === "/admin/inventory";
  const isInvoiceDetail = pathname.startsWith("/admin/invoice/");
  const isServices = pathname === "/admin/services";
  const isPortfolio = pathname === "/admin/portfolio";
  const isWebServices = pathname.startsWith("/admin/web-services");
  const isSocialMedia = pathname.startsWith("/admin/social-media");
  const isAgreements = pathname.startsWith("/admin/agreements");
  const isDashboard = pathname === "/admin/dashboard";
  const isAccounts = pathname.startsWith("/admin/accounts");
  const hideSelector = isServices || isPortfolio || isBookings || isWebServices || isInvoiceDetail || isSocialMedia || isDashboard || isAccounts;
  const { dateRange: analyticsDateRange, setDateRange: setAnalyticsDateRange } = useAnalyticsDateRange();
  const { dateRange, startDate, endDate, setDateRange, setStartDate, setEndDate } = useAdminDateRange();
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [activeVisitors, setActiveVisitors] = useState(0);
  const [weather, setWeather] = useState<{ city: string; temp: string; condition: string; iconUrl: string } | null>(null);
  const [bookingForecasts, setBookingForecasts] = useState<any[]>([]);
  const [headerSearchTerm, setHeaderSearchTerm] = useState("");
  const isReports = pathname === "/admin/reports";
  const [reportsActiveTab, setReportsActiveTab] = useState("overview");
  const [reportsFormattedDate, setReportsFormattedDate] = useState("");
  const [dynamicTitle, setDynamicTitle] = useState("");

  useEffect(() => {
    const handleUpdateTitle = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setDynamicTitle(customEvent.detail);
    };
    window.addEventListener("update-title", handleUpdateTitle);
    return () => {
      window.removeEventListener("update-title", handleUpdateTitle);
    };
  }, []);

  useEffect(() => {
    setDynamicTitle("");
  }, [pathname]);

  useEffect(() => {
    const handleTabChange = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setReportsActiveTab(customEvent.detail);
    };
    const handleDateChange = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setReportsFormattedDate(customEvent.detail);
    };
    window.addEventListener("reports:tab-change", handleTabChange);
    window.addEventListener("reports:formatted-date", handleDateChange);
    return () => {
      window.removeEventListener("reports:tab-change", handleTabChange);
      window.removeEventListener("reports:formatted-date", handleDateChange);
    };
  }, []);

  const getPageTitle = (path: string): string => {
    if (path === "/admin" || path === "/admin/dashboard") return "Dashboard";
    if (path.startsWith("/admin/analytics")) return "Analytics";
    if (path.startsWith("/admin/bookings")) return "Bookings";
    if (path === "/admin/clients") return "Clients";
    if (path === "/admin/inventory") return "Inventory";
    if (path.startsWith("/admin/clients/")) return "Client Details";
    if (path.startsWith("/admin/invoice/")) {
      const parts = path.split("/");
      const id = parts[parts.length - 1];
      return id ? `Invoice #${id}` : "Invoice Details";
    }
    if (path === "/admin/invoices/new") return "New Invoice";
    if (path.startsWith("/admin/invoices/") && path.endsWith("/edit")) return "Edit Invoice";
    if (path.startsWith("/admin/invoices")) return "Invoices";
    if (path === "/admin/quotations/new") return "New Quotation";
    if (path.startsWith("/admin/quotations/") && path.endsWith("/edit")) return "Edit Quotation";
    if (path.startsWith("/admin/quotations")) return "Quotations";
    if (path.startsWith("/admin/income")) return "Income";
    if (path.startsWith("/admin/expenses")) return "Expenses";
    if (path.startsWith("/admin/accounts")) return "Accounts";
    if (path.startsWith("/admin/reports")) return "Reports";
    if (path.startsWith("/admin/portfolio")) return "Portfolio";
    if (path.startsWith("/admin/services")) return "Services";
    if (path.startsWith("/admin/settings")) return "Settings";
    if (path === "/admin/agreements/new") return "New Agreement";
    if (path.startsWith("/admin/agreements/") && path.endsWith("/edit")) return "Edit Agreement";
    if (path.startsWith("/admin/agreements")) return "Agreements";
    if (path.startsWith("/admin/web-services")) return "Web Services";
    if (path.startsWith("/admin/social-media")) return "Social Media";
        return "Admin";
  };

  useEffect(() => {
    const pageTitle = getPageTitle(pathname);
    document.title = `${pageTitle} | Frametoque`;
  }, [pathname]);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      
      const timeStr = now.toLocaleTimeString("en-US", {
        timeZone: "Asia/Colombo",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      });
      
      const dateStr = now.toLocaleDateString("en-US", {
        timeZone: "Asia/Colombo",
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric"
      });

      setCurrentTime(timeStr);
      setCurrentDate(dateStr);
    };
    updateDateTime();
    const clockInterval = setInterval(updateDateTime, 1000);

    const fetchWeatherData = async () => {
      try {
        const res = await fetch("/api/admin/weather");
        if (res.ok) {
          const data = await res.json();
          if (data.activeVisitors !== undefined) {
            setActiveVisitors(data.activeVisitors);
          }
          if (data.weather) {
            setWeather(data.weather);
          }
          if (data.bookingForecasts) {
            setBookingForecasts(data.bookingForecasts);
          }
        }
      } catch (e) {
        console.error("Failed to fetch weather status:", e);
      }
    };
    fetchWeatherData();
    const weatherInterval = setInterval(fetchWeatherData, 5 * 60 * 1000);

    return () => {
      clearInterval(clockInterval);
      clearInterval(weatherInterval);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-white/10 h-20 flex-shrink-0 flex items-center">
      <div className="w-full flex items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Left Side: Title & Date Selector */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 hover:bg-white/10 rounded-3xl"
          >
            <Menu className="w-6 h-6" />
          </button>
          {/* Page Title */}
          <h1 className="text-xl font-bold text-white tracking-tight">

            {dynamicTitle || getPageTitle(pathname)}
          </h1>

          {/* View Page button / Refresh button */}
          {hideSelector && (
            <>
              <span className="hidden sm:block w-[1px] h-5 bg-white/15" />

              {pathname === "/admin/social-media/new" && (
                <div className="flex items-center gap-2 text-gray-400">
                  <Link href="/admin/social-media" className="p-1.5 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center hover:text-white" title="Go Back">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
                  </Link>
                  <span className="text-sm font-semibold tracking-tight text-gray-300">Create New Post</span>
                </div>
              )}
              {isInvoiceDetail ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent("invoice:create-income"))}
                    className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-3xl font-semibold transition-colors active:scale-95 duration-200 cursor-pointer text-xs whitespace-nowrap"
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>Create Income</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent("invoice:download-pdf"))}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-brand-600 to-brand-700 hover:opacity-90 text-white rounded-3xl font-semibold transition-opacity active:scale-95 duration-200 cursor-pointer text-xs whitespace-nowrap"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PDF</span>
                  </button>
                </div>
              ) : isWebServices ? (
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent("web-services:open-add"))}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 border border-transparent text-white rounded-xl font-medium transition-colors cursor-pointer text-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New</span>
                </button>
              ) : isSocialMedia ? (
                
  <div className="flex items-center gap-3">
    {pathname !== "/admin/social-media/new" && (<>
    <Link href="/admin/social-media/new" className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-3xl font-semibold transition-colors active:scale-95 duration-200 cursor-pointer text-xs whitespace-nowrap">
      <Plus className="w-4 h-4" />
      Publish New Post
    </Link>
    
    </>)}
  </div>
              ) : isBookings ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent("bookings:open-new-event"))}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 border border-transparent text-white rounded-xl font-medium transition-colors cursor-pointer text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Booking</span>
                  </button>
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent("bookings:open-subscribe"))}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl font-medium transition-colors cursor-pointer text-sm"
                  >
                    <CalendarPlus className="w-4 h-4 text-brand-400" />
                    <span>Sync with your calendar</span>
                  </button>
                </div>
              ) : isAccounts ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent("accounts:open-transfer"))}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors cursor-pointer text-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Transfer Cash</span>
                  </button>
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent("accounts:open-create"))}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-medium transition-colors cursor-pointer text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Account</span>
                  </button>
                </div>
              ) : (
                <a
                  href={isDashboard ? "/" : isServices ? "/services" : "/work"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl font-medium transition-colors text-sm"
                >
                  <ExternalLink className="w-4 h-4 text-brand-400" />
                  View Page
                </a>
              )}
            </>
          )}

          {!hideSelector && (
            <>
              {/* Divider */}
              <span className="hidden sm:block w-[1px] h-5 bg-white/15" />

              {/* Range Selector */}
              <div className="flex items-center">
                {isAnalytics ? (
                  <div className="relative flex items-center">
                    <select
                      value={analyticsDateRange}
                      onChange={(e) => setAnalyticsDateRange(e.target.value as any)}
                      className="bg-white/5 border border-white/10 rounded-xl pl-4 pr-10 py-2 outline-none focus:border-brand-500 transition-colors appearance-none cursor-pointer text-sm font-medium text-white"
                    >
                      <option value="today"        className="bg-black">Today</option>
                      <option value="24 hours"     className="bg-black">Last 24 Hours</option>
                      <option value="one month"    className="bg-black">Last Month</option>
                      <option value="three months" className="bg-black">Last 3 Months</option>
                      <option value="6 months"     className="bg-black">Last 6 Months</option>
                      <option value="this year"    className="bg-black">This Year</option>
                      <option value="all time"     className="bg-black">All Time</option>
                    </select>
                    <span className="absolute right-4 pointer-events-none text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <path d="m6 9 6 6 6-6"/>
                      </svg>
                    </span>
                  </div>
                ) : isBookings ? (
              <div className="flex gap-2">
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent("bookings:open-subscribe"))}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl font-medium transition-colors cursor-pointer text-sm"
                >
                  <CalendarPlus className="w-4 h-4 text-brand-500" />
                  <span className="hidden sm:inline">Sync with Your Calendar</span>
                </button>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent("bookings:open-new-event"))}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-brand-600 hover:bg-brand-500 border border-transparent text-white rounded-xl font-medium transition-colors active:scale-95 duration-200 cursor-pointer text-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Event</span>
                  <span className="sm:hidden">Add</span>
                </button>
              </div>
                ) : (isClients || isInventory) ? (
                  <div className="flex items-center gap-3">
                    <div className="relative w-32 sm:w-64">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search..."
                        value={headerSearchTerm}
                        onChange={(e) => {
                          const val = e.target.value;
                          setHeaderSearchTerm(val);
                          window.dispatchEvent(new CustomEvent(isInventory ? "inventory:search" : "clients:search", { detail: val }));
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-2 outline-none focus:border-brand-500 transition-colors text-sm text-white"
                      />
                    </div>
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent(isInventory ? "inventory:open-new" : "clients:open-new"))}
                      className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-3xl font-semibold transition-colors active:scale-95 duration-200 cursor-pointer text-xs whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" />
                      {isInventory ? "Add Item" : "Add Client"}
                    </button>
                  </div>
                ) : isReports && reportsActiveTab === "trial_balance" ? (
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent("reports:toggle-datepicker"))}
                    className="bg-white/5 border border-white/10 hover:border-white/20 active:bg-white/10 rounded-xl px-4 py-2 text-xs text-white flex items-center gap-2 transition-all cursor-pointer shadow-sm select-none"
                  >
                    <Calendar className="w-4 h-4 text-brand-400" />
                    <span className="font-semibold text-gray-400">As of:</span>
                    <span className="font-bold">{reportsFormattedDate || "Select Date"}</span>
                  </button>
                ) : (
                  <DateRangeSelector
                    dateRange={dateRange}
                    startDate={startDate}
                    endDate={endDate}
                    onRangeChange={setDateRange}
                    onStartDateChange={setStartDate}
                    onEndDateChange={setEndDate}
                  />
                )}
              </div>
            </>
          )}
        </div>

        {/* Right Side: System Stats */}
        <div className="hidden xl:flex items-center gap-5 text-sm text-gray-400">
          {/* Live Visitors Status - Show only if > 0 */}
          {activeVisitors > 0 && (
            <>
              <div className="flex items-center gap-2 text-gray-300">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400/70 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-medium flex items-center gap-1">
                  <span className="text-gray-400">Live:</span>
                  <span className="font-semibold text-white/90">{activeVisitors} {activeVisitors === 1 ? "visitor" : "visitors"}</span>
                </span>
              </div>
              <span className="w-1 h-1 rounded-full bg-white/20" />
            </>
          )}

          {/* Current Time */}
          <div className="flex items-center gap-1.5 text-gray-300">
            <Clock className="w-3.5 h-3.5 text-gray-500" />
            <span className="font-medium tabular-nums">{currentTime || "Loading..."}</span>
          </div>

          <span className="w-1 h-1 rounded-full bg-white/20" />

          {/* Current Date (showing Day Name e.g. Fri, Sat, Sun) */}
          <div className="flex items-center gap-1.5 text-gray-300">
            <Calendar className="w-3.5 h-3.5 text-gray-500" />
            <span className="font-medium">{currentDate || "Loading..."}</span>
          </div>

          {weather && (
            <>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <div className="relative group flex items-center gap-1.5 text-gray-300 py-1">
                <span className="text-gray-400">{weather.city}:</span>
                <span className="font-semibold text-white/90">{weather.temp}</span>
                {weather.iconUrl && (
                  <img 
                    src={weather.iconUrl} 
                    alt={weather.condition} 
                    className="w-5 h-5 object-contain flex-shrink-0"
                    title={weather.condition}
                  />
                )}

                {/* Custom Dialog Box on Hover */}
                {bookingForecasts && bookingForecasts.length > 0 && (
                  <div className="absolute right-0 top-full mt-3 w-96 bg-[#0c0c0e] border border-white/10 rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] opacity-0 invisible scale-95 group-hover:opacity-100 group-hover:visible group-hover:scale-100 transition-all duration-300 z-50 pointer-events-none group-hover:pointer-events-auto before:absolute before:-top-3 before:left-0 before:right-0 before:h-3">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                      <div>
                        <h4 className="text-sm font-bold text-white">Upcoming Bookings Weather</h4>
                        <p className="text-[10px] text-gray-400 mt-0.5">Predicted weather at the venues</p>
                      </div>
                      <span className="px-2.5 py-0.5 text-[9px] font-semibold bg-brand-500/10 border border-brand-500/20 text-brand-400 rounded-full">
                        3 Days Forecast
                      </span>
                    </div>

                    {/* Booking list */}
                    <div className="space-y-4">
                      {bookingForecasts.map((bf, idx) => (
                        <div key={idx} className="bg-white/5 border border-white/5 rounded-2xl p-3.5 hover:bg-white/10 transition-colors">
                          <div className="flex justify-between items-start gap-3">
                            <div className="min-w-0 flex-1">
                              <h5 className="text-xs font-bold text-white truncate">{bf.title}</h5>
                              <p className="text-[10px] text-gray-400 truncate mt-0.5">{bf.location}</p>
                              <div className="flex items-center gap-1.5 mt-2">
                                <span className="px-2 py-0.5 rounded bg-white/5 text-[9px] font-medium text-gray-300">
                                  {bf.date}
                                </span>
                                {bf.startTime && (
                                  <span className="px-2 py-0.5 rounded bg-white/5 text-[9px] font-medium text-gray-300">
                                    {bf.startTime}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {bf.weather ? (
                              <div className="flex flex-col items-end shrink-0">
                                <div className="flex items-center gap-1">
                                  <img src={bf.weather.iconUrl} alt={bf.weather.condition} className="w-8 h-8 object-contain" />
                                  <span className="text-sm font-bold text-white">{bf.weather.tempMax}</span>
                                </div>
                                <div className="text-right mt-1">
                                  <div className="flex items-center gap-1 justify-end">
                                    <span className="text-[9px] text-gray-400">Precipitation:</span>
                                    <span className="text-[9px] font-semibold text-blue-400">{bf.weather.precipitation}</span>
                                  </div>
                                  {/* Precipitation progress bar */}
                                  <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden mt-1 ml-auto">
                                    <div 
                                      className="h-full bg-blue-400 rounded-full" 
                                      style={{ width: bf.weather.precipitation }}
                                    />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-500 self-center shrink-0">No forecast data</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

      </div>
    </header>
  );
};

// ------------------ Sidebar Component (Module Level) ------------------
const Sidebar = ({
  mobileMenuOpen,
  setMobileMenuOpen,
  collapsed,
  toggleCollapsed,
  sidebarHovered,
  setSidebarHovered,
  ignoreHover,
  setIgnoreHover,
  desktopExpanded,
}: {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  collapsed: boolean;
  toggleCollapsed: () => void;
  sidebarHovered: boolean;
  setSidebarHovered: (hovered: boolean) => void;
  ignoreHover: boolean;
  setIgnoreHover: (ignore: boolean) => void;
  desktopExpanded: boolean;
}) => {
  const pathname = usePathname();
  const { user, isLoaded } = useUser();
  const isSettingsActive = pathname.startsWith("/admin/settings");

  const links: { name: string; href: string; icon: any; divider?: boolean; newtab?: boolean }[] = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Income", href: "/admin/income", icon: Wallet },
    { name: "Expenses", href: "/admin/expenses", icon: Receipt },
    { name: "Accounts", href: "/admin/accounts", icon: Landmark, divider: false },
    { name: "Invoices", href: "/admin/invoices", icon: FileText, divider: true },
    { name: "Quotations", href: "/admin/quotations", icon: NotepadTextDashed },
    { name: "Agreements", href: "/admin/agreements", icon: FilePenLine },
    { name: "Bookings", href: "/admin/bookings", icon: Calendar },
    { name: "Web Services", href: "/admin/web-services", icon: Globe, divider: false },
    { name: "Clients", href: "/admin/clients", icon: Users },
    { name: "Inventory", href: "/admin/inventory", icon: Package },
    { name: "Reports", href: "/admin/reports", icon: BarChart3, divider: true },
    { name: "Analytics", href: "/admin/analytics", icon: ChartLine },
    { name: "Services", href: "/admin/services", icon: Briefcase },
    { name: "Portfolio", href: "/admin/portfolio", icon: Layers },
    { name: "Social Media", href: "/admin/social-media", icon: Megaphone, divider: false },
  ];

  const isActive = (href: string) => {
    if (href === "/admin/dashboard") return pathname === href;
    if (href === "/admin/invoices") {
      return pathname.startsWith("/admin/invoices") || pathname.startsWith("/admin/invoice");
    }
    return pathname.startsWith(href);
  };

  const sidebarSpring = {
    type: "spring",
    stiffness: 280,
    damping: 28,
    mass: 0.8,
  } as const;

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        onMouseEnter={() => {
          if (collapsed && !ignoreHover) {
            setSidebarHovered(true);
          }
        }}
        onMouseLeave={() => {
          if (collapsed) {
            setSidebarHovered(false);
            setIgnoreHover(false);
          }
        }}
        animate={{
          width: desktopExpanded ? 200 : 80,
          x: mobileMenuOpen ? 0 : undefined,
        }}
        transition={sidebarSpring}
        className={`fixed top-0 left-0 h-full bg-black backdrop-blur-xl border-r border-white/10 z-50
          w-64
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
        style={{ overflow: "hidden" }}
      >
        <div className="flex flex-col h-full">

          {/* Logo + Collapse toggle */}
          <div className="flex items-center justify-between border-b border-white/10 h-20 flex-shrink-0 overflow-hidden px-4">

            {desktopExpanded ? (
              <>
                <div className="flex-1 flex justify-start overflow-hidden">
                  <Link href="/" className="lg:block">
                    <Image
                      src="/logos/ft/name-logo.png"
                      alt="Frametoque"
                      width={125}
                      height={25}
                      className="h-[25px] w-[125px] flex-shrink-0 animate-fade-in"
                    />
                  </Link>
                </div>
                
                {/* Desktop: collapse toggle button */}
                <button
                  onClick={toggleCollapsed}
                  className="hidden lg:flex items-center justify-center p-2 hover:bg-white/10 rounded-3xl ml-auto text-gray-400 hover:text-white transition-colors cursor-pointer"
                  title="Collapse Sidebar"
                >
                  <PanelLeftClose className="w-5 h-5" />
                </button>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center relative group w-full h-full">
                {/* Default collapsed: Logo */}
                <div className="group-hover:opacity-0 transition-opacity duration-150 flex items-center justify-center">
                  <Image
                    src="/logos/ft/logo.png"
                    alt="Logo"
                    width={32}
                    height={32}
                    className="w-8 h-8 flex-shrink-0 object-contain"
                  />
                </div>
                {/* Hover collapsed: lock toggle button */}
                <button
                  onClick={toggleCollapsed}
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center p-2 hover:bg-white/10 rounded-3xl text-gray-300 hover:text-white transition-all duration-150 cursor-pointer"
                  title="Expand Sidebar"
                >
                  <PanelLeftOpen className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Mobile: close button */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-2 hover:bg-white/10 rounded-3xl ml-auto"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav links */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto min-h-0">
            {links.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <div key={item.href}>
                  {item.divider && (
                    <div className="my-2 border-t border-white/10" />
                  )}
                  {item.name === "Services" && (
                    <div className="my-4 border-t border-white/10" />
                  )}
                  <Link
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    target={item.newtab ? "_blank" : "_self"}
                    className={`flex items-center gap-3 pl-[14px] pr-3 py-2.5 rounded-3xl transition-colors duration-150 overflow-hidden w-full justify-start
                      ${active
                        ? "bg-white text-black font-semibold"
                        : "text-gray-300 hover:bg-white/5"
                      }`}
                  >
                    <span className="flex-shrink-0">
                      <Icon className="w-5 h-5" />
                    </span>

                    {desktopExpanded && (
                      <span className="hidden lg:block overflow-hidden whitespace-nowrap text-sm">
                        {item.name}
                      </span>
                    )}
                    {/* Always visible on mobile */}
                    <span className="lg:hidden">{item.name}</span>
                  </Link>
                </div>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-white/10 flex items-center justify-between gap-2">
            <Link href="/admin/settings" className="flex-1 min-w-0">
              <div
                className={`flex items-center gap-3 py-2.5 px-3 rounded-2xl w-full transition-colors duration-150
                  ${isSettingsActive
                    ? "text-brand-400 font-semibold"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
              >
                <Settings className="w-5 h-5 flex-shrink-0" />
                {desktopExpanded && (
                  <span className="hidden lg:block text-sm truncate">Settings</span>
                )}
                <span className="lg:hidden text-sm truncate">Settings</span>
              </div>
            </Link>

            <SignOutButton redirectUrl="/login">
              <button
                className="flex items-center justify-center p-2.5 text-gray-400 hover:text-red-400 rounded-xl transition-colors hover:bg-red-500/10 flex-shrink-0"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </SignOutButton>
          </div>
        </div>
      </motion.aside>
    </>
  );
};