"use client";

import { useState, useRef, useEffect } from "react";
import {
  photographyImages,
  videographyURLs,
  graphicImages,
  videoEditingURLs,
  webDevProjects,
} from "./images";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import { useRouter } from "next/navigation";

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

function getYouTubeThumbnail(url: string): string {
  const id = getYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "";
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
      return getYouTubeThumbnail(videographyURLs[0]) || "/hero/video.jpg";
    case "graphic-design":
      return graphicImages[0] ?? "/hero/graphic.jpg";
    case "video-editing":
      return getYouTubeThumbnail(videoEditingURLs[0]) || "/hero/edit.jpg";
    case "web-dev":
      return (webDevProjects as WebDevProject[])[0]?.image ?? "/hero/web.jpg";
    default:
      return "/hero/photo.jpg";
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ImageGrid({
  images,
  onOpen,
}: {
  images: string[];
  onOpen: (i: number) => void;
}) {
  return (
    <div className="max-w-7xl mx-auto columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
      {images.map((src, i) => (
        <div
          key={`img-${i}`}
          className="break-inside-avoid cursor-pointer group relative overflow-hidden rounded-sm"
          onClick={() => onOpen(i)}
        >
          <img
            src={src}
            alt={`Gallery photo ${i + 1}`}
            loading="lazy"
            className="w-full h-auto transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
        </div>
      ))}
    </div>
  );
}

/** Inline autoplay video card with thumbnail placeholder while iframe loads */
function VideoCard({
  url,
  onClick,
}: {
  url: string;
  onClick: () => void;
}) {
  const id = getYouTubeId(url);
  const isShort = isYouTubeShort(url);
  const thumb = getYouTubeThumbnail(url);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const embedUrl = id
    ? `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1`
    : "";

  return (
    <div
      className={`relative cursor-pointer group overflow-hidden rounded-lg bg-neutral-900 ${
        isShort ? "row-span-2" : ""
      }`}
      onClick={onClick}
    >
      <div className={isShort ? "aspect-[9/16]" : "aspect-video"}>
        {/* Thumbnail shown while iframe loads */}
        {thumb && (
          <img
            src={thumb}
            alt="Video thumbnail"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
              iframeLoaded ? "opacity-0" : "opacity-80"
            }`}
          />
        )}

        {/* Loading shimmer */}
        {!iframeLoaded && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
        )}

        {id && (
          <iframe
            src={embedUrl}
            title="YouTube video"
            allow="autoplay; encrypted-media"
            className={`w-full h-full border-0 pointer-events-none transition-opacity duration-700 ${
              iframeLoaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => setIframeLoaded(true)}
          />
        )}
      </div>

      {/* Refined play button — minimal glassmorphism style */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
        <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl shadow-black/40 transition-transform duration-300 group-hover:scale-110">
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white translate-x-0.5 drop-shadow-lg">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>

      {/* Subtle bottom gradient for depth */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
    </div>
  );
}

/** Full-screen YouTube autoplay modal */
function VideoModal({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) {
  const id = getYouTubeId(url);
  const isShort = isYouTubeShort(url);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!id) return null;

  const embedUrl = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className={`relative mx-4 ${
          isShort ? "w-full max-w-sm" : "w-full max-w-5xl"
        }`}
      >
        <button
          className="absolute -top-10 right-0 text-white/70 hover:text-white text-sm font-medium flex items-center gap-1.5 transition-colors"
          onClick={onClose}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
          Close
        </button>
        <div
          className={`${
            isShort ? "aspect-[9/16]" : "aspect-video"
          } w-full rounded-lg overflow-hidden shadow-2xl`}
        >
          <iframe
            src={embedUrl}
            title="YouTube video"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </div>
  );
}

/** Video grid with autoplay iframes */
function VideoGrid({ urls }: { urls: string[] }) {
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  return (
    <>
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 auto-rows-auto">
        {urls.map((url, i) => (
          <VideoCard key={i} url={url} onClick={() => setActiveUrl(url)} />
        ))}
      </div>
      {activeUrl && (
        <VideoModal url={activeUrl} onClose={() => setActiveUrl(null)} />
      )}
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
          className="group relative overflow-hidden rounded-sm bg-neutral-900 block"
        >
          <img
            src={project.image}
            alt={project.title}
            loading="lazy"
            className="w-full h-auto aspect-video object-cover transition-transform duration-500 group-hover:scale-105 opacity-90 group-hover:opacity-70"
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
      <section className="relative h-[40vh] md:h-[35vh] w-full overflow-hidden flex items-center justify-center">
        <img
          key={heroImage}
          src={heroImage}
          alt={`${activeLabel} hero`}
          className="absolute inset-0 w-full h-full object-cover scale-105 transition-opacity duration-700"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-black" />
      </section>

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
          <div className="grid grid-cols-2 gap-2 sm:hidden">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => handleTabChange(tab.value)}
                className={`
                  py-2.5 rounded-xl text-xs font-medium transition-all duration-200 text-center
                  ${
                    activeTab === tab.value
                      ? "bg-gradient-to-br from-brand-400 via-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/30"
                      : "text-gray-400 bg-white/5 border border-white/10 hover:text-white hover:bg-white/10"
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="hidden sm:flex justify-center">
            <div className="flex gap-1 p-1 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              {TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => handleTabChange(tab.value)}
                  className={`
                    whitespace-nowrap px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                    ${
                      activeTab === tab.value
                        ? "bg-gradient-to-br from-brand-400 via-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/30"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

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
            <VideoGrid urls={videographyURLs} />
            {videographyURLs.length > 0 && <LoadMoreButton />}
          </>
        )}

        {activeTab === "video-editing" && (
          <>
            <VideoGrid urls={videoEditingURLs} />
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
