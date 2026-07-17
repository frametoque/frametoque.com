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
import NotificationBell from "./components/NotificationBell";
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
  Users,
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
  Calendar
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

  // ------------------ Sidebar ------------------
  const Sidebar = ({ mobileMenuOpen, setMobileMenuOpen, collapsed, toggleCollapsed, sidebarHovered, setSidebarHovered }) => {
    const pathname = usePathname();
    const { user, isLoaded } = useUser();

    const links: { name: string; href: string; icon: any; newtab?: boolean }[] = [
      { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      { name: "Income", href: "/admin/income", icon: Wallet },
      { name: "Expenses", href: "/admin/expenses", icon: Receipt },
      { name: "Bookings", href: "/admin/bookings", icon: Calendar },
      { name: "Invoices", href: "/admin/invoices", icon: FileText },
      { name: "Quotations", href: "/admin/quotations", icon: NotepadTextDashed },
      { name: "Agreements", href: "/admin/agreements", icon: FilePenLine },
      { name: "Clients", href: "/admin/clients", icon: Users },
      { name: "Reports", href: "/admin/reports", icon: BarChart3 },
      { name: "Web Analytics", href: "/admin/analytics", icon: ChartLine },
      { name: "Services", href: "/admin/services", icon: Briefcase },
      { name: "Portfolio", href: "/admin/portfolio", icon: Layers },
    ];

    const isActive = (href: string) => {
      if (href === "/admin/dashboard") return pathname === href;
      if (href === "/admin/invoices") {
        return pathname.startsWith("/admin/invoices") || pathname.startsWith("/admin/invoice");
      }
      return pathname.startsWith(href);
    };

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
            width: desktopExpanded ? 220 : 80,
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
                        width={145}
                        height={29}
                        className="h-[29px] w-[145px] flex-shrink-0 animate-fade-in"
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
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {links.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <div key={item.href}>
                    {item.name === "Services" && (
                      <div className="my-4 border-t border-white/10" />
                    )}
                    <Link
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      target={item.newtab ? "_blank" : "_self"}
                      className={`flex items-center gap-3 pl-[14px] pr-3 py-3 rounded-3xl transition-colors duration-150 overflow-hidden w-full justify-start
                        ${active
                          ? "bg-white text-black font-semibold"
                          : "text-gray-300 hover:bg-white/5"
                        }`}
                    >
                      <span className="flex-shrink-0">
                        <Icon className="w-5 h-5" />
                      </span>

                      {desktopExpanded && (
                        <span className="overflow-hidden whitespace-nowrap text-sm">
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
            <div className="p-4 border-t border-white/10">
              <Link href="/admin/settings">
                <motion.div
                  whileHover={{ backgroundColor: "rgba(255,255,255,0.07)" }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-3 pl-[4px] pr-3 py-3 bg-transparent rounded-3xl mb-3 overflow-hidden w-full justify-start"
                >
                  <div className="flex-shrink-0 w-10 h-10">
                    {isLoaded && user?.imageUrl ? (
                      <img
                        src={user.imageUrl}
                        alt={user.fullName || "User"}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-brand-600 to-brand-700 flex items-center justify-center text-white font-semibold">
                        {user?.firstName?.charAt(0) || "U"}
                      </div>
                    )}
                  </div>
 
                  {desktopExpanded && user && (
                    <div className="overflow-hidden">
                      <p className="text-sm font-semibold whitespace-nowrap">{user.fullName}</p>
                      <p className="text-xs text-gray-400 whitespace-nowrap">
                        {user.emailAddresses[0]?.emailAddress?.length > 20
                          ? `${user.emailAddresses[0].emailAddress.substring(0, 20)}...`
                          : user.emailAddresses[0]?.emailAddress}
                      </p>
                    </div>
                  )}

                  {/* Always visible on mobile */}
                  {user && (
                    <div className="lg:hidden">
                      <p className="text-sm font-semibold">{user.fullName}</p>
                      <p className="text-xs text-gray-400">
                        {user.emailAddresses[0]?.emailAddress?.length > 20
                          ? `${user.emailAddresses[0].emailAddress.substring(0, 20)}...`
                          : user.emailAddresses[0]?.emailAddress}
                      </p>
                    </div>
                  )}
                </motion.div>
              </Link>
 
              <SignOutButton redirectUrl="/login">
                <button
                  className="flex items-center gap-3 pl-[14px] pr-3 py-3 w-full text-gray-300 hover:text-red-400 rounded-3xl overflow-hidden justify-start transition-colors hover:bg-red-500/10"
                >
                  <LogOut className="w-5 h-5 flex-shrink-0" />

                  {desktopExpanded && (
                    <span className="overflow-hidden whitespace-nowrap text-sm">
                      Logout
                    </span>
                  )}
                  <span className="lg:hidden">Logout</span>
                </button>
              </SignOutButton>
            </div>
          </div>
        </motion.aside>
      </>
    );
  };

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
        />

        {/* Content padding is driven by the *persistent* collapsed state, not hover, so layout doesn't shift on hover */}
        <motion.div
          animate={{ paddingLeft: collapsed ? 80 : 220 }}
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
  const { dateRange: analyticsDateRange, setDateRange: setAnalyticsDateRange } = useAnalyticsDateRange();
  const { dateRange, startDate, endDate, setDateRange, setStartDate, setEndDate } = useAdminDateRange();
  const [dateTime, setDateTime] = useState("");
  const [activeVisitors, setActiveVisitors] = useState(0);
  const [weather, setWeather] = useState<{ city: string; temp: string; condition: string; iconUrl: string } | null>(null);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const formatted = now.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }) + " | " + now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      });
      setDateTime(formatted);
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
        }
      } catch (e) {
        console.error("Failed to fetch weather status:", e);
      }
    };
    fetchWeatherData();

    return () => {
      clearInterval(clockInterval);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-white/10 h-20 flex-shrink-0 flex items-center">
      <div className="w-full flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 hover:bg-white/10 rounded-3xl"
          >
            <Menu className="w-6 h-6" />
          </button>
 
          {/* System Status Indicators */}
          <div className="hidden xl:flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-300">
            {/* Date & Time */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white/90 tabular-nums">{dateTime || "Loading..."}</span>
            </div>

            {weather && (
              <>
                <div className="h-4 w-[1px] bg-white/10" />
                <div className="flex items-center gap-1">
                  <span className="text-gray-400 font-medium">{weather.city}:</span>
                  <span className="font-semibold text-white/90">{weather.temp}</span>
                  {weather.iconUrl && (
                    <img 
                      src={weather.iconUrl} 
                      alt={weather.condition} 
                      className="w-8 h-8 object-contain -my-2 flex-shrink-0"
                      title={weather.condition}
                    />
                  )}
                </div>
              </>
            )}

            <div className="h-4 w-[1px] bg-white/10" />

            {/* Live Visitors Status */}
            <div className="flex items-center gap-2">
              <span className="text-gray-400 font-medium">Live:</span>
              <span className="relative flex h-2 w-2">
                {activeVisitors > 0 && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  activeVisitors > 0 ? "bg-emerald-500" : "bg-gray-500"
                }`}></span>
              </span>
              <span className="font-semibold text-white/90 text-sm flex items-center gap-1">
                {activeVisitors} {activeVisitors === 1 ? "visitor" : "visitors"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isAnalytics ? (
            <select
              value={analyticsDateRange}
              onChange={(e) => setAnalyticsDateRange(e.target.value as any)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-brand-500 transition-colors appearance-none cursor-pointer text-sm font-medium text-white"
            >
              <option value="today"        className="bg-black">Today</option>
              <option value="24 hours"     className="bg-black">Last 24 Hours</option>
              <option value="one month"    className="bg-black">Last Month</option>
              <option value="three months" className="bg-black">Last 3 Months</option>
              <option value="6 months"     className="bg-black">Last 6 Months</option>
              <option value="this year"    className="bg-black">This Year</option>
              <option value="all time"     className="bg-black">All Time</option>
            </select>
          ) : isBookings ? null : (
            <DateRangeSelector
              dateRange={dateRange}
              startDate={startDate}
              endDate={endDate}
              onRangeChange={setDateRange}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />
          )}

          <NotificationBell />
        </div>
      </div>
    </header>
  );
};