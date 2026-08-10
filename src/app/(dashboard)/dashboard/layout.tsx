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


import ClientAvatar from "@/components/ClientAvatar";
import {
  Menu,
  Search,
  LayoutDashboard,
  ClipboardList,
  Settings,
  LogOut,
  X,
  ChevronRight,
  FilePenLine,
  NotepadTextDashed,
  PanelLeftClose,
  PanelLeftOpen,
  Clock,
  Calendar,
  Globe,
  CreditCard,
  Download,
  Cloud
} from "lucide-react";

// Framer Motion spring config for sidebar width
const sidebarSpring = { type: "spring", stiffness: 280, damping: 28, mass: 0.8 };

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
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [ignoreHover, setIgnoreHover] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");

  const pathname = usePathname();

  const getPageTitle = (path: string): string => {
    if (path === "/dashboard") return "Dashboard";
    if (path.startsWith("/dashboard/invoice/")) {
      const parts = path.split("/");
      const id = parts[parts.length - 1];
      return id ? `Invoice #${id}` : "Invoice Details";
    }
    if (path.startsWith("/dashboard/invoices")) return "Invoices";
    if (path.startsWith("/dashboard/domains")) return "Domains";
    if (path.startsWith("/dashboard/saas")) return "SaaS";
    if (path.startsWith("/dashboard/quotations")) return "Quotations";
    if (path.startsWith("/dashboard/agreements")) return "Agreements";
    if (path.startsWith("/dashboard/settings")) return "Settings";
    return "Client Portal";
  };

  useEffect(() => {
    const saved = localStorage.getItem("client-sidebar-collapsed") === "true";
    setCollapsed(saved);
  }, []);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      
      const timeStr = now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      });
      
      const dateStr = now.toLocaleDateString("en-US", {
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
    return () => clearInterval(clockInterval);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("client-sidebar-collapsed", String(next));
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
        animate={{ paddingLeft: collapsed ? 80 : 220 }}
        transition={{
          type: "spring",
          stiffness: 280,
          damping: 28,
          mass: 0.8,
        }}
        className="min-h-screen lg:block hidden"
      >
        <Header 
          user={user} 
          isLoaded={isLoaded} 
          setMobileMenuOpen={setMobileMenuOpen} 
          currentTime={currentTime}
          currentDate={currentDate}
          pageTitle={getPageTitle(pathname)}
        />
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </motion.div>

      {/* Mobile: no left padding */}
      <div className="lg:hidden">
        <Header 
          user={user} 
          isLoaded={isLoaded} 
          setMobileMenuOpen={setMobileMenuOpen} 
          currentTime={currentTime}
          currentDate={currentDate}
          pageTitle={getPageTitle(pathname)}
        />
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

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

  const links: { name: string; href: string; icon: any; newtab?: boolean }[] = [
    { name: "Dashboard",   href: "/dashboard",             icon: LayoutDashboard },
    { name: "Invoices", href: "/dashboard/invoices",    icon: ClipboardList },
    { name: "Quotations",  href: "/dashboard/quotations",  icon: NotepadTextDashed },
    { name: "Agreements",  href: "/dashboard/agreements",  icon: FilePenLine },
    // { name: "SaaS",     href: "/dashboard/saas",        icon: Cloud },
    { name: "Domains",  href: "/dashboard/domains",     icon: Globe },
    { name: "Settings",    href: "/dashboard/settings",    icon: Settings },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === href;
    if (href === "/dashboard/invoices" && pathname.startsWith("/dashboard/invoice")) return true;
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
        }}
        transition={{
          type: "spring",
          stiffness: 280,
          damping: 28,
          mass: 0.8,
        }}
        className={`fixed top-0 left-0 h-full bg-black backdrop-blur-xl border-r border-white/10 z-50
          w-64
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
        style={{ overflow: "hidden" }}
      >
        <div className="flex flex-col h-full">

          {/* Logo + Collapse toggle */}
          <div className="flex items-center justify-between border-b border-white/10 h-20 flex-shrink-0 overflow-hidden px-4">

            {/* Logo: desktop — show when expanded; mobile — always show */}
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
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {links.map((item, i) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <div key={item.href}>
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
          <div className="p-4 border-t border-white/10">
            <Link href="/dashboard/settings">
              <motion.div
                whileHover={{ backgroundColor: "rgba(255,255,255,0.07)" }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-3 pl-[4px] pr-3 py-3 bg-transparent rounded-3xl mb-3 overflow-hidden w-full justify-start"
              >
                <div className="flex-shrink-0 w-10 h-10">
                  <ClientAvatar
                    imageUrl={user?.imageUrl}
                    email={user?.primaryEmailAddress?.emailAddress}
                    name={user?.fullName || user?.firstName}
                    className="w-10 h-10 rounded-full object-cover"
                    fallbackClassName="w-10 h-10 rounded-full bg-gradient-to-r from-brand-600 to-brand-700 flex items-center justify-center text-white font-semibold"
                  />
                </div>

                {desktopExpanded && user && (
                  <div className="hidden lg:block overflow-hidden">
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
                  <span className="hidden lg:block overflow-hidden whitespace-nowrap text-sm">
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

// ------------------ Header Component (Module Level) ------------------
const Header = ({
  user,
  isLoaded,
  setMobileMenuOpen,
  currentTime,
  currentDate,
  pageTitle,
}: {
  user: any;
  isLoaded: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  currentTime: string;
  currentDate: string;
  pageTitle: string;
}) => {
  const pathname = usePathname();
  const isInvoiceDetail = pathname.startsWith("/dashboard/invoice/");

  return (
    <header className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-white/10 h-20 flex-shrink-0 flex items-center">
      <div className="w-full flex items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Left Side: Title & Mobile menu button */}
        <div className="flex items-center gap-4 sm:gap-6">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 hover:bg-white/10 rounded-3xl"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Page Title */}
          <h1 className="text-xl font-bold text-white tracking-tight">
            {pageTitle}
          </h1>

          {isInvoiceDetail && (
            <>
              <span className="hidden sm:block w-[1px] h-5 bg-white/15" />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("client-invoice:pay-now"))}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:opacity-90 text-white rounded-3xl font-semibold transition-all active:scale-95 duration-200 cursor-pointer text-xs whitespace-nowrap"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Pay Now</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("client-invoice:download-pdf"))}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-brand-600 to-brand-700 hover:opacity-90 text-white rounded-3xl font-semibold transition-opacity active:scale-95 duration-200 cursor-pointer text-xs whitespace-nowrap"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right Side: System Stats (Time & Date only) + Mobile profile */}
        <div className="flex items-center gap-3 sm:gap-5 text-sm text-gray-400">
          {/* Current Time */}
          <div className="hidden sm:flex items-center gap-1.5 text-gray-300">
            <Clock className="w-3.5 h-3.5 text-gray-500" />
            <span className="font-medium tabular-nums">{currentTime || "Loading..."}</span>
          </div>

          <span className="hidden sm:block w-1 h-1 rounded-full bg-white/20" />

          {/* Current Date */}
          <div className="hidden sm:flex items-center gap-1.5 text-gray-300">
            <Calendar className="w-3.5 h-3.5 text-gray-500" />
            <span className="font-medium">{currentDate || "Loading..."}</span>
          </div>

          {isLoaded && (
            <Link href="/dashboard/settings" className="lg:hidden ml-2 shrink-0">
              <ClientAvatar
                imageUrl={user?.imageUrl}
                email={user?.primaryEmailAddress?.emailAddress}
                name={user?.fullName || user?.firstName}
                className="w-8 h-8 rounded-full object-cover"
                fallbackClassName="w-8 h-8 rounded-full bg-gradient-to-r from-brand-600 to-brand-700 flex items-center justify-center text-white text-xs font-semibold"
              />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};