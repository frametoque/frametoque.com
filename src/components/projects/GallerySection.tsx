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

import { photographyImages } from "./photography-data";
import { graphicImages } from "./images";

const TABS = [
  { label: "Photography", value: "photography" },
  { label: "Videography", value: "videography" },
  { label: "Video Editing", value: "video-editing" },
  { label: "Graphic Designing", value: "graphic-design" },
  { label: "Web Developing", value: "web-dev" },
];

function getHeroForTab(tab: string): string {
  switch (tab) {
    case "photography":
      return "/projects/photography-cover.jpg";
    case "videography":
      return "/projects/videography-cover.jpg";
    case "graphic-design":
      return "/projects/graphic-design-cover.jpg";
    case "video-editing":
      return "/projects/vid-edit-cover.jpg";
    case "web-dev":
      return "/projects/web-dev-cover.jpg";
    default:
      return "/projects/vid-edit-cover.jpg";
  }
}

function SingleHeroImage({
  tab,
  label,
  src,
  isActive,
}: {
  tab: string;
  label: string;
  src: string;
  isActive: boolean;
}) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const isYoutube = tab === "videography" && src.includes("ytimg.com");

  // Keep state in sync if src prop changes
  useEffect(() => {
    setCurrentSrc(src);
  }, [src]);

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
      priority={isActive} // Only prioritize fetching the active one instantly
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
      {TABS.map((t) => (
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
}

const GallerySection = ({ initialTab = "photography" }: GallerySectionProps) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setLightboxIndex(-1);
    router.push(`/projects/${tab}`);
  };

  const activeLabel = TABS.find((t) => t.value === activeTab)?.label ?? "";
  const heroImage = getHeroForTab(activeTab);

  const lightboxSlides =
    activeTab === "photography"
      ? photographyImages.map((img) => ({ src: img.src, width: img.width, height: img.height }))
      : activeTab === "graphic-design"
        ? graphicImages.map((src) => ({ src }))
        : [];

  return (
    <>
      <ProjectHero activeTab={activeTab} />

      <section className="py-24 px-4 bg-black text-white">
        <div className="text-center mb-10 sm:mb-14">
          <h2 className="text-5xl sm:text-4xl md:text-4xl lg:text-6xl font-black mb-4 sm:mb-6 tracking-tight">
            <span className="bg-gradient-to-b from-brand-400 to-brand-600 bg-clip-text text-transparent">
              {activeLabel.split(" ")[0]}
            </span>
            {activeLabel.split(" ").length > 1 && (
              <span className="bg-gradient-to-b from-white to-gray-300 bg-clip-text text-transparent">
                {" "}
                {activeLabel.split(" ").slice(1).join(" ")}
              </span>
            )}
          </h2>
          <p className="text-gray-400 text-base sm:text-lg max-w-3xl mx-auto leading-relaxed">
            Explore our diverse portfolio of cinematic and beautiful{" "}
            {activeLabel.toLowerCase()} captures.
          </p>
        </div>

        <div className="mb-12 sm:mb-16">
          <div className="flex justify-center">
          {/* Mobile: Wrapped */}
          <div className="flex sm:hidden flex-wrap gap-2 w-full pb-2 px-4">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => handleTabChange(tab.value)}
                className={`
                  flex-1 min-w-[calc(50%-4px)] max-w-[calc(50%-4px)] px-3 py-2.5 rounded-full text-xs font-medium transition-all duration-300 text-center
                  ${
                    activeTab === tab.value
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
                      layoutId="activeTab"
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
            {activeTab === "photography" && <PhotographyGallery onOpen={setLightboxIndex} />}
            {activeTab === "graphic-design" && <GraphicDesignGallery onOpen={setLightboxIndex} />}
            {activeTab === "videography" && <VideographyGallery />}
            {activeTab === "video-editing" && <VideoEditingGallery />}
            {activeTab === "web-dev" && <WebDevelopingGallery />}
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