"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import ServicesSub from "@/components/services/ServicesSub";

// ─── Tab config ────────────────────────────────────────────────────────────────
const DIGITAL_TABS = [
  { label: "Web Development", value: "web-dev" },
  { label: "Graphic Design", value: "graphic-design" },
  { label: "Video Editing", value: "video-editing" },
];

const PRODUCTIONS_TABS = [
  { label: "Photography & Videography", value: "photo-video" },
  { label: "Event Productions", value: "event-productions" },
];

const ALL_TABS = [
  { label: "Photography & Videography", value: "photo-video" },
  { label: "Event Productions", value: "event-productions" },
  { label: "Web Development", value: "web-dev" },
  { label: "Graphic Design", value: "graphic-design" },
  { label: "Video Editing", value: "video-editing" },
  { label: "SaaS Products", value: "saas-products" },
];

const CATEGORY_META: Record<string, { title: string; subtitle: string }> = {
  "web-dev": {
    title: "Web Development",
    subtitle: "Explore transparent packages, custom web development, and digital design services tailored for your brand.",
  },
  "graphic-design": {
    title: "Graphic Design",
    subtitle: "Explore brand identity, digital graphics, print design, and visual communication services tailored for your brand.",
  },
  "video-editing": {
    title: "Video Editing",
    subtitle: "Explore cinematic post-production, motion graphics, and video editing services tailored for your brand.",
  },
  "photo-video": {
    title: "Photography & Videography",
    subtitle: "Explore cinema-grade videography, commercial photography, and event production services.",
  },
  "event-productions": {
    title: "Event Production",
    subtitle: "Explore cinema-grade staging, live audio-visual setups, and full-scale event production services.",
  },
  "saas-products": {
    title: "SaaS Products",
    subtitle: "Explore proprietary cloud applications, ERP software, and scalable SaaS solutions tailored for your business.",
  },
};

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function ServicesMain({
  params,
  arm,
}: {
  params?: { slug?: string };
  arm?: "digital" | "productions";
}) {
  const router = useRouter();
  const pathname = usePathname();

  const isDigital = arm === "digital" || pathname.startsWith("/digital");
  const isProductions = arm === "productions" || pathname.startsWith("/productions");

  const availableTabs = isDigital
    ? DIGITAL_TABS
    : isProductions
    ? PRODUCTIONS_TABS
    : ALL_TABS;

  const basePath = isDigital
    ? "/digital/services"
    : isProductions
    ? "/productions/services"
    : "/services";

  const defaultTab = isDigital ? "web-dev" : "photo-video";

  const slugFromPath = pathname.split("/").pop();
  const resolvedTab = availableTabs.find((t) => t.value === slugFromPath)?.value ?? defaultTab;

  const [activeTab, setActiveTab] = useState(resolvedTab);

  useEffect(() => {
    setActiveTab(resolvedTab);
  }, [resolvedTab]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    router.push(`${basePath}/${tab}`, { scroll: false });
  };

  const currentMeta = CATEGORY_META[activeTab] ?? {
    title: isDigital ? "Digital" : isProductions ? "Production" : "Our",
    subtitle: isDigital
      ? "Explore transparent packages, custom web development, and digital design services tailored for your brand."
      : isProductions
      ? "Explore cinema-grade videography, commercial photography, and event production services."
      : "Explore transparent packages across digital technology, creative design, and cinematic media production.",
  };

  return (
    <div className="bg-black text-white selection:bg-brand-500 selection:text-white">
      <Navbar scrolled={true} />

      <main className="min-h-screen relative overflow-hidden">
        {/* Hero Section */}
        <section className="relative pt-36 pb-6 sm:pt-44 sm:pb-8 px-6 lg:px-16 overflow-hidden">
          {/* Ambient Glow Background */}
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] sm:w-[900px] h-[400px] bg-brand-500/15 blur-[120px] rounded-full" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(22,159,228,0.2),rgba(0,0,0,0))]" />
          </div>

          <div className="max-w-5xl mx-auto text-center relative z-10">
            <div className="flex justify-center mb-8">
              <Image
                src="/logos/ft/name-logo.png"
                alt={
                  isDigital
                    ? "Frametoque Digital"
                    : isProductions
                    ? "Frametoque Productions"
                    : "Frametoque Digital Productions"
                }
                width={180}
                height={36}
                className="h-7 sm:h-8 w-auto object-contain"
                priority
              />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-black tracking-tight leading-[1.15] mb-4 sm:mb-6">
                  <span className="bg-gradient-to-b from-white via-white to-gray-400 bg-clip-text text-transparent block">
                    {currentMeta.title}
                  </span>
                  <span className="bg-gradient-to-r from-brand-300 via-brand-400 to-brand-500 bg-clip-text text-transparent block">
                    Services.
                  </span>
                </h1>

                <p className="text-gray-400 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto leading-relaxed mb-8 sm:mb-10">
                  {currentMeta.subtitle}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Tab switcher row */}
            <div className="flex justify-center">
              {/* Mobile: wrapped grid */}
              <div className="flex sm:hidden flex-wrap gap-2 w-full pb-2 px-2 max-w-md mx-auto">
                {availableTabs.map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => handleTabChange(tab.value)}
                    className={`
                      flex-1 min-w-[calc(50%-4px)] max-w-[calc(50%-4px)] px-3 py-2.5 rounded-full text-xs font-medium transition-all duration-300 text-center
                      ${activeTab === tab.value
                        ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30"
                        : "text-gray-400 bg-white/5 border border-white/10 hover:text-white hover:bg-white/10"
                      }
                    `}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Desktop: pill row */}
              <div className="hidden sm:inline-flex p-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                {availableTabs.map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => handleTabChange(tab.value)}
                    className={`
                      relative whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300
                      ${activeTab === tab.value ? "text-white" : "text-gray-400 hover:text-white"}
                    `}
                  >
                    {activeTab === tab.value && (
                      <motion.div
                        layoutId="activeServiceTab"
                        className="absolute inset-0 bg-gradient-to-br from-brand-400 via-brand-500 to-brand-600 rounded-full shadow-lg shadow-brand-500/30"
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      />
                    )}
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="pt-2 sm:pt-4 pb-16 sm:pb-20 px-4 sm:px-6 lg:px-8 bg-black text-white">
          <div className="max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="space-y-16"
              >
                <ServicesSub
                  categorySlug={activeTab}
                  arm={arm || (isDigital ? "digital" : isProductions ? "productions" : undefined)}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </section>
      </main>

      <Footer arm={arm || (isDigital ? "digital" : isProductions ? "productions" : "parent")} />
    </div>
  );
}
