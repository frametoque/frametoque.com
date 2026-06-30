"use client";

import { useState, useRef, useEffect } from "react";
import { type VideoProject } from "../../lib/workdata";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Volume2, VolumeX } from "lucide-react";

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: {
      Player: any;
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number; };
    };
  }
}

let ytApiPromise: Promise<void> | null = null;
function loadYouTubeAPI(): Promise<void> {
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) { resolve(); return; }
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName("script")[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    const existingOnReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (existingOnReady) existingOnReady();
      resolve();
    };
  });
  return ytApiPromise;
}

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

function VideoCard({ project, onClick, index, onExpand, isAnyModalOpen, activeInlineIndex, onPlayStart }: any) {
  const { url } = project;
  const id = getYouTubeId(url);
  const isShort = isYouTubeShort(url);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isThumbLoaded, setIsThumbLoaded] = useState(false);
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hasInitialized = useRef(false);
  const isReady = useRef(false);
  const pendingPlay = useRef(false);
  const { thumbUrl, handleError } = useImageFallback(url);

  const safeCall = (method: string, ...args: any[]) => {
    const p = playerRef.current;
    if (isReady.current && p && typeof p[method] === "function") {
      p[method](...args);
    }
  };

  const initPlayer = async () => {
    if (hasInitialized.current || !iframeRef.current) return;
    hasInitialized.current = true;
    pendingPlay.current = true;
    await loadYouTubeAPI();
    playerRef.current = new window.YT.Player(iframeRef.current, {
      events: {
        onReady: (event: any) => {
          isReady.current = true;
          if (pendingPlay.current) {
            event.target.unMute();
            event.target.playVideo();
            setIsPlaying(true);
            onPlayStart(index);
            pendingPlay.current = false;
          }
        },
        onStateChange: (event: any) => {
          if (event.data === window.YT.PlayerState.PLAYING) setIsPlaying(true);
          else if (event.data === window.YT.PlayerState.PAUSED || event.data === window.YT.PlayerState.ENDED) setIsPlaying(false);
        },
      },
    });
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || isAnyModalOpen) {
            safeCall("pauseVideo");
            setIsPlaying(false);
          }
        });
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isAnyModalOpen]);

  useEffect(() => {
    if (isAnyModalOpen && isPlaying) { safeCall("pauseVideo"); setIsPlaying(false); }
  }, [isAnyModalOpen, isPlaying]);

  useEffect(() => {
    if (activeInlineIndex !== null && activeInlineIndex !== index && isPlaying) { safeCall("pauseVideo"); setIsPlaying(false); }
  }, [activeInlineIndex, index, isPlaying]);

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasInitialized.current) { initPlayer(); return; }
    if (!isReady.current) { pendingPlay.current = true; return; }
    if (isPlaying) {
      safeCall("pauseVideo");
      setIsPlaying(false);
    } else {
      safeCall("unMute");
      safeCall("playVideo");
      setIsPlaying(true);
      onPlayStart(index);
    }
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentTime = isReady.current && typeof playerRef.current?.getCurrentTime === "function"
      ? playerRef.current.getCurrentTime()
      : 0;
    onExpand(url, currentTime);
  };

  if (!id) return null;
  const embedUrl = `https://www.youtube.com/embed/${id}?enablejsapi=1&autoplay=0&mute=0&loop=1&playlist=${id}&controls=0&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3`;

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      style={{ gridColumn: `span ${isShort ? 1 : 2} / span ${isShort ? 1 : 2}`, gridRow: `span ${isShort ? 2 : 1} / span ${isShort ? 2 : 1}` }}
      className="relative cursor-pointer group overflow-hidden bg-neutral-900 rounded-sm"
      onClick={handleTogglePlay}
    >
      <div className={isShort ? "aspect-[9/16]" : "aspect-video"}>
        <AnimatePresence>
          {!isPlaying && (
            <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }} className="absolute inset-0 z-10">
              {!isThumbLoaded && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />}
              <Image src={thumbUrl} alt="Thumbnail thumbnail" fill className={`object-cover transition-opacity duration-500 ${isThumbLoaded ? "opacity-100" : "opacity-0"}`} onLoad={() => setIsThumbLoaded(true)} onError={handleError} sizes="(max-width: 768px) 100vw, 33vw" />
            </motion.div>
          )}
        </AnimatePresence>
        <iframe ref={iframeRef} src={embedUrl} title="YouTube video player" allow="autoplay; encrypted-media" className="w-full h-full border-0 pointer-events-none" />
      </div>
     <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
        <div
          onClick={handleTogglePlay}
          className={`
            w-12 h-12 rounded-full bg-gradient-to-br from-brand-400 via-brand-500 to-brand-600
            flex items-center justify-center shadow-lg shadow-brand-500/40
            pointer-events-auto hover:scale-110 transition-all duration-300
            ${isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"}
          `}
        >
          {!isPlaying
            ? <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white ml-1"><path d="M8 5v14l11-7z" /></svg>
            : <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
          }
        </div>
      </div>
      <button onClick={handleExpandClick} className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/60 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-black/80"><svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" /></svg></button>
    </motion.div>
  );
}

