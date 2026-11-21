"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Globe, X, ExternalLink, Monitor, Loader2, Smartphone } from "lucide-react";
import { type SiteDetails } from "../../lib/workdata";

export function ServiceDemoPopup({
  site,
  onClose,
}: {
  site: SiteDetails;
  onClose: () => void;
}) {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
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
    if (viewMode === "cover") return;

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
              <a
                href={site.url}
                target="_blank"
                rel="noopener noreferrer"
                title="Open demo in new tab"
                className="w-full max-w-4xl flex items-center justify-between gap-2 px-4 py-1.5 rounded-xl bg-[#0d0d0d] hover:bg-[#161616] text-xs text-white/60 hover:text-white font-mono truncate shadow-inner shadow-black transition-colors"
              >
                <div className="flex items-center gap-2 truncate">
                  <Globe className="w-3.5 h-3.5 shrink-0 text-brand-400" />
                  <span className="truncate">{site.url}</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 shrink-0 text-white/40 group-hover:text-white" />
              </a>
            </div>
          </div>

          <div 
            ref={containerRef}
            className="flex-1 w-full relative overflow-hidden min-h-[40vh] lg:min-h-[60vh] flex items-center justify-center bg-black/80"
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
              <div className="relative w-full h-full bg-[#0a0a0a] overflow-hidden flex items-center justify-center">
                {site.image ? (
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

        <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 p-6 lg:p-8 overflow-y-auto border-t lg:border-t-0 lg:border-l border-white/10 bg-[#0a0a0a] flex flex-col justify-between">
          <div>
            {viewMode === "live" && (
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
            )}

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

            {site.techs && site.techs.filter(t => t.trim().length > 0).length > 0 && (
              <div className="mb-8">
                <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4">
                  Technologies
                </h4>
                <div className="flex flex-wrap gap-2">
                  {site.techs.filter(t => t.trim().length > 0).map((tech) => (
                    <span
                      key={tech}
                      className="px-3 py-1.5 rounded-md bg-white/5 border border-white/5 text-white/80 text-[12px] font-medium hover:bg-white/10 hover:border-white/10 transition-all duration-300 shadow-sm"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}
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
