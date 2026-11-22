"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import Image from "next/image";

import { PhotographyGallery } from "./PhotographyGallery";
import { GraphicDesignGallery } from "./GraphicDesignGallery";
import { VideographyGallery } from "./VideographyGallery";
import { VideoEditingGallery } from "./VideoEditingGallery";
import { WebDevelopingGallery } from "./WebDevelopingGallery";

import { type PhotographyEvent, type VideoProject, type WebDevImage, type SiteDetails } from "../../lib/workdata";

const DIGITAL_WORK_TABS = [
  { label: "Web Development", value: "web-dev" },
  { label: "Graphic Design", value: "graphic-design" },
  { label: "Video Editing", value: "video-editing" },
];

const PRODUCTIONS_WORK_TABS = [
  { label: "Photography", value: "photography" },
  { label: "Videography", value: "videography" },
  { label: "Event Productions", value: "event-productions" },
];

const ALL_WORK_TABS = [
  { label: "Photography", value: "photography" },
  { label: "Videography", value: "videography" },
  { label: "Event Productions", value: "event-productions" },
  { label: "Web Development", value: "web-dev" },
  { label: "Graphic Design", value: "graphic-design" },
  { label: "Video Editing", value: "video-editing" },
];

const TAB_TITLES: Record<string, string> = {
  // Digital
  "web-dev": "Web Development Portfolio | Frametoque Digital",
  "graphic-design": "Graphic Design Portfolio | Frametoque Digital",
  "video-editing": "Video Editing & Motion Design Portfolio | Frametoque Digital",
  // Productions
  "photography": "Commercial & Event Photography Portfolio | Frametoque Productions",
  "videography": "Cinematic Videography Portfolio | Frametoque Productions",
  "event-productions": "Live Event Productions Portfolio | Frametoque Productions",
};

const TAB_DESCRIPTIONS: Record<string, string> = {
  // Digital
  "web-dev": "Explore production web architectures, responsive web apps, and modern high-converting websites by Frametoque Digital.",
  "graphic-design": "Explore creative brand identities, commercial posters, and visual communication designs crafted by Frametoque Digital.",
  "video-editing": "Explore cinematic video reels, motion graphics, and high-energy short visual edits produced by Frametoque Digital.",
  // Productions
  "photography": "Explore commercial, event, concert, and portrait photography captures by Frametoque Productions.",
  "videography": "Explore cinematic aftermovies, corporate commercials, and broadcast-grade videography by Frametoque Productions.",
  "event-productions": "Explore concert stage setups, live streaming, multi-camera broadcasting, and full-scale event productions by Frametoque Productions.",
};

function getHeroForTab(tab: string): string {
  switch (tab) {
    case "photography":      return "/projects/photography-cover.jpg";
    case "videography":      return "/projects/videography-cover.jpg";
    case "event-productions": return "/projects/videography-cover.jpg";
    case "graphic-design":   return "/projects/graphic-design-cover.jpg";
    case "video-editing":    return "/projects/vid-edit-cover.jpg";
    case "web-dev":          return "/projects/web-dev-cover.jpg";
    default:                 return "/projects/vid-edit-cover.jpg";
  }
}

