"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Globe, X, ExternalLink, Monitor, Loader2, Smartphone } from "lucide-react";
import { siteDetailsMap, webDevProjects, type WebDevImage, type SiteDetails } from "./images";

export function WebProjectPopup({
  site,
  onClose,
}: {
  site: SiteDetails;
  onClose: () => void;
}) {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  useEffect(() => {
    const container = containerRef.current;
    const iframe = iframeRef.current;
    if (!container || !iframe) return;

    const resizeIframe = () => {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      
      if (previewMode === "desktop") {
        const scale = cw / 1440;
        iframe.style.width = "1440px";
        iframe.style.height = `${ch / scale}px`;
        iframe.style.transform = `scale(${scale})`;
        iframe.style.transformOrigin = "top left";
        iframe.style.left = "0px";
        iframe.style.top = "0px";
        iframe.style.borderRadius = "0px";
      } else {
        // Mobile view (375x812) centered
        const scale = Math.min((ch - 40) / 812, cw / 375);
        iframe.style.width = "375px";
        iframe.style.height = "812px";
        iframe.style.transform = `scale(${scale})`;
        iframe.style.transformOrigin = "top left";
        
        // Center horizontally and vertically
        const scaledWidth = 375 * scale;
        const scaledHeight = 812 * scale;
        iframe.style.left = `${(cw - scaledWidth) / 2}px`;
        iframe.style.top = `${(ch - scaledHeight) / 2}px`;
        iframe.style.borderRadius = "0px";
      }
    };

    const observer = new ResizeObserver(resizeIframe);
    observer.observe(container);
    resizeIframe();
    
    return () => observer.disconnect();
  }, [previewMode, iframeLoaded]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 lg:p-6">
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-[95vw] lg:max-w-[90vw] xl:max-w-7xl max-h-[95vh] bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col lg:flex-row animate-in fade-in zoom-in-95 duration-300">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 text-white/50 hover:text-white hover:scale-110 active:scale-90 transition-all duration-300"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex-1 relative bg-black/50 min-h-0 flex flex-col">
          <div className="flex items-center gap-2 px-5 py-3 bg-white/5 backdrop-blur-md border-b border-white/10 shrink-0">
            <div className="flex gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80 shadow-[0_0_5px_rgba(239,68,68,0.5)]" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/80 shadow-[0_0_5px_rgba(234,179,8,0.5)]" />
              <span className="w-3 h-3 rounded-full bg-green-500/80 shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
            </div>
            <div className="flex-1 mx-4 flex justify-center">
              <div className="w-full max-w-4xl flex items-center gap-2 px-4 py-1.5 rounded-xl bg-[#0d0d0d] text-xs text-white/50 font-mono truncate shadow-inner shadow-black">
                <Globe className="w-3.5 h-3.5 shrink-0 opacity-70" />
                {site.url}
              </div>
            </div>
          </div>

          <div 
            ref={containerRef}
            className="flex-1 w-full relative overflow-hidden min-h-[40vh] lg:min-h-[60vh] flex items-center justify-center bg-black/80"
          >
            {!iframeLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10 pointer-events-none">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-8 h-8 text-brand-400 animate-spin drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                  <span className="text-white/50 text-sm font-medium tracking-wide">Connecting to live environment...</span>
                </div>
              </div>
            )}
            
            <iframe
              ref={iframeRef}
              src={site.url}
              title={site.title}
              className={`absolute border-none transition-all duration-700 bg-white ${
                iframeLoaded ? "opacity-100" : "opacity-0"
              } ${previewMode === "mobile" ? "shadow-[0_0_50px_rgba(0,0,0,1)] border border-white/10" : ""}`}
              onLoad={() => setIframeLoaded(true)}
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
          </div>
        </div>

        <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 p-6 lg:p-8 overflow-y-auto border-t lg:border-t-0 lg:border-l border-white/10 bg-[#0a0a0a] flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center p-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-6 shadow-sm">
              <button
                onClick={() => setPreviewMode("desktop")}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-widest uppercase transition-all duration-300 ${
                  previewMode === "desktop" ? "bg-white/10 text-white shadow-md shadow-black/50" : "text-white/40 hover:text-white/70"
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                Desktop
              </button>
              <button
                onClick={() => setPreviewMode("mobile")}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-widest uppercase transition-all duration-300 ${
                  previewMode === "mobile" ? "bg-white/10 text-white shadow-md shadow-black/50" : "text-white/40 hover:text-white/70"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                Mobile
              </button>
            </div>

            <h3 className="text-2xl font-black leading-tight mb-4 tracking-tight drop-shadow-md">
               <span className="bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">
                 {site.title.split('|')[0] || site.title}
               </span>
               {site.title.split('|')[1] && (
                 <span className="bg-gradient-to-b from-brand-400 to-brand-600 bg-clip-text text-transparent block mt-1 text-lg">
                   {site.title.split('|')[1]}
                 </span>
               )}
            </h3>

            <p className="text-gray-400/90 text-sm leading-relaxed mb-8 font-medium">
              {site.description}
            </p>

            <div className="mb-8">
              <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4">
                Technologies
              </h4>
              <div className="flex flex-wrap gap-2">
                {site.techs.map((tech) => (
                  <span
                    key={tech}
                    className="px-3 py-1.5 rounded-md bg-white/5 border border-white/5 text-white/80 text-[12px] font-medium hover:bg-white/10 hover:border-white/10 transition-all duration-300 shadow-sm"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <motion.a
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="group mt-auto w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 transition-all duration-300 text-white text-[13px] font-bold tracking-wider relative overflow-hidden shadow-md shadow-brand-500/20"
          >
            {/* Hover Shimmer Effect */}
            <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

            <Globe className="w-4 h-4 relative z-10" />
            <span className="relative z-10 uppercase">Launch Live Platform</span>
            <motion.div
              className="relative z-10"
              whileHover={{ x: 2, y: -2 }}
            >
              <ExternalLink className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          </motion.a>
        </div>
      </div>
    </div>
  );
}

export function WebDevelopingGallery() {
  const [activeSite, setActiveSite] = useState<SiteDetails | null>(null);

  return (
    <>
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {webDevProjects.map((item, i) => {
          const site = siteDetailsMap[item.domain];
          return (
            <div
              key={i}
              onClick={() => site && setActiveSite(site)}
              className="group relative overflow-hidden bg-neutral-900 cursor-pointer rounded-lg"
            >
              <Image
                src={item.image}
                alt={site?.title || item.domain}
                width={600}
                height={400}
                className="w-full h-auto aspect-video object-cover transition-transform duration-500 group-hover:scale-105 opacity-90 group-hover:opacity-70"
                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40">
                <svg
                  viewBox="0 0 24 24"
                  className="w-8 h-8 fill-white mb-2"
                >
                  <path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
                </svg>
                <span className="text-white text-sm font-medium tracking-wide">
                  {site?.title || item.domain}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {activeSite && (
        <WebProjectPopup
          site={activeSite}
          onClose={() => setActiveSite(null)}
        />
      )}
    </>
  );
}
