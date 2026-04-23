"use client";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

const protectImage = (e) => e.preventDefault();

export default function Navbar({ scrolled }: { scrolled: boolean }) {
  const [mobileMenuIsOpen, setMobileMenuIsOpen] = useState(false);
  const pathname = usePathname();

  const links = [
    { href: "/projects", label: "Work" },
    { href: "/services", label: "Services" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 flex items-center justify-between px-6 lg:px-16 py-3 ${
        scrolled ? "bg-black/60 backdrop-blur-md shadow-2xl" : "bg-transparent"
      }`}
    >
      <div className="flex items-center gap-2 group cursor-pointer z-50 w-[140px] sm:w-[180px]">
        <Link href="/">
          <Image
            src="/logos/ft/name-logo.png"
            alt="Frametoque"
            width={200}
            height={40}
            onContextMenu={protectImage}
            onDragStart={protectImage}
            loading="eager"
            className="h-auto transition-all duration-300 w-28 sm:w-36"
          />
        </Link>
      </div>

      <div className="hidden md:flex flex-1 items-center justify-center gap-2">
        {links.map((link) => {
          const isActive = link.href === "/services"
            ? pathname === "/services" || pathname.startsWith("/services/")
            : pathname === link.href || pathname.startsWith(`${link.href}/`);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`relative px-5 py-1.5 text-sm font-medium transition-all duration-300 rounded-full group overflow-hidden ${
                isActive ? "text-white bg-white/10 shadow-inner drop-shadow-md" : "text-white drop-shadow-md hover:bg-white/10"
              }`}
            >
              <span className="relative z-10">{link.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="hidden md:flex items-center justify-end w-[140px] sm:w-[180px]">
        <Link
          href="/dashboard"
          className="group relative flex items-center justify-center bg-white text-black hover:bg-gray-100 hover:scale-105 active:scale-95 transition-all duration-300 rounded-full px-6 py-2 text-sm font-semibold"
        >
          Dashboard
        </Link>
      </div>

      {/* Mobile menu button */}
      <button
        aria-label="Toggle Menu"
        className="md:hidden p-2 text-white drop-shadow-md transition-colors z-50 rounded-full hover:bg-white/10"
        onClick={() => setMobileMenuIsOpen((prev) => !prev)}
      >
        {mobileMenuIsOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Menu className="w-6 h-6" />
        )}
      </button>

      {/* Mobile menu */}
      {mobileMenuIsOpen && (
        <div className="absolute top-full left-0 right-0 bg-[#0d0d0d] backdrop-blur-3xl border-t border-white/10 animate-in slide-in-from-top-2 duration-300 md:hidden pt-4 pb-6 px-6 shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden">
          <div className="flex flex-col space-y-2">
            {links.map((link) => {
              const isActive = link.href === "/services"
                ? pathname === "/services" || pathname.startsWith("/services/")
                : pathname === link.href || pathname.startsWith(`${link.href}/`);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuIsOpen(false)}
                  className={`block px-4 py-3 rounded-xl text-base transition-all duration-300 ${
                    isActive ? "text-white bg-white/10 font-medium" : "text-white hover:bg-white/10"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="pt-4 px-2">
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuIsOpen(false)}
                className="flex items-center justify-center w-full bg-white text-black rounded-xl px-6 py-3.5 text-base font-semibold hover:bg-gray-200 active:scale-[0.98] transition-all shadow-md"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
