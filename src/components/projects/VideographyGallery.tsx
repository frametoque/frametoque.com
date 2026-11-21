"use client";

import { useState, useRef, useEffect } from "react";
import { type VideoProject } from "../../lib/workdata";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}

function isYouTubeShort(url: string): boolean {
  return /youtube\.com\/shorts\//.test(url);
}

function getYouTubeThumbnail(url: string, quality: "maxres" | "hq" = "maxres"): string {
  const id = getYouTubeId(url);
  if (!id) return "";
  return quality === "maxres"
    ? `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`
    : `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

function useImageFallback(url: string) {
  const [thumbUrl, setThumbUrl] = useState(() => getYouTubeThumbnail(url, "maxres"));
  useEffect(() => { setThumbUrl(getYouTubeThumbnail(url, "maxres")); }, [url]);
  const handleError = () => { if (thumbUrl.includes("maxresdefault")) setThumbUrl(getYouTubeThumbnail(url, "hq")); };
  return { thumbUrl, handleError };
}

function VideoCard({ project, index, onExpand, isAnyModalOpen, activeInlineIndex, onPlayStart }: any) {
  const { url } = project;
  const id = getYouTubeId(url);
  const isShort = isYouTubeShort(url);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isThumbLoaded, setIsThumbLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { thumbUrl, handleError } = useImageFallback(url);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || isAnyModalOpen) {
            setIsPlaying(false);
          }
        });
      },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isAnyModalOpen]);

  useEffect(() => {
    if (isAnyModalOpen && isPlaying) {
      setIsPlaying(false);
    }
  }, [isAnyModalOpen, isPlaying]);

  useEffect(() => {
    if (activeInlineIndex !== null && activeInlineIndex !== index && isPlaying) {
      setIsPlaying(false);
    }
  }, [activeInlineIndex, index, isPlaying]);

  const handleStartPlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(true);
    onPlayStart(index);
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onExpand(url, 0);
  };

  if (!id) return null;

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      style={{
        gridColumn: `span ${isShort ? 1 : 2} / span ${isShort ? 1 : 2}`,
        gridRow: `span ${isShort ? 2 : 1} / span ${isShort ? 2 : 1}`,
      }}
      className="relative cursor-pointer group overflow-hidden bg-neutral-900 rounded-xl"
      onClick={!isPlaying ? handleStartPlay : undefined}
    >
      <div className={isShort ? "aspect-[9/16]" : "aspect-video"}>
        {!isPlaying ? (
          <>
            <div className="absolute inset-0 z-10">
              {!isThumbLoaded && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
              )}
              <Image
                src={thumbUrl}
                alt={project.title || "Video thumbnail"}
                fill
                className={`object-cover transition-opacity duration-500 ${
                  isThumbLoaded ? "opacity-100" : "opacity-0"
                }`}
                onLoad={() => setIsThumbLoaded(true)}
                onError={handleError}
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>
            {/* Play Button Overlay */}
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-400 via-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/40 group-hover:scale-110 transition-all duration-300">
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white ml-1">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </>
        ) : (
          <iframe
            src={`https://www.youtube.com/embed/${id}?autoplay=1&controls=1&rel=0&modestbranding=1&playsinline=1`}
            title={project.title || "YouTube video player"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="w-full h-full border-0 relative z-10"
          />
        )}
      </div>

      {/* Expand Button */}
      <button
        onClick={handleExpandClick}
        className="absolute top-3 right-3 z-30 p-2 rounded-full bg-black/60 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-black/80 cursor-pointer"
        title="Open Fullscreen"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
          <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
        </svg>
      </button>
    </motion.div>
  );
}

function VideoModal({ url, startTime = 0, onClose }: any) {
  const id = getYouTubeId(url);
  const isShort = isYouTubeShort(url);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handler);
    };
  }, [onClose]);

  if (!id) return null;
  const embedUrl = `https://www.youtube.com/embed/${id}?autoplay=1&controls=1&rel=0&modestbranding=1&playsinline=1${
    startTime > 0 ? `&start=${Math.floor(startTime)}` : ""
  }`;

  return (
    <motion.div
      ref={overlayRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="relative w-full max-w-5xl">
        <button
          className="absolute -top-12 right-0 text-white/70 hover:text-white p-2 z-[60] flex items-center gap-1.5 text-sm font-medium transition-colors cursor-pointer"
          onClick={onClose}
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current stroke-2 fill-none">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>Close (ESC)</span>
        </button>

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className={`relative shadow-[0_0_50px_rgba(0,0,0,0.8)] rounded-2xl overflow-hidden bg-black mx-auto ${
            isShort
              ? "w-[min(90vw,calc(85vh*9/16))] aspect-[9/16]"
              : "w-full aspect-video"
          }`}
        >
          <iframe
            src={embedUrl}
            title="Video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="w-full h-full border-0"
          />
        </motion.div>
      </div>
    </motion.div>
  );
}

export function VideographyGallery({ urls }: { urls: VideoProject[] }) { 
  const [activeProject, setActiveProject] = useState<any>(null);
  const [unmuteIndex, setUnmuteIndex] = useState<number | null>(null);

  const handleExpand = (url: string, startTime: number) => {
    setActiveProject({ url, startTime });
  };

  return (
    <>
      <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-2 md:grid-cols-6 gap-4 auto-rows-min">
        {urls.map((project, i) => ( 
          <VideoCard
            key={i}
            project={project}
            index={i}
            onExpand={handleExpand}
            isAnyModalOpen={!!activeProject}
            activeInlineIndex={unmuteIndex}
            onPlayStart={setUnmuteIndex}
          />
        ))}
      </div>
      <AnimatePresence>
        {activeProject && (
          <VideoModal
            url={activeProject.url}
            startTime={activeProject.startTime}
            onClose={() => setActiveProject(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
