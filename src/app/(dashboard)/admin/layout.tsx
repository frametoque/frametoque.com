"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useUser, SignOutButton } from "@clerk/nextjs";
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
  FilePenLine,
  ChartLine,
  NotepadTextDashed
} from "lucide-react";

export default function DashboardLayout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ------------------ Sidebar ------------------
  const Sidebar = ({ mobileMenuOpen, setMobileMenuOpen }) => {
    const [collapsed, setCollapsed] = useState(false);
    const pathname = usePathname();
    const { user, isLoaded } = useUser();

const links: { name: string; href: string; icon: any; newtab?: boolean }[] = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Income", href: "/admin/income", icon: Wallet },
  { name: "Expenses", href: "/admin/expenses", icon: Receipt },
  { name: "Reports", href: "/admin/reports", icon: BarChart3 },
  { name: "Invoices", href: "/admin/invoices", icon: FileText },
  { name: "Quotations", href: "/admin/quotations", icon: NotepadTextDashed },
  { name: "Agreements", href: "/admin/agreements", icon: FilePenLine },
  { name: "Clients", href: "/admin/clients", icon: Users },
  { name: "Web Analytics", href: "/admin/analytics", icon: ChartLine },
];

const isActive = (href: string) => {
  if (href === "/admin/dashboard") {
    return pathname === href;
  }

  if (href === "/admin/invoices") {
    return (
      pathname.startsWith("/admin/invoices") ||
      pathname.startsWith("/admin/invoice")
    );
  }

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
            ${collapsed ? "w-20" : "w-64"} 
            ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
        >
          <div className="flex flex-col h-full">
            {/* Logo + Collapse */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              {!collapsed && (
                <Link href="/">
                  <Image
                    src="/logos/ft/name-logo.png"
                    alt="Frametoque"
                    width={150}
                    height={30}
                    className="h-8 w-auto"
                  />
                </Link>
              )}

              <button
                onClick={() => setMobileMenuOpen(false)}
                className="lg:hidden p-2 hover:bg-white/10 rounded-3xl"
              >
                <X className="w-5 h-5" />
              </button>

              <button
                onClick={() => setCollapsed(!collapsed)}
                className="hidden lg:block p-2 hover:bg-white/10 rounded-3xl"
              >
                {collapsed ? <ChevronRight /> : <ChevronLeft />}
              </button>
            </div>

            {/* Links */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              {links.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    target={
                        item.newtab
                          ? "_blank"
                          : "_self"
                      }
                    className={`flex items-center gap-3 px-4 py-3 rounded-3xl transition-all
                      ${
                        active
                          ? "bg-gradient-to-r from-white to-white text-black font-semibold"
                          : "text-gray-300 hover:bg-white/5"
                      }
                      `}
                  >
                    <Icon className="w-5 h-5" />
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                );
              })}
            </nav>

            {/* User */}
            
            <div className="p-4 border-t border-white/10">
            <Link href="/admin/settings" >
              <div
                className={`flex items-center gap-3 p-3 bg-white/5 rounded-3xl mb-3 ${
                  collapsed ? "justify-center" : ""
                }`}
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

                {!collapsed && user && (
                  <div>
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

              {/* Logout */}
              <SignOutButton redirectUrl="/login">
                <button
                  className={`flex items-center gap-3 px-4 py-3 w-full text-gray-300 hover:bg-red-500/10 hover:text-red-400 rounded-3xl ${
                    collapsed ? "justify-center" : ""
                  }`}
                >
                  <LogOut className="w-5 h-5" />
                  {!collapsed && <span>Logout</span>}
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
      <header className="sticky top-0 z-30 bg-black-950/80 backdrop-blur-xl border-b border-white/10">
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

          {/* Right */}
          <div className="flex items-center gap-3">
            <button className="sm:hidden p-2 hover:bg-white/10 rounded-3xl">
              <Search className="w-5 h-5" />
            </button>

            <button className="relative p-2 hover:bg-white/10 rounded-3xl">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-black-500 rounded-full"></span>
            </button>

            {/* Mobile Avatar */}
            {isLoaded && user?.imageUrl && (
              <Link href="/admin/settings" >
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
      />

      <div className="lg:pl-64 transition-all duration-300">
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