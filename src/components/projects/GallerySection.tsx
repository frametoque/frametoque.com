"use client";

import { useState, useRef, useEffect } from "react";
import {
  photographyImages,
  videographyURLs,
  graphicImages,
  videoEditingURLs,
  webDevProjects,
  type VideoProject,
} from "./images";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: {
      Player: any;
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
      };
    };
  }
}

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  setVolume: (volume: number) => void;
  mute: () => void;
  unMute: () => void;
  setPlaybackRate: (rate: number) => void;
  getPlaybackRate: () => number;
  setPlaybackQuality: (suggestedQuality: string) => void;
  getVideoData: () => { title: string; video_id: string; author: string };
}

let ytApiPromise: Promise<void> | null = null;
function loadYouTubeAPI(): Promise<void> {
  if (ytApiPromise) return ytApiPromise;
  
  ytApiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }
    
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

// ─── helpers ────────────────────────────────────────────────────────────────

function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

function isYouTubeShort(url: string): boolean {
  return /youtube\.com\/shorts\//.test(url);
}

function getYouTubeThumbnail(url: string, quality: 'maxres' | 'hq' = 'maxres'): string {
  const id = getYouTubeId(url);
  if (!id) return "";
  return quality === 'maxres' 
    ? `https://i.ytimg.com/vi/${id}/maxresdefault.jpg` 
    : `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/** Hook to handle HD-to-SD thumbnail fallbacks */
function useImageFallback(url: string) {
  const [thumbUrl, setThumbUrl] = useState(() => getYouTubeThumbnail(url, 'maxres'));
  
  useEffect(() => {
    setThumbUrl(getYouTubeThumbnail(url, 'maxres'));
  }, [url]);

  const handleError = () => {
    if (thumbUrl.includes('maxresdefault')) {
      setThumbUrl(getYouTubeThumbnail(url, 'hq'));
    }
  };

  return { thumbUrl, handleError };
}

// ─── types ───────────────────────────────────────────────────────────────────

interface WebDevProject {
  image: string;
  url: string;
  title: string;
}

// ─── Tab config ──────────────────────────────────────────────────────────────

const TABS = [
  { label: "Photography", value: "photography" },
  { label: "Graphic Designing", value: "graphic-design" },
  { label: "Videography", value: "videography" },
  { label: "Video Editing", value: "video-editing" },
  { label: "Web Developing", value: "web-dev" },
];

function getHeroForTab(tab: string): string {
  switch (tab) {
    case "photography":
      return photographyImages[0] ?? "/hero/photo.jpg";
    case "videography":
      return getYouTubeThumbnail(videographyURLs[0]?.url || "") || "/hero/video.jpg";
    case "graphic-design":
      return graphicImages[0] ?? "/hero/graphic.jpg";
    case "video-editing":
      return "/projects/video/edit.jpg";
    case "web-dev":
      return (webDevProjects as WebDevProject[])[0]?.image ?? "/hero/web.jpg";
    default:
      return "/hero/photo.jpg";
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function GalleryImage({
  src,
  alt,
  onClick,
  index,
}: {
  src: string;
  alt: string;
  onClick: () => void;
  index: number;
}) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      className="break-inside-avoid mb-4 cursor-pointer group relative overflow-hidden bg-neutral-900 min-h-[200px]"
      onClick={onClick}
    >
      {/* Skeleton / Placeholder */}
      <AnimatePresence>
        {!isLoaded && (
          <motion.div
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-neutral-900 flex items-center justify-center"
          >
            <div className="w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" 
                 style={{ backgroundSize: '200% 100%' }} />
          </motion.div>
        )}
      </AnimatePresence>

      <Image
        src={src}
        alt={alt}
        width={800}
        height={1000}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        className={`w-full h-auto transition-all duration-1000 group-hover:scale-105 ${
          isLoaded ? "opacity-100 blur-0" : "opacity-0 blur-xl scale-110"
        }`}
        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
      />
      
      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
      
      {/* Glassy border on hover */}
      <div className="absolute inset-0 border border-white/0 group-hover:border-white/10 transition-colors duration-300 pointer-events-none" />
    </motion.div>
  );
}

function ImageGrid({
  images,
  onOpen,
}: {
  images: string[];
  onOpen: (i: number) => void;
}) {
  return (
    <div className="max-w-7xl mx-auto columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 px-4 overflow-hidden">
      {images.map((src, i) => (
        <GalleryImage
          key={`${src}-${i}`}
          src={src}
          alt={`Gallery photo ${i + 1}`}
          index={i}
          onClick={() => onOpen(i)}
        />
      ))}
    </div>
  );
}

/** Robust Hero Banner with Fallback support */
function ProjectHero({ src, label, activeTab }: { src: string; label: string; activeTab: string }) {
  // Only use the YouTube fallback if we are in a video tab and the source looks like a YouTube ID
  const isYoutube = activeTab === 'videography' && src.includes('ytimg.com');
  const [currentSrc, setCurrentSrc] = useState(src);
  
  useEffect(() => {
    setCurrentSrc(src);
  }, [src]);

  const handleError = () => {
    if (isYoutube && currentSrc.includes('maxresdefault')) {
      setCurrentSrc(currentSrc.replace('maxresdefault', 'hqdefault'));
    }
  };

  return (
    <section className="relative h-[40vh] md:h-[35vh] w-full overflow-hidden flex items-center justify-center">
      <Image
        key={currentSrc}
        src={currentSrc}
        alt={`${label} hero`}
        fill
        priority
        onError={handleError}
        className="absolute inset-0 w-full h-full object-cover scale-105 transition-opacity duration-700"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-black" />
    </section>
  );
}



/** Inline autoplay video card with thumbnail placeholder while iframe loads */
function VideoCard({
  project,
  onClick,
  index,
  onExpand,
  isAnyModalOpen,
  activeInlineIndex,
  onPlayStart,
  layout = "standard"
}: {
  project: VideoProject;
  onClick: () => void;
  index: number;
  onExpand: (url: string, time: number) => void;
  isAnyModalOpen: boolean;
  activeInlineIndex: number | null;
  onPlayStart: (index: number) => void;
  layout?: "standard" | "dense";
}) {
  const { url, title } = project;
  const id = getYouTubeId(url);
  const isShort = isYouTubeShort(url);
  const thumb = getYouTubeThumbnail(url);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [isThumbLoaded, setIsThumbLoaded] = useState(false);
  const [isInlineActive, setIsInlineActive] = useState(false);
  const playerRef = useRef<YTPlayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { thumbUrl, handleError } = useImageFallback(url);

  // Stop in-line playback if a full-screen modal opens or another inline video plays
  useEffect(() => {
    if ((isAnyModalOpen || (activeInlineIndex !== null && activeInlineIndex !== index)) && isInlineActive) {
      if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
        playerRef.current.pauseVideo();
      }
      setIsInlineActive(false);
    }
  }, [isAnyModalOpen, activeInlineIndex, index, isInlineActive]);

  const embedUrl = id
    ? `https://www.youtube.com/embed/${id}?enablejsapi=1&autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3`
    : "";

  const handlePlayClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await loadYouTubeAPI();
    
    if (!playerRef.current) {
      const iframe = containerRef.current?.querySelector('iframe');
      if (iframe) {
        playerRef.current = new window.YT.Player(iframe, {
          events: {
            onReady: (event: any) => {
              if (typeof event.target.playVideo === 'function' && typeof event.target.unMute === 'function') {
                event.target.unMute();
                event.target.playVideo();
                // Never enable native controls inline, keeping the interface completely clean
              }
              setIsInlineActive(true);
              onPlayStart(index);
            }
          }
        });
      }
    } else {
      // Safe check for race conditions where player exists but methods haven't bound yet
      if (typeof playerRef.current.playVideo === 'function' && typeof playerRef.current.unMute === 'function') {
        playerRef.current.unMute();
        playerRef.current.playVideo();
        setIsInlineActive(true);
        onPlayStart(index);
      }
    }
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    let currentTime = 0;
    if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
      currentTime = playerRef.current.getCurrentTime();
    }
    onExpand(url, currentTime);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isInlineActive) {
      handlePlayClick(e);
    } else {
      if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
        playerRef.current.pauseVideo();
      }
      setIsInlineActive(false);
    }
  };

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      style={{
        gridColumn: `span ${layout === "dense" ? (isShort ? 1 : 2) : 2} / span ${layout === "dense" ? (isShort ? 1 : 2) : 2}`,
        gridRow: `span ${isShort ? 2 : 1} / span ${isShort ? 2 : 1}`
      }}
      className={`relative cursor-pointer group overflow-hidden bg-neutral-900 rounded-sm`}
      onClick={handleCardClick}
    >
      <div className={isShort ? "aspect-[9/16]" : "aspect-video"}>
        {/* Thumbnail shown while iframe loads */}
        {thumb && !isInlineActive && (
          <Image
            src={thumbUrl}
            alt={title}
            fill
            className={`object-cover transition-all duration-1000 ${
              isThumbLoaded ? "opacity-100 blur-0" : "opacity-0 blur-xl scale-110"
            } ${iframeLoaded && isInlineActive ? "opacity-0" : "opacity-80"}`}
            onLoad={() => setIsThumbLoaded(true)}
            onError={handleError}
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        )}

        {/* Loading shimmer */}
        {!iframeLoaded && !isThumbLoaded && !isInlineActive && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
        )}

        {id && (
          <iframe
            src={embedUrl}
            title={title}
            allow="autoplay; encrypted-media"
            className={`w-full h-full border-0 transition-opacity duration-700 ${
              iframeLoaded && isInlineActive ? "opacity-100" : "opacity-0"
            } pointer-events-none`}
            onLoad={() => setIframeLoaded(true)}
          />
        )}
      </div>

      {/* Play/Pause Button Overlay */}
      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-300 ${
        isInlineActive ? "opacity-0 group-hover:opacity-100" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
      }`}>
        <div 
          onClick={handleCardClick}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-400 via-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/40 transition-transform duration-300 pointer-events-auto hover:scale-110"
        >
          {!isInlineActive ? (
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white drop-shadow-md ml-1">
              <path d="M8 5v14l11-7z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white drop-shadow-md">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          )}
        </div>
      </div>

      {/* Inline Maximize Button (Top Right) */}
      {isInlineActive && (
        <button
          onClick={handleExpandClick}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-black/80"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
            <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
          </svg>
        </button>
      )}
    </motion.div>
  );
}

function formatTime(seconds: number) {
  if (isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function VideoModal({
  url,
  title,
  startTime = 0,
  onClose,
}: {
  url: string;
  title?: string;
  startTime?: number;
  onClose: () => void;
}) {
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
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [youtubeTitle, setYoutubeTitle] = useState("");
  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    if (id) {
      loadYouTubeAPI().then(() => {
        if (iframeRef.current && !playerRef.current) {
          playerRef.current = new window.YT.Player(iframeRef.current, {
            events: {
              onReady: (event: any) => {
                if (startTime > 0) {
                  event.target.seekTo(startTime, true);
                }
                event.target.playVideo();
                setDuration(event.target.getDuration() || 0);

                if (typeof event.target.setPlaybackQuality === 'function') {
                  event.target.setPlaybackQuality('highres');
                }

                if (typeof event.target.getVideoData === 'function') {
                  const data = event.target.getVideoData();
                  if (data && data.title) setYoutubeTitle(data.title);
                }
              },
              onStateChange: (event: any) => {
                if (typeof event.target.getVideoData === 'function') {
                  const data = event.target.getVideoData();
                  if (data && data.title) setYoutubeTitle(data.title);
                }

                if (event.data === 1) { // 1 = PLAYING
                  setIsPlaying(true);
                  setDuration(event.target.getDuration());
                } else if (event.data === 2 || event.data === 0) { // 2 = PAUSED, 0 = ENDED
                  setIsPlaying(false);
                }
              }
            }
          });
        }
      });
    }
  }, [id, startTime]);

  // Sync Progress Bar
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
          setProgress(playerRef.current.getCurrentTime());
        }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 2500);
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) {
      if (typeof playerRef.current?.pauseVideo === 'function') playerRef.current.pauseVideo();
    } else {
      if (typeof playerRef.current?.playVideo === 'function') playerRef.current.playVideo();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setProgress(time);
    if (typeof playerRef.current?.seekTo === 'function') playerRef.current.seekTo(time, true);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMuted) {
      if (typeof playerRef.current?.unMute === 'function') playerRef.current.unMute();
      setIsMuted(false);
      if (volume === 0) {
        setVolume(100);
        if (typeof playerRef.current?.setVolume === 'function') playerRef.current.setVolume(100);
      }
    } else {
      if (typeof playerRef.current?.mute === 'function') playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = Number(e.target.value);
    setVolume(vol);
    if (vol === 0) {
      setIsMuted(true);
      if (typeof playerRef.current?.mute === 'function') playerRef.current.mute();
    } else {
      setIsMuted(false);
      if (typeof playerRef.current?.unMute === 'function') playerRef.current.unMute();
      if (typeof playerRef.current?.setVolume === 'function') playerRef.current.setVolume(vol);
    }
  };

  const cycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    let nextRate = 1;
    if (playbackRate === 1) nextRate = 1.5;
    else if (playbackRate === 1.5) nextRate = 2;
    else nextRate = 1;

    setPlaybackRate(nextRate);
    if (typeof playerRef.current?.setPlaybackRate === 'function') playerRef.current.setPlaybackRate(nextRate);
  };

  if (!id) return null;

  // disablekb=1 and controls=0 to completely kill YouTube UI
  const embedUrl = `https://www.youtube.com/embed/${id}?enablejsapi=1&autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=0&disablekb=1&start=${Math.floor(startTime)}`;

  return (
    <motion.div
      ref={overlayRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 md:p-10"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      onMouseMove={handleMouseMove}
      onTouchStart={handleMouseMove}
    >
      <div className="relative">
        {/* Close Button - Outside the frame but tightly aligned to the top-right corner */}
        <button
          className="absolute -top-12 right-0 sm:top-0 sm:-right-16 text-white/50 hover:text-white transition-all duration-300 p-2 z-[60]"
          onClick={onClose}
          aria-label="Close video"
        >
          <svg viewBox="0 0 24 24" className="w-8 h-8 sm:w-10 sm:h-10 fill-none stroke-current stroke-1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className={`relative shadow-[0_0_50px_rgba(0,0,0,0.8)] rounded-md overflow-hidden ${
            isShort 
              ? "w-[min(90vw,calc(90vh*9/16))] aspect-[9/16]" 
              : "w-[min(95vw,calc(90vh*16/9))] aspect-video"
          }`}
        >
          <div className="w-full h-full bg-black border border-white/5 relative group">
          {/* Invisible overlay to catch clicks for play/pause and keep iframe isolated from hover events */}
          <div 
            className="absolute inset-0 z-10 cursor-pointer"
            onClick={togglePlay}
          />
          
          <iframe
            ref={iframeRef}
            src={embedUrl}
            title="YouTube video"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            className={`w-full h-full border-0 pointer-events-none`}
          />

          {/* Custom YouTube-style Top Title Bar */}
          <AnimatePresence>
            {showControls && title && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute top-0 left-0 right-0 pt-4 pb-16 px-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-40 pointer-events-none flex items-start"
              >
                <div className="flex items-center gap-3 w-full">
                  {/* Custom Channel Avatar matching YouTube's format */}
                  <div className="w-10 h-10 rounded-full shrink-0 overflow-hidden relative shadow-[0_0_5px_rgba(0,0,0,0.5)] border border-white/5 bg-black">
                    <Image src="/favicon-96x96.png" alt="Channel Logo" fill className="object-cover" sizes="40px" />
                  </div>
                  <div className="flex flex-col flex-1 pl-1">
                    <h2 
                      className="text-[#eee] text-[18px] leading-[22px] font-semibold drop-shadow-[0_0_3px_rgba(0,0,0,0.8)] line-clamp-1 truncate"
                      style={{ fontFamily: '"YouTube Noto", Roboto, Arial, Helvetica, sans-serif' }}
                    >
                      {youtubeTitle}
                    </h2>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Custom Bottom Control Bar */}
          <AnimatePresence>
            {showControls && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-0 left-0 right-0 z-20 px-4 py-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center gap-4"
                onClick={(e) => e.stopPropagation()}
              >
                <button onClick={togglePlay} className="text-white hover:text-brand-400 transition">
                  {isPlaying ? (
                    <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current"><path d="M8 5v14l11-7z"/></svg>
                  )}
                </button>

                <div className="text-white text-xs font-medium font-mono min-w-[40px]">
                  {formatTime(progress)}
                </div>

                <div className="flex-grow relative h-2 group/slider cursor-pointer flex items-center">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={progress}
                    onChange={handleSeek}
                    className="absolute z-30 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden relative">
                    <div 
                      className="absolute inset-y-0 left-0 bg-brand-500 transition-all duration-100 ease-linear rounded-full"
                      style={{ width: `${(progress / (duration || 1)) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="text-white/70 text-xs font-medium font-mono min-w-[40px] text-right">
                  {formatTime(duration)}
                </div>

                <div className="relative flex items-center group/volume ml-2">
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 h-0 w-8 overflow-hidden group-hover/volume:h-28 transition-all duration-300 flex flex-col items-center justify-center opacity-0 group-hover/volume:opacity-100 pb-2">
                    <div className="relative w-8 h-24 flex items-center justify-center">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="absolute z-30 w-24 h-8 opacity-0 cursor-pointer -rotate-90 pointer-events-auto"
                        aria-label="Volume"
                      />
                      <div className="w-1.5 h-full bg-white/20 rounded-full overflow-hidden relative pointer-events-none">
                        <div 
                          className="absolute bottom-0 left-0 w-full bg-brand-500 transition-all duration-100 ease-linear rounded-full"
                          style={{ height: `${isMuted ? 0 : volume}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <button onClick={toggleMute} className="text-white hover:text-brand-400 transition shrink-0" aria-label="Toggle Mute">
                    {isMuted || volume === 0 ? (
                      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                    )}
                  </button>
                </div>

                <div className="relative flex items-center ml-2">
                  <button 
                    onClick={cycleSpeed}
                    className="text-white hover:text-brand-400 transition text-sm font-mono font-bold tracking-wider w-10 text-center" 
                    aria-label="Playback Speed"
                  >
                    {playbackRate}x
                  </button>
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

/** Video grid with autoplay iframes */
function VideoGrid({ 
  projects, 
  layout = "standard" 
}: { 
  projects: VideoProject[]; 
  layout?: "standard" | "dense";
}) {
  const [activeProject, setActiveProject] = useState<{ url: string; startTime: number } | null>(null);
  const [activeInlineIndex, setActiveInlineIndex] = useState<number | null>(null);

  const handleExpand = (url: string, startTime: number) => {
    setActiveProject({ url, startTime });
  };

  return (
    <>
      <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-2 md:grid-cols-6 gap-4 auto-rows-min">
        {projects.map((project, i) => (
          <VideoCard 
            key={`${project.url}-${i}`} 
            project={project} 
            index={i}
            onClick={() => handleExpand(project.url, 0)} 
            onExpand={handleExpand}
            isAnyModalOpen={!!activeProject}
            activeInlineIndex={activeInlineIndex}
            onPlayStart={setActiveInlineIndex}
            layout={layout}
          />
        ))}
      </div>
      <AnimatePresence>
        {activeProject && (
          <VideoModal 
            url={activeProject.url} 
            title={projects.find(p => p.url === activeProject.url)?.title}
            startTime={activeProject.startTime}
            onClose={() => setActiveProject(null)} 
          />
        )}
      </AnimatePresence>
    </>
  );
}


/** Web dev grid */
function WebDevGrid({ projects }: { projects: WebDevProject[] }) {
  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {projects.map((project, i) => (
        <a
          key={i}
          href={project.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative overflow-hidden bg-neutral-900 block"
        >
          <Image
            src={project.image}
            alt={project.title}
            width={600}
            height={400}
            className="w-full h-auto aspect-video object-cover transition-transform duration-500 group-hover:scale-105 opacity-90 group-hover:opacity-70"
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40">
            <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white mb-2">
              <path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
            </svg>
            <span className="text-white text-sm font-medium tracking-wide">
              {project.title}
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

interface GallerySectionProps {
  initialTab?: string;
}

const GallerySection = ({
  initialTab = "photography",
}: GallerySectionProps) => {
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
      ? photographyImages.map((src) => ({ src }))
      : activeTab === "graphic-design"
        ? graphicImages.map((src) => ({ src }))
        : [];

  return (
    <>
        <ProjectHero src={heroImage} label={activeLabel} activeTab={activeTab} />

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
            {/* Mobile: Scrollable horizontal tabs */}
            <div className="flex sm:hidden overflow-x-auto no-scrollbar gap-2 w-full pb-2 px-4">
              {TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => handleTabChange(tab.value)}
                  className={`
                    whitespace-nowrap px-6 py-2.5 rounded-full text-xs font-medium transition-all duration-300 shrink-0
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

            {/* Desktop: Centered pill row with sliding background */}
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
            {activeTab === "photography" && (
              <>
                <ImageGrid images={photographyImages} onOpen={setLightboxIndex} />
                {photographyImages.length > 0 && <LoadMoreButton />}
              </>
            )}

            {activeTab === "graphic-design" && (
              <>
                <ImageGrid images={graphicImages} onOpen={setLightboxIndex} />
                {graphicImages.length > 0 && <LoadMoreButton />}
              </>
            )}

            {activeTab === "videography" && (
              <>
                <VideoGrid projects={videographyURLs} />
                {videographyURLs.length > 0 && <LoadMoreButton />}
              </>
            )}

            {activeTab === "video-editing" && (
              <>
                <VideoGrid projects={videoEditingURLs} layout="dense" />
                {videoEditingURLs.length > 0 && <LoadMoreButton />}
              </>
            )}

            {activeTab === "web-dev" && (
              <>
                <WebDevGrid projects={webDevProjects as WebDevProject[]} />
                {(webDevProjects as WebDevProject[]).length > 0 && (
                  <LoadMoreButton />
                )}
              </>
            )}
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

function LoadMoreButton() {
  return <></>;
}

export default GallerySection;
