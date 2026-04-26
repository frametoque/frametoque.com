"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import ServicesSub from "@/components/services/ServicesSub";

// ─── Tab config ────────────────────────────────────────────────────────────────
const TABS = [
  { label: "Photography & Videography", value: "photo-video" },
  { label: "Graphic Design", value: "graphic-design" },
  { label: "Video Editing", value: "video-editing" },
  { label: "Web Development", value: "web-dev" },
];

function getHeroForTab(tab: string): string {
  switch (tab) {
    case "photo-video":    return "/projects/photography-cover.jpg";
    case "graphic-design": return "/projects/graphic-design-cover.jpg";
    case "video-editing":  return "/projects/vid-edit-cover.jpg";
    case "web-dev":        return "/projects/web-dev-cover.jpg";
    default:               return "/projects/vid-edit-cover.jpg";
  }
}

// ─── Hero ──────────────────────────────────────────────────────────────────────
function SingleHeroImage({ src, isActive, label }: { src: string; isActive: boolean; label: string }) {
  return (
    <Image
      src={src}
      alt={`${label} hero`}
      fill
      priority={isActive}
      className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ${
        isActive ? "opacity-100 scale-105 z-10" : "opacity-0 scale-100 z-0"
      }`}
      sizes="100vw"
    />
  );
}

function ServicesHero({ activeTab }: { activeTab: string }) {
  return (
    <section className="relative h-[40vh] md:h-[35vh] w-full bg-black overflow-hidden flex items-center justify-center">
      {TABS.map((t) => (
        <SingleHeroImage key={t.value} src={getHeroForTab(t.value)} label={t.label} isActive={activeTab === t.value} />
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-black z-20 pointer-events-none" />
    </section>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function ServicesMain({ params }: { params?: { slug?: string } }) {
  const router   = useRouter();
  const pathname = usePathname();

  const slugFromPath = pathname.split("/").pop();
  const resolvedTab  = TABS.find((t) => t.value === slugFromPath)?.value ?? "photo-video";

  const [activeTab, setActiveTab] = useState(resolvedTab);

  useEffect(() => {
    setActiveTab(resolvedTab);
  }, [resolvedTab]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    router.push(`/services/${tab}`, { scroll: false });
  };

  const activeLabel          = TABS.find((t) => t.value === activeTab)?.label ?? "";
  const [firstWord, ...rest] = activeLabel.split(" ");

  return (
    <>
      <Navbar scrolled={true} />

      <ServicesHero activeTab={activeTab} />

      <section className="py-24 px-4 bg-black text-white">

        {/* Section heading */}
        <div className="text-center mb-10 sm:mb-14">
          <h2 className="text-5xl sm:text-4xl md:text-4xl lg:text-6xl font-black mb-4 sm:mb-6 tracking-tight">
            <span className="bg-gradient-to-b from-brand-400 to-brand-600 bg-clip-text text-transparent">
              {firstWord}
            </span>
            {rest.length > 0 && (
              <span className="bg-gradient-to-b from-white to-gray-300 bg-clip-text text-transparent">
                {" "}{rest.join(" ")}
              </span>
            )}
          </h2>
          <p className="text-gray-400 text-base sm:text-lg max-w-3xl mx-auto leading-relaxed">
            From websites and graphics to photography, videography, and editing, we create powerful digital experiences that elevate your brand everywhere.
          </p>
        </div>

        {/* Tab bar */}
        <div className="mb-12 sm:mb-16">
          <div className="flex justify-center">

            {/* Mobile: wrapped grid */}
            <div className="flex sm:hidden flex-wrap gap-2 w-full pb-2 px-4">
              {TABS.map((tab) => (
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
              {TABS.map((tab) => (
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

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <ServicesSub categorySlug={activeTab} />
          </motion.div>
        </AnimatePresence>

      </section>

      <Footer />
    </>
  );
}