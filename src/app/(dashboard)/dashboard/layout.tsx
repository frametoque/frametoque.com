"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useUser, SignOutButton } from "@clerk/nextjs";
import {
  Bell,
  Menu,
  Search,
  LayoutDashboard,
  ClipboardList,
  Settings,
  LogOut,
  X,
  ChevronLeft,
  ChevronRight,
  FilePenLine,
  NotepadTextDashed
} from "lucide-react";

export default function DashboardLayout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [collapsed, setCollapsed] = useState(false);

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

  // ------------------ Sidebar ------------------
  const Sidebar = ({ mobileMenuOpen, setMobileMenuOpen, collapsed, toggleCollapsed }) => {
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
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        <aside
          className={`fixed top-0 left-0 h-full bg-black backdrop-blur-xl border-r border-white/10 z-50 transition-all duration-300
            w-64
            ${collapsed ? "lg:w-20" : "lg:w-64"}
            ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
        >
          <div className="flex flex-col h-full">

            {/* Logo + Collapse toggle */}
            <div className="flex items-center justify-between p-6 border-b border-white/10 min-h-[80px]">

              {/* Logo: always visible on mobile; hidden on desktop when collapsed */}
              {!collapsed && (
                <Link href="/" className="lg:block">
                  <Image
                    src="/logos/ft/name-logo.png"
                    alt="Frametoque"
                    width={150}
                    height={30}
                    className="h-8 w-auto"
                  />
                </Link>
              )}
              {collapsed && (
                <Link href="/" className="lg:hidden">
                  <Image
                    src="/logos/ft/name-logo.png"
                    alt="Frametoque"
                    width={150}
                    height={30}
                    className="h-8 w-auto"
                  />
                </Link>
              )}

              {/* Mobile: close button */}
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="lg:hidden p-2 hover:bg-white/10 rounded-3xl ml-auto"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Desktop: collapse toggle */}
              <button
                onClick={toggleCollapsed}
                className={`hidden lg:flex items-center justify-center p-2 hover:bg-white/10 rounded-3xl
                  ${collapsed ? "mx-auto" : "ml-auto"}`}
              >
                {collapsed
                  ? <ChevronRight className="w-5 h-5" />
                  : <ChevronLeft className="w-5 h-5" />
                }
              </button>
            </div>

            {/* Nav links */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              {links.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    target={item.newtab ? "_blank" : "_self"}
                    className={`flex items-center gap-3 px-4 py-3 rounded-3xl transition-all
                      ${collapsed ? "lg:justify-center lg:px-0" : ""}
                      ${active
                        ? "bg-white text-black font-semibold"
                        : "text-gray-300 hover:bg-white/5"
                      }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {/* Always visible on mobile; hidden on desktop when collapsed */}
                    <span className={collapsed ? "lg:hidden" : ""}>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* User section */}
            <div className="p-4 border-t border-white/10">
              <Link href="/dashboard/settings">
                <div
                  className={`flex items-center gap-3 p-3 bg-white/5 rounded-3xl mb-3
                    ${collapsed ? "lg:justify-center" : ""}`}
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
                  {user && (
                    <div className={collapsed ? "lg:hidden" : ""}>
                      <p className="text-sm font-semibold">{user.fullName}</p>
                      <p className="text-xs text-gray-400">
                        {user.emailAddresses[0]?.emailAddress?.length > 20
                          ? `${user.emailAddresses[0].emailAddress.substring(0, 20)}...`
                          : user.emailAddresses[0]?.emailAddress}
                      </p>
                    </div>
                  )}
                </div>
              </Link>

              <SignOutButton redirectUrl="/login">
                <button
                  className={`flex items-center gap-3 px-4 py-3 w-full text-gray-300 hover:bg-red-500/10 hover:text-red-400 rounded-3xl
                    ${collapsed ? "lg:justify-center lg:px-0" : ""}`}
                >
                  <LogOut className="w-5 h-5 flex-shrink-0" />
                  <span className={collapsed ? "lg:hidden" : ""}>Logout</span>
                </button>
              </SignOutButton>
            </div>
          </div>
        </aside>
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
      />

      <div className={`transition-all duration-300 ${collapsed ? "lg:pl-20" : "lg:pl-64"}`}>
        <Header
          user={user}
          isLoaded={isLoaded}
          setMobileMenuOpen={setMobileMenuOpen}
        />
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}