function formatTime(seconds: number) {
  if (isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function VideoModal({ url, startTime = 0, onClose }: any) {
  const id = getYouTubeId(url);
  const isShort = isYouTubeShort(url);
  const overlayRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [showControls, setShowControls] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];


  const changeVolume = (val: number) => {
  setVolume(val);
  playerRef.current?.setVolume?.(val);

  if (val === 0) setIsMuted(true);
  else setIsMuted(false);
};

const toggleMute = () => {
  if (!playerRef.current) return;

  if (isMuted) {
    playerRef.current.unMute();
    playerRef.current.setVolume(volume || 100);
    setIsMuted(false);
  } else {
    playerRef.current.mute();
    setIsMuted(true);
  }
};

const changeSpeed = (rate: number) => {
  setSpeed(rate);
  playerRef.current?.setPlaybackRate?.(rate);
};



  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", handler); };
  }, [onClose]);

  useEffect(() => {
    if (id) {
      loadYouTubeAPI().then(() => {
        if (iframeRef.current && !playerRef.current) {
          playerRef.current = new window.YT.Player(iframeRef.current, {
            events: {
              onReady: (event: any) => {
                if (startTime > 0) event.target.seekTo(startTime, true);
                event.target.setVolume(volume);
                event.target.setPlaybackRate(speed); 
                event.target.playVideo();
                setDuration(event.target.getDuration() || 0);
              },
              onStateChange: (event: any) => {
                if (event.data === 1) { setIsPlaying(true); setDuration(event.target.getDuration()); }
                else if (event.data === 2 || event.data === 0) setIsPlaying(false);
              },
            },
          });
        }
      });
    }
  }, [id, startTime]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) interval = setInterval(() => { if (playerRef.current?.getCurrentTime) setProgress(playerRef.current.getCurrentTime()); }, 500);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => { if (isPlaying) setShowControls(false); }, 2500);
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) playerRef.current?.pauseVideo?.();
    else playerRef.current?.playVideo?.();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setProgress(time);
    playerRef.current?.seekTo?.(time, true);
  };

  if (!id) return null;
  const embedUrl = `https://www.youtube.com/embed/${id}?enablejsapi=1&autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=0&playsinline=1&start=${Math.floor(startTime)}`;

  return (
    <motion.div ref={overlayRef} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4" onClick={(e) => { if (e.target === overlayRef.current) onClose(); }} onMouseMove={handleMouseMove} onTouchStart={handleMouseMove}>
      <div className="relative">
        <button className="absolute -top-12 right-0 text-white/50 hover:text-white p-2 z-[60]" onClick={onClose}><svg viewBox="0 0 24 24" className="w-8 h-8 stroke-current stroke-1"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className={`relative shadow-[0_0_50px_rgba(0,0,0,0.8)] rounded-md overflow-hidden ${isShort ? "w-[min(90vw,calc(90vh*9/16))] aspect-[9/16]" : "w-[min(95vw,calc(90vh*16/9))] aspect-video"}`}>
          <div className="w-full h-full bg-black relative group">
            <div className="absolute inset-0 z-10 cursor-pointer" onClick={togglePlay} />
            <iframe ref={iframeRef} src={embedUrl} allow="autoplay; fullscreen" className="w-full h-full border-0 pointer-events-none" />
            <AnimatePresence>
              {showControls && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="absolute bottom-0 left-0 right-0 z-20 px-4 py-4 bg-gradient-to-t from-black/90 to-transparent flex items-center gap-4">
                  <button onClick={togglePlay} className="text-white hover:text-brand-400">
                    {isPlaying ? <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg> : <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current"><path d="M8 5v14l11-7z" /></svg>}
                  </button>
                  <div className="text-white text-xs font-mono">{formatTime(progress)}</div>
                  <div className="flex-grow relative h-2 group/slider cursor-pointer flex items-center">
                    <input type="range" min={0} max={duration || 100} value={progress} onChange={handleSeek} className="absolute z-30 w-full h-full opacity-0 cursor-pointer" />
                    <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden relative"><div className="absolute inset-y-0 left-0 bg-brand-500" style={{ width: `${(progress / (duration || 1)) * 100}%` }} /></div>
                  </div>
                 <div className="relative">
                <button
                  onClick={() => setShowSpeedMenu((prev) => !prev)}
                  className="text-white text-xs px-2 py-1 rounded hover:bg-white/10 transition"
                >
                  {speed}x
                </button>

                {showSpeedMenu && (
                  <div className="absolute bottom-full mb-2 left-0 bg-black/90 backdrop-blur-md rounded-md p-1 shadow-lg">
                    {speedOptions.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          changeSpeed(s);
                          setShowSpeedMenu(false);
                        }}
                        className={`block w-full text-left px-3 py-1 text-xs rounded hover:bg-white/10 ${
                          speed === s ? "text-brand-400" : "text-white"
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

                  <div className="flex items-center gap-2 w-24">
                    <button onClick={toggleMute} className="text-white text-xs">
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-4 h-4 text-white" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-white" />
                      )}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={volume}
                      onChange={(e) => changeVolume(Number(e.target.value))}
                      className="w-full accent-brand-500"
                    />
                  </div>

                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

export function VideoEditingGallery({ urls }: { urls: VideoProject[] }) { 
  const [activeProject, setActiveProject] = useState<any>(null);
  const [unmuteIndex, setUnmuteIndex] = useState<number | null>(null);
  const handleExpand = (url: string, startTime: number) => { setActiveProject({ url, startTime }); };

  return (
    <>
      <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-2 md:grid-cols-6 gap-4 auto-rows-min">
        {urls.map((project, i) => ( 
          <VideoCard key={i} project={project} index={i} onClick={() => handleExpand(project.url, 0)} onExpand={handleExpand} isAnyModalOpen={!!activeProject} activeInlineIndex={unmuteIndex} onPlayStart={setUnmuteIndex} />
        ))}
      </div>
      <AnimatePresence>
        {activeProject && <VideoModal url={activeProject.url} startTime={activeProject.startTime} onClose={() => setActiveProject(null)} />}
      </AnimatePresence>
    </>
  );
}
