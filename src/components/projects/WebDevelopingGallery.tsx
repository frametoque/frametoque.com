"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Globe, X, ExternalLink, Monitor, Loader2, Smartphone, Eye, ArrowUpRight } from "lucide-react";
import { type WebDevImage, type SiteDetails } from "../../lib/workdata"; 

export function WebProjectPopup({
  site,
  initialMode = "desktop",
  onClose,
}: {
  site: SiteDetails;
  initialMode?: "desktop" | "mobile";
  onClose: () => void;
}) {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">(initialMode);
  const [embeddable, setEmbeddable] = useState<boolean | null>(null);
  const [viewMode, setViewMode] = useState<"live" | "cover">("live");
  const [checkingEmbed, setCheckingEmbed] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let isMounted = true;
    async function check() {
      try {
        setCheckingEmbed(true);
        const res = await fetch(`/api/proxy/check-embed?url=${encodeURIComponent(site.url)}`);
        if (!res.ok) throw new Error("Check failed");
        const data = await res.json();
        if (isMounted) {
          if (!data.embeddable) {
            setEmbeddable(false);
            setViewMode("cover");
          } else {
            setEmbeddable(true);
            setViewMode("live");
          }
        }
      } catch {
        if (isMounted) {
          setEmbeddable(true);
        }
      } finally {
        if (isMounted) setCheckingEmbed(false);
      }
    }
    check();
    return () => {
      isMounted = false;
    };
  }, [site.url]);

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
  }, [previewMode, iframeLoaded, viewMode]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 lg:p-6">
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-[95vw] lg:max-w-[90vw] xl:max-w-7xl max-h-[92vh] sm:max-h-[95vh] bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col lg:flex-row animate-in fade-in zoom-in-95 duration-300">
        <div className="flex-1 relative bg-black/50 min-h-0 flex flex-col">
          {/* Browser Header Bar */}
          <div className="flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-5 py-2.5 sm:py-3 bg-white/5 backdrop-blur-md border-b border-white/10 shrink-0">
            {/* Window Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500/80 shadow-[0_0_5px_rgba(239,68,68,0.5)]" />
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-500/80 shadow-[0_0_5px_rgba(234,179,8,0.5)]" />
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500/80 shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
            </div>

            {/* Address Bar */}
            <div className="flex-1 min-w-0 mx-1 sm:mx-2 flex justify-center max-w-xl">
              <a
                href={site.url}
                target="_blank"
                rel="noopener noreferrer"
                title="Open site in new tab"
                className="w-full flex items-center justify-between gap-2 px-3 sm:px-4 py-1.5 rounded-xl bg-[#0d0d0d] hover:bg-[#161616] text-[11px] sm:text-xs text-white/60 hover:text-white font-medium truncate shadow-inner shadow-black transition-colors"
              >
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 truncate">
                  <Globe className="w-3.5 h-3.5 shrink-0 text-brand-400" />
                  <span className="truncate">{site.url}</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 shrink-0 text-white/40 group-hover:text-white" />
              </a>
            </div>

            {/* Integrated Close Button (Never overlaps Address Bar) */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer shrink-0"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div 
            ref={containerRef}
            className="flex-1 w-full relative overflow-hidden h-[36vh] sm:h-[44vh] lg:h-auto min-h-[220px] lg:min-h-[60vh] flex items-center justify-center bg-black/80"
          >
            {checkingEmbed ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10 pointer-events-none">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-8 h-8 text-brand-400 animate-spin drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                  <span className="text-white/50 text-sm font-medium tracking-wide">Connecting to live environment...</span>
                </div>
              </div>
            ) : null}

            {viewMode === "cover" ? (
              <div className="relative w-full h-full bg-[#0a0a0a] overflow-hidden flex items-center justify-center p-4">
                {previewMode === "mobile" && (site.mobile_image || site.image) ? (
                  <div className="relative h-[92%] aspect-[9/19] rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10 flex items-center justify-center">
                    <Image
                      src={site.mobile_image || site.image}
                      alt={`${site.title} Mobile View`}
                      fill
                      className="object-cover object-top"
                      priority
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pt-12 pb-6 px-4 flex justify-center z-10">
                      <a
                        href={site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs sm:text-sm shadow-xl shadow-brand-500/30 transition-all duration-300 hover:scale-105 active:scale-95"
                      >
                        <Globe className="w-4 h-4" />
                        <span>Open in New Tab</span>
                        <ExternalLink className="w-3.5 h-3.5 ml-0.5 opacity-80" />
                      </a>
                    </div>
                  </div>
                ) : site.image ? (
                  <>
                    <Image
                      src={site.image}
                      alt={site.title}
                      fill
                      className="object-cover object-top"
                      priority
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pt-12 pb-6 px-6 flex justify-center z-10">
                      <a
                        href={site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs sm:text-sm shadow-xl shadow-brand-500/30 transition-all duration-300 hover:scale-105 active:scale-95"
                      >
                        <Globe className="w-4 h-4" />
                        <span>Open in New Tab</span>
                        <ExternalLink className="w-3.5 h-3.5 ml-0.5 opacity-80" />
                      </a>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center p-8 sm:p-12 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md max-w-md w-full text-center">
                    <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-4">
                      <Globe className="w-8 h-8 text-brand-400" />
                    </div>
                    <a
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs sm:text-sm shadow-xl shadow-brand-500/30 transition-all duration-300 hover:scale-105 active:scale-95"
                    >
                      <Globe className="w-4 h-4" />
                      <span>Open in New Tab</span>
                      <ExternalLink className="w-3.5 h-3.5 ml-0.5 opacity-80" />
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <>
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
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation allow-modals"
                />
              </>
            )}
          </div>
        </div>

        <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 p-4 sm:p-6 lg:p-8 overflow-y-auto border-t lg:border-t-0 lg:border-l border-white/10 bg-[#0a0a0a] flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center p-0.5 rounded-full bg-[#1c1c1e] border border-white/10 shadow-inner mb-3 sm:mb-6">
              <button
                type="button"
                onClick={() => setPreviewMode("desktop")}
                className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-1.5 rounded-full text-[10px] sm:text-[11px] font-bold tracking-widest uppercase transition-all duration-300 cursor-pointer ${
                  previewMode === "desktop"
                    ? "bg-[#333336] text-white shadow-md shadow-black/50"
                    : "text-white/40 hover:text-white/80"
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("mobile")}
                className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-1.5 rounded-full text-[10px] sm:text-[11px] font-bold tracking-widest uppercase transition-all duration-300 cursor-pointer ${
                  previewMode === "mobile"
                    ? "bg-[#333336] text-white shadow-md shadow-black/50"
                    : "text-white/40 hover:text-white/80"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile</span>
              </button>
            </div>

            <h3 className="text-lg sm:text-2xl font-black leading-tight mb-2 sm:mb-4 tracking-tight drop-shadow-md">
               <span className="bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">
                 {site.title.split('|')[0] || site.title}
               </span>
               {site.title.split('|')[1] && (
                 <span className="bg-gradient-to-b from-brand-400 to-brand-600 bg-clip-text text-transparent block mt-0.5 sm:mt-1 text-sm sm:text-lg">
                   {site.title.split('|')[1]}
                 </span>
               )}
            </h3>

            <p className="text-gray-400/90 text-xs sm:text-sm leading-relaxed mb-4 sm:mb-8 font-medium">
              {site.description}
            </p>
          </div>

          <motion.a
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="group mt-auto w-full inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 transition-all duration-300 text-white text-xs sm:text-[13px] font-bold tracking-wider relative overflow-hidden shadow-md shadow-brand-500/20"
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

interface ProjectRowItem {
  domain: string;
  title: string;
  subtitle: string;
  desktopImg: string;
  mobileImg?: string;
  url: string;
  siteForPopup: SiteDetails;
}

function WebProjectCard({
  row,
  index,
  onClick,
}: {
  row: ProjectRowItem;
  index: number;
  onClick: () => void;
}) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      onClick={onClick}
      className="relative aspect-[16/10] w-full min-w-0 group overflow-hidden rounded-lg sm:rounded-xl bg-neutral-900 border border-white/10 hover:border-brand-500/50 transition-all duration-300 shadow-md hover:shadow-2xl cursor-pointer"
    >
      <AnimatePresence>
        {!isLoaded && (
          <motion.div
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-neutral-900 flex items-center justify-center z-10"
          >
            <div
              className="w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer"
              style={{ backgroundSize: "200% 100%" }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Image
        src={row.desktopImg}
        alt={`${row.title} Desktop View`}
        fill
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        className={`object-cover object-top transition-all duration-1000 group-hover:scale-105 ${
          isLoaded ? "opacity-100 blur-0" : "opacity-0 blur-xl scale-110"
        }`}
        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
      />

      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 pointer-events-none" />
      <div className="absolute inset-0 border border-white/0 group-hover:border-white/10 transition-colors duration-300 pointer-events-none" />

      {/* Hover Reveal Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 sm:p-5 flex flex-col justify-end z-30">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-white mb-0.5 line-clamp-1 drop-shadow-md">
            {row.title}
          </h3>
          <p className="text-[11px] sm:text-xs text-brand-300/90 font-medium mb-3 truncate">
            {row.domain}
          </p>

          <div className="flex items-center gap-2 pt-0.5">
            <span className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 transition-colors shadow-md">
              <Eye className="w-3.5 h-3.5" />
              <span>View Details</span>
            </span>

            <a
              href={row.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-md"
              title="Open Live Website"
            >
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function WebDevelopingGallery({
  projects,
  detailsMap,
}: {
  projects: WebDevImage[];
  detailsMap: Record<string, SiteDetails>;
}) {
  const [popupState, setPopupState] = useState<{ site: SiteDetails; mode: "desktop" | "mobile" } | null>(null);

  const projectRows: ProjectRowItem[] = useMemo(() => {
    return projects.map((item) => {
      const site = detailsMap[item.domain];
      const mobileImg = item.mobile_image || site?.mobile_image;

      const fullUrl = site?.url || (item.domain.startsWith("http") ? item.domain : `https://${item.domain}`);
      const cleanTitle = site?.title ? site.title.split("|")[0].trim() : item.domain;
      const cleanSubtitle = site?.title && site.title.includes("|") ? site.title.split("|")[1].trim() : "Production Build";

      const siteForPopup: SiteDetails = {
        domain: item.domain,
        title: site?.title || item.domain,
        description: site?.description || "",
        url: fullUrl,
        image: site?.image || item.image,
        mobile_image: mobileImg,
      };

      return {
        domain: item.domain,
        title: cleanTitle,
        subtitle: cleanSubtitle,
        desktopImg: site?.image || item.image,
        mobileImg: mobileImg || undefined,
        url: fullUrl,
        siteForPopup,
      };
    });
  }, [projects, detailsMap]);

  return (
    <>
      {/* Websites Grid (Desktop View) */}
      <div className="max-w-[1680px] mx-auto px-2 sm:px-4 lg:px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 lg:gap-3.5">
        {projectRows.map((row, index) => (
          <WebProjectCard
            key={row.domain}
            row={row}
            index={index}
            onClick={() => setPopupState({ site: row.siteForPopup, mode: "desktop" })}
          />
        ))}
      </div>

      {popupState && (
        <WebProjectPopup
          site={popupState.site}
          initialMode={popupState.mode}
          onClose={() => setPopupState(null)}
        />
      )}
    </>
  );
}
