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

import {
  Bell,
  Menu,
  Search,
  LayoutDashboard,
  ClipboardList,
  Settings,
  LogOut,
  X,
  ChevronRight,
  FilePenLine,
  NotepadTextDashed
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

  useEffect(() => {
    const saved = localStorage.getItem("client-sidebar-collapsed") === "true";
    setCollapsed(saved);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("client-sidebar-collapsed", String(next));
      return next;
    });
  };

  // On desktop, the sidebar is visually expanded if it is not collapsed,
  // OR if the user is hovering over it while it is collapsed.
  const desktopExpanded = !collapsed || sidebarHovered;

  // ------------------ Sidebar ------------------
  const Sidebar = ({ mobileMenuOpen, setMobileMenuOpen, collapsed, toggleCollapsed, sidebarHovered, setSidebarHovered }) => {
    const pathname = usePathname();
    const { user, isLoaded } = useUser();

    const links: { name: string; href: string; icon: any; newtab?: boolean }[] = [
      { name: "Dashboard",   href: "/dashboard",             icon: LayoutDashboard },
      { name: "My Projects", href: "/dashboard/projects",    icon: ClipboardList },
      { name: "Quotations",  href: "/dashboard/quotations",  icon: NotepadTextDashed },
      { name: "Agreements",  href: "/dashboard/agreements",  icon: FilePenLine },
      { name: "Settings",    href: "/dashboard/settings",    icon: Settings },
    ];

    const isActive = (href: string) => {
      if (href === "/dashboard") return pathname === href;
      if (href === "/dashboard/projects" && pathname.startsWith("/dashboard/invoice")) return true;
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
          onMouseEnter={() => setSidebarHovered(true)}
          onMouseLeave={() => setSidebarHovered(false)}
          animate={{
            width: desktopExpanded ? 256 : 80,
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
            <div className="flex items-center justify-between p-6 border-b border-white/10 min-h-[80px]">

              {/* Logo: desktop — show when expanded; mobile — always show */}
              <AnimatePresence mode="wait">
                {desktopExpanded && (
                  <motion.div
                    key="logo"
                    variants={labelVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="overflow-hidden"
                  >
                    <Link href="/" className="lg:block">
                      <Image
                        src="/logos/ft/name-logo.png"
                        alt="Frametoque"
                        width={150}
                        height={30}
                        className="h-8 w-auto"
                      />
                    </Link>
                  </motion.div>
                )}
                {!desktopExpanded && (
                  <Link key="logo-mobile" href="/" className="lg:hidden">
                    <Image
                      src="/logos/ft/name-logo.png"
                      alt="Frametoque"
                      width={150}
                      height={30}
                      className="h-8 w-auto"
                    />
                  </Link>
                )}
              </AnimatePresence>

              {/* Mobile: close button */}
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="lg:hidden p-2 hover:bg-white/10 rounded-3xl ml-auto"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Desktop: collapse toggle with animated chevron */}
              <motion.button
                onClick={toggleCollapsed}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className={`hidden lg:flex items-center justify-center p-2 hover:bg-white/10 rounded-3xl
                  ${desktopExpanded ? "ml-auto" : "mx-auto"}`}
              >
                <motion.span
                  animate={{ rotate: collapsed ? 0 : 180 }}
                  transition={{
                    type: "spring",
                    stiffness: 280,
                    damping: 28,
                    mass: 0.8,
                  }}
                  className="flex"
                >
                  <ChevronRight className="w-5 h-5" />
                </motion.span>
              </motion.button>
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
                      className={`flex items-center gap-3 px-4 py-3 rounded-3xl transition-colors duration-150 overflow-hidden
                        ${desktopExpanded ? "" : "lg:justify-center lg:px-0"}
                        ${active
                          ? "bg-white text-black font-semibold"
                          : "text-gray-300 hover:bg-white/5"
                        }`}
                    >
                      <motion.span
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 400, damping: 18 }}
                        className="flex-shrink-0"
                      >
                        <Icon className="w-5 h-5" />
                      </motion.span>

                      <AnimatePresence mode="wait">
                        {desktopExpanded && (
                          <motion.span
                            key={`label-${item.href}`}
                            variants={labelVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="overflow-hidden whitespace-nowrap"
                          >
                            {item.name}
                          </motion.span>
                        )}
                      </AnimatePresence>
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
                  className={`flex items-center gap-3 p-3 bg-white/5 rounded-3xl mb-3 overflow-hidden
                    ${desktopExpanded ? "" : "lg:justify-center"}`}
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

                  <AnimatePresence mode="wait">
                    {desktopExpanded && user && (
                      <motion.div
                        key="user-info"
                        variants={labelVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="overflow-hidden"
                      >
                        <p className="text-sm font-semibold whitespace-nowrap">{user.fullName}</p>
                        <p className="text-xs text-gray-400 whitespace-nowrap">
                          {user.emailAddresses[0]?.emailAddress?.length > 20
                            ? `${user.emailAddresses[0].emailAddress.substring(0, 20)}...`
                            : user.emailAddresses[0]?.emailAddress}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

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
                <motion.button
                  whileHover={{ backgroundColor: "rgba(239,68,68,0.1)" }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className={`flex items-center gap-3 px-4 py-3 w-full text-gray-300 hover:text-red-400 rounded-3xl overflow-hidden
                    ${desktopExpanded ? "" : "lg:justify-center lg:px-0"}`}
                >
                  <LogOut className="w-5 h-5 flex-shrink-0" />

                  <AnimatePresence mode="wait">
                    {desktopExpanded && (
                      <motion.span
                        key="logout-label"
                        variants={labelVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="overflow-hidden whitespace-nowrap"
                      >
                        Logout
                      </motion.span>
                    )}
                  </AnimatePresence>
                  <span className="lg:hidden">Logout</span>
                </motion.button>
              </SignOutButton>
            </div>
          </div>
        </motion.aside>
      </>
    );
  };

  // ------------------ Header ------------------
  const Header = ({ user, isLoaded, setMobileMenuOpen }) => {
    return (
      <header className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 hover:bg-white/10 rounded-3xl"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/10 rounded-3xl px-4 py-2 w-64 lg:w-96">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                placeholder="Search..."
                className="bg-transparent outline-none text-white w-full"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="sm:hidden p-2 hover:bg-white/10 rounded-3xl">
              <Search className="w-5 h-5" />
            </button>

            <button className="relative p-2 hover:bg-white/10 rounded-3xl">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-white/30 rounded-full"></span>
            </button>

            {isLoaded && user?.imageUrl && (
              <Link href="/dashboard/settings">
                <div className="lg:hidden w-8 h-8 rounded-full overflow-hidden">
                  <img
                    src={user.imageUrl}
                    alt={user.fullName || "User"}
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
              </Link>
            )}
          </div>
        </div>
      </header>
    );
  };

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
      />

      {/* Content padding is driven by the *persistent* collapsed state, not hover, so layout doesn't shift on hover */}
      <motion.div
        animate={{ paddingLeft: collapsed ? 80 : 256 }}
        transition={{
          type: "spring",
          stiffness: 280,
          damping: 28,
          mass: 0.8,
        }}
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
  );
}