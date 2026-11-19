"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Menu, 
  X, 
  MessageCircle, 
  Phone, 
  MapPin, 
  ChevronRight, 
  Film,
  LogIn,
  ExternalLink,
  LayoutDashboard
} from "lucide-react";
import { useRentalKit } from "@/context/RentalKitContext";

export default function RentalHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { itemCount, openKit } = useRentalKit();

  // Close drawer on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent background scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const navLinks = [
    { label: "Equipment", href: "/rentals" },
    { label: "FAQ", href: "/rentals/faq" },
    { label: "Terms & Conditions", href: "/rentals/terms" },
    { label: "Contact", href: "/rentals/contact" },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link href="/rentals" className="flex items-center gap-2 group">
              <Image
                src="/logos/ft/name-logo.png"
                alt="Frametoque"
                width={180}
                height={36}
                priority
                className="h-auto w-28 sm:w-36 brightness-0 transition-opacity hover:opacity-80"
              />
              <span className="text-xs sm:text-sm font-bold tracking-wider text-brand-600 select-none">
                | RENTALS
              </span>
            </Link>
          </div>

          {/* Right Corner: Client Portal, Shoot Kit Trigger & Hamburger Menu Button */}
          <div className="flex items-center gap-2">
            <a
              href="/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
              title="Sign in to view all your invoices, quotations, agreements, and rentals"
            >
              <LogIn className="w-3.5 h-3.5 text-brand-600" />
              <span>Client Portal</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>

            <button
              type="button"
              onClick={openKit}
              className={`inline-flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-xs active:scale-95 ${
                itemCount > 0
                  ? "bg-brand-600 text-white border-brand-600 hover:bg-brand-500 shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
              }`}
              aria-label="Open Shoot Kit"
            >
              <Film className="w-4 h-4 shrink-0" />
              <span>Shoot Kit</span>
              {itemCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[11px] font-extrabold bg-white text-brand-600">
                  {itemCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="p-2 sm:p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-800 hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-center shadow-xs"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5 text-slate-800" />
            </button>
          </div>

        </div>
      </header>

      {/* Slide-Over Side Menu Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-xs"
            />

            {/* Side Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="fixed top-0 right-0 bottom-0 z-[130] w-full max-w-xs sm:max-w-sm bg-white shadow-2xl border-l border-slate-200 flex flex-col justify-between overflow-y-auto"
            >
              {/* Top Drawer Header */}
              <div>
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Image
                      src="/logos/ft/name-logo.png"
                      alt="Frametoque"
                      width={130}
                      height={26}
                      className="h-auto w-24 brightness-0"
                    />
                    <span className="text-xs font-bold text-brand-600 tracking-wider">
                      | RENTALS
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Navigation Links */}
                <div className="p-6 space-y-1">
                  {navLinks.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-semibold transition-all ${
                          isActive
                            ? "bg-brand-50 text-brand-700 border border-brand-200/60 shadow-xs"
                            : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        <span>{item.label}</span>
                        <ChevronRight className={`w-4 h-4 ${isActive ? "text-brand-600" : "text-slate-400"}`} />
                      </Link>
                    );
                  })}
                </div>

                {/* Client Portal Card */}
                <div className="px-6 pb-4">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-md border border-slate-700/60">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center">
                          <LayoutDashboard className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                          Client Portal
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                        Login
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mb-3.5 leading-relaxed">
                      Sign in to view, manage, and download all your invoices, official quotations, rental agreements, and active project deliverables.
                    </p>
                    <a
                      href="/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Log in to Client Dashboard</span>
                      <ExternalLink className="w-3 h-3 text-brand-200" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Bottom Drawer Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 space-y-4">
                <a
                  href="https://wa.me/94702771361?text=Hi%20Frametoque%20Team%2C%20I'm%20inquiring%20about%20equipment%20rentals."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold shadow-sm transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Message on WhatsApp</span>
                </a>

                <div className="space-y-1.5 text-xs text-slate-500 pt-1">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>+94 70 277 1361</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>35, Kopiwaththa Road, Piliyandala</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