function SingleHeroImage({
  tab, label, src, isActive,
}: {
  tab: string; label: string; src: string; isActive: boolean;
}) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const isYoutube = tab === "videography" && src.includes("ytimg.com");

  useEffect(() => { setCurrentSrc(src); }, [src]);

  const handleError = () => {
    if (isYoutube && currentSrc.includes("maxresdefault")) {
      setCurrentSrc(currentSrc.replace("maxresdefault", "hqdefault"));
    }
  };

  return (
    <Image
      src={currentSrc}
      alt={`${label} hero`}
      fill
      priority={isActive}
      onError={handleError}
      className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ${
        isActive ? "opacity-100 scale-105 z-10" : "opacity-0 scale-100 z-0"
      }`}
      sizes="100vw"
    />
  );
}

function ProjectHero({ activeTab }: { activeTab: string }) {
  return (
    <section className="relative h-[40vh] md:h-[35vh] w-full bg-black overflow-hidden flex items-center justify-center">
      {ALL_WORK_TABS.map((t) => (
        <SingleHeroImage
          key={t.value}
          tab={t.value}
          label={t.label}
          src={getHeroForTab(t.value)}
          isActive={activeTab === t.value}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-black z-20 pointer-events-none" />
    </section>
  );
}

interface GallerySectionProps {
  initialTab?: string;
  arm?: "digital" | "productions";
  showHero?: boolean;
  photographyEvents?: PhotographyEvent[]; 
  graphicImages?: string[];
  videographyUrls?: VideoProject[];  
  videoEditingUrls?: VideoProject[];
  eventProductionUrls?: VideoProject[];
  webProjects?: WebDevImage[];      
  webDetailsMap?: Record<string, SiteDetails>; 
}

const GallerySection = ({
  initialTab,
  arm,
  showHero = !arm,
  photographyEvents = [],
  graphicImages = [],
  videographyUrls = [],
  videoEditingUrls = [],
  eventProductionUrls = [],
  webProjects = [],
  webDetailsMap = {},
}: GallerySectionProps) => {

  const router = useRouter();
  const defaultTab = arm === "digital" ? "web-dev" : "photography";
  const [activeTab, setActiveTab] = useState(initialTab || defaultTab);
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  const isDigital = arm === "digital";
  const isProductions = arm === "productions";

  const availableTabs = isDigital
    ? DIGITAL_WORK_TABS
    : isProductions
    ? PRODUCTIONS_WORK_TABS
    : ALL_WORK_TABS;

  const basePath = isDigital
    ? "/digital"
    : isProductions
    ? "/productions"
    : "/projects";

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const title = TAB_TITLES[activeTab];
    if (title) {
      document.title = title;
    }
    const desc = TAB_DESCRIPTIONS[activeTab];
    if (desc) {
      const descMeta = document.querySelector('meta[name="description"]');
      if (descMeta) descMeta.setAttribute("content", desc);
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute("content", title);
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute("content", desc);
    }
  }, [activeTab]);

  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== "undefined") {
        const pathSegments = window.location.pathname.split("/").filter(Boolean);
        const lastSegment = pathSegments[pathSegments.length - 1];
        if (availableTabs.some((t) => t.value === lastSegment)) {
          setActiveTab(lastSegment);
        }
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [availableTabs]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setLightboxIndex(-1);
    if (typeof window !== "undefined") {
      const targetUrl = `${basePath}/${tab}`;
      if (window.location.pathname !== targetUrl) {
        window.history.pushState({ tab }, "", targetUrl);
      }
      if (TAB_TITLES[tab]) {
        document.title = TAB_TITLES[tab];
      }
    }
  };

  const activeLabel = availableTabs.find((t) => t.value === activeTab)?.label ?? "";

  const lightboxSlides =
    activeTab === "photography"
      ? photographyEvents.flatMap(e => e.images.map(img => ({ src: img.src, width: img.width, height: img.height })))
      : activeTab === "graphic-design"
        ? graphicImages.map((src) => ({ src }))
        : [];

  return (
    <>
      {showHero && <ProjectHero activeTab={activeTab} />}

      <section id="work" className="py-24 px-4 sm:px-6 lg:px-8 bg-black text-white border-t border-white/5 relative">
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-400 px-3.5 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 inline-block mb-4">
            Portfolio
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-4 tracking-tight">
            <span className="text-white">What We </span>
            <span className="bg-gradient-to-r from-brand-300 via-brand-400 to-brand-500 bg-clip-text text-transparent">
              Did
            </span>
          </h2>
          <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            {arm === "digital"
              ? "Explore live production web architectures, responsive corporate sites, and visual brand identity systems crafted by Frametoque Digital."
              : arm === "productions"
              ? "Explore our commercial photography, broadcast-grade videography, and post-production showreels crafted by Frametoque Productions."
              : `Explore our diverse portfolio of cinematic and beautiful ${activeLabel.toLowerCase()} captures.`}
          </p>
        </div>

        <div className="mb-12 sm:mb-16">
          <div className="flex justify-center">
            {/* Mobile: Wrapped */}
            <div className="flex sm:hidden flex-wrap gap-2 w-full pb-2 px-4">
              {availableTabs.map((tab) => (
                <button
                  type="button"
                  key={tab.value}
                  onClick={() => handleTabChange(tab.value)}
                  className={`
                    flex-1 min-w-[calc(50%-4px)] max-w-[calc(50%-4px)] px-3 py-2.5 rounded-full text-xs font-medium transition-all duration-300 text-center cursor-pointer
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

            {/* Desktop: Centered pill row */}
            <div className="hidden sm:inline-flex p-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
              {availableTabs.map((tab) => (
                <button
                  type="button"
                  key={tab.value}
                  onClick={() => handleTabChange(tab.value)}
                  className={`
                    relative whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 cursor-pointer
                    ${activeTab === tab.value ? "text-white" : "text-gray-400 hover:text-white"}
                  `}
                >
                  {activeTab === tab.value && (
                    <motion.div
                      layoutId={`activeTab-${arm || "all"}`}
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
            {activeTab === "photography" && (
              <PhotographyGallery events={photographyEvents} onOpen={setLightboxIndex} />
            )}
            {activeTab === "graphic-design" && (
              <GraphicDesignGallery images={graphicImages} onOpen={setLightboxIndex} />
            )}
            {activeTab === "videography"   && <VideographyGallery urls={videographyUrls} />}
            {activeTab === "event-productions" && (
              <VideographyGallery urls={eventProductionUrls && eventProductionUrls.length > 0 ? eventProductionUrls : videographyUrls} />
            )}
            {activeTab === "video-editing" && <VideoEditingGallery urls={videoEditingUrls} arm={arm} />}
            {activeTab === "web-dev"       && <WebDevelopingGallery projects={webProjects} detailsMap={webDetailsMap} />}
          </motion.div>
        </AnimatePresence>

        <Lightbox
          open={lightboxIndex >= 0}
          index={lightboxIndex >= 0 ? lightboxIndex : 0}
          close={() => setLightboxIndex(-1)}
          slides={lightboxSlides}
          plugins={[Zoom]}
          controller={{ closeOnBackdropClick: true }}
          zoom={{ maxZoomPixelRatio: 3 }}
        />
      </section>
    </>
  );
};

export default GallerySection;