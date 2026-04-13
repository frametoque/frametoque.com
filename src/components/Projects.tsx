"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Globe, Youtube, Eye, ExternalLink, X, Search, Grid3X3, List } from "lucide-react";

const protectImage = (e) => e.preventDefault();

const projects = [
  { id: 1, title: "Booking Platform", description: "A sleek event booking platform with easy reservations, event listings, and real-time notifications for a seamless experience.", category: "Web Development", image: "/projects/web/eventpulse.png", type: "web", aspectRatio: "16:9", live: "https://eventpulse.duckdns.org/" },
  { id: 2, title: "E Commerce Website", description: "A modern online store for FPV drones, featuring smooth navigation, product showcases, and secure checkout for a seamless shopping experience.", type: "web", category: "Web Development", image: "/projects/web/techrolk-store.png", aspectRatio: "16:9", live: "https://techrolk.com/shop" },
  { id: 3, title: "Company Landing Page", description: "A sleek, modern company website featuring smooth animations, and CMS integration for easy content management and updates.", type: "web", category: "Web Development", image: "/projects/web/techrolk.png", aspectRatio: "16:9", live: "https://techrolk.com" },
  { id: 4, title: "Personal Portfolio", description: "A sleek, modern portfolio showcasing skills, projects, and achievements, with AI Chatbot designed to highlight your personal brand and online presence.", type: "web", category: "Web Development", image: "/projects/web/itsnelitha.png", aspectRatio: "16:9", live: "https://itsnelitha.vercel.app/" },
  { id: 5, title: "Product Poster Design", description: "A warm, premium-style product poster designed to highlight Inginee Energy Cup. Focused on rich lighting, smooth textures, and a strong center composition.", type: "graphic", category: "Graphic Design", image: "/projects/graphic/energycup.png", aspectRatio: "1:1" },
  { id: 6, title: "Class Schedule Poster", description: "A bold and structured poster designed for an A/L Grade 13 monthly class plan. Uses strong typography, clear hierarchy, and modern color contrast.", type: "graphic", category: "Graphic Design", image: "/projects/graphic/class.png", aspectRatio: "1:1" },
  { id: 7, title: "Magazine Launch Poster", description: "A bold promotional poster designed for a science society magazine launch. Strong typography and dramatic lighting give it a serious and professional look.", type: "graphic", category: "Graphic Design", image: "/projects/graphic/ncss.png", aspectRatio: "1:1" },
  { id: 8, title: "Product Poster Design", description: "A fun and colorful product poster created to show freshness and flavor. Bright lighting, playful visuals, and bold text help make the snack feel exciting and eye-catching.", type: "graphic", category: "Graphic Design", image: "/projects/graphic/smurfs.png", aspectRatio: "1:1" },
  { id: 9, title: "Short Visual | Lamborghini Urus Performante", description: "A short cinematic video showcasing the Lamborghini Urus Performante, focused on power, design, and premium detail.", category: "Video Editing", image: "https://img.youtube.com/vi/DSjDmrtzAFE/hqdefault.jpg", type: "video", aspectRatio: "9:16", youtube: "DSjDmrtzAFE" },
  { id: 10, title: "Contest Trailer | DocuMind '26", description: "A high-energy promo produced for the Nalanda College Science Society to launch the 'DocuMind' Report Contest. Features seamless transitions and crisp typography.", category: "Video Editing", image: "https://img.youtube.com/vi/fcm_iurb5dE/hqdefault.jpg", type: "video", aspectRatio: "9:16", youtube: "fcm_iurb5dE" },
  { id: 11, title: "School Website", description: "A modern, responsive school website built to showcase Prince of Wales College's academics, events, and student life.", category: "Web Development", image: "/projects/web/pwc.png", type: "web", aspectRatio: "16:9", live: "https://princeofwales.edu.lk/" },
  { id: 12, title: "Wedding Invitation", description: "An elegant and sophisticated wedding invitation design featuring delicate typography, ornamental details, and a timeless color palette.", type: "graphic", category: "Graphic Design", image: "/projects/graphic/weddng-inv.png", aspectRatio: "4:5" },
  { id: 13, title: "Charity Campaign Poster", description: "A compelling visual campaign created to raise awareness about important social causes. Bold messaging and emotional design work together to inspire action.", type: "graphic", category: "Graphic Design", image: "/projects/graphic/soyuru-sathkara.png", aspectRatio: "4:5" },
  { id: 14, title: "Photography Services Poster", description: "A vibrant and eye-catching poster designed to promote professional photography services. Features dynamic imagery, modern typography, and a clean layout.", type: "graphic", category: "Graphic Design", image: "/projects/graphic/photography-services.png", aspectRatio: "4:5" },
  { id: 15, title: "TATA Company Short Visual", description: "A dynamic short visual created for TATA Company, highlighting their innovative products and services through engaging cinematography and sleek editing.", category: "Video Editing", image: "https://img.youtube.com/vi/bhcXWM37P-8/maxresdefault.jpg", type: "video", aspectRatio: "9:16", youtube: "bhcXWM37P-8" },
  { id: 16, title: "Poster Design | Layer Breakdown", description: "A detailed layer breakdown of a complex poster design, showcasing the creative process and techniques used to achieve the final result.", category: "Video Editing", image: "https://img.youtube.com/vi/ztSOTGvMqXM/maxresdefault.jpg", type: "video", aspectRatio: "9:16", youtube: "ztSOTGvMqXM" },
  { id: 17, title: "Wedding After Movie", description: "Memories, Elevated. Modern wedding cinematography focused on the rhythm, the vibe, and the fine details.", category: "Video Editing", image: "https://img.youtube.com/vi/X75cDve1Fc8/hqdefault.jpg", type: "video", aspectRatio: "16:9", youtube: "X75cDve1Fc8" },
  { id: 18, title: "SaaS Subscription Marketplace", description: "A full featured marketplace for global SaaS products like Netflix, Canva, and ChatGPT Plus. Features a streamlined user journey and instant delivery architecture.", type: "web", category: "Web Development", image: "/projects/web/itech.png", aspectRatio: "16:9", live: "https://www.itechlk.store" },
  { id: 19, title: "Evendor '25 | Album", description: "A vibrant album created for the Prince of Wales' College Prefects' Day, capturing the energy and excitement through visually stunning photographs.", type: "photography", category: "Photography", image: "/projects/graphic/photography-services.png", aspectRatio: "4:5", live: "https://www.facebook.com/media/set/?set=a.122097815595271134&type=3" },
  { id: 20, title: "Evendor '25 | Aftermovie", description: "A dynamic aftermovie for the Prince of Wales' College Prefects' Day, showcasing highlights and memorable moments through captivating cinematography.", type: "videography", category: "Videography", image: "https://img.youtube.com/vi/hMGyOVpEZKA/hqdefault.jpg", aspectRatio: "16:9", youtube: "hMGyOVpEZKA" },
  { id: 21, title: "Tuition Class Landing Page", description: "A modern, responsive landing page designed for a tuition class. Features a clean layout, engaging visuals, and clear calls to action to attract potential students.", type: "web", category: "Web Development", image: "/projects/web/cmjr.png", aspectRatio: "16:9", live: "https://mathswithjanidu.lk" },
];

const TABS = [
  { label: "Web Dev", value: "Web Development" },
  { label: "Graphic Design", value: "Graphic Design" },
  { label: "Video Editing", value: "Video Editing" },
  { label: "Photography", value: "Photography" },
  { label: "Videography", value: "Videography" },
];

export default function ProjectsComponent() {
  const [popupImage, setPopupImage] = useState<string | null>(null);
  const [popupVideo, setPopupVideo] = useState<{ url: string; title: string } | null>(null);
  const [activeTab, setActiveTab] = useState("Web Development");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPopupImage(null);
        setPopupVideo(null);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  useEffect(() => { setSearch(""); }, [activeTab]);

  const filtered = useMemo(() => {
    let list = projects.filter((p) => p.category === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => b.id - a.id);
  }, [activeTab, search]);

  const getAspectClass = (project: typeof projects[0]) => {
    if (project.type === "web") return "aspect-[4/3]";
    if (project.type === "graphic") return project.aspectRatio === "4:5" ? "aspect-[4/5]" : "aspect-square";
    if (project.type === "video") return project.aspectRatio === "9:16" ? "aspect-[9/16]" : "aspect-video";
    if (project.type === "photography") return project.aspectRatio === "4:5" ? "aspect-[4/5]" : "aspect-square";
    if (project.type === "videography") return project.aspectRatio === "9:16" ? "aspect-[9/16]" : "aspect-video";
    return "aspect-square";
  };

  const ActionButtons = ({ project }: { project: typeof projects[0] }) => (
    <div className="flex gap-2 flex-wrap">
      {project.type === "web" && project.live && (
        <Link
          href={project.live}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500/15 hover:bg-brand-500/25 border border-brand-400/20 hover:border-brand-400/40 transition-all duration-200 group/btn"
          aria-label="View Live Site"
        >
          <Globe className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
          <span className="text-xs font-medium">Live</span>
        </Link>
      )}
      {project.type === "photography" && project.live && (
        <Link
          href={project.live}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/20 hover:border-amber-400/40 transition-all duration-200 group/btn"
          aria-label="View Album"
        >
          <ExternalLink className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
          <span className="text-xs font-medium">View</span>
        </Link>
      )}
      {(project.type === "video" || project.type === "videography") && project.youtube && (
        <button
          onClick={() => setPopupVideo({ url: `https://www.youtube.com/watch?v=${project.youtube}`, title: project.title })}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/20 hover:border-rose-400/40 transition-all duration-200 group/btn"
          aria-label="Watch on YouTube"
        >
          <Youtube className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
          <span className="text-xs font-medium">Watch</span>
        </button>
      )}
      {project.type === "graphic" && (
        <button
          onClick={() => setPopupImage(project.image)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-400/20 hover:border-indigo-400/40 transition-all duration-200 group/btn"
          aria-label="View full size"
        >
          <Eye className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
          <span className="text-xs font-medium">View</span>
        </button>
      )}
    </div>
  );

  return (
    <>
      <section className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-white">

        {/* ── Tabs ── */}
        {/* Mobile: 2-column grid filling full width */}
        <div className="mb-6 sm:mb-8">
          <div className="grid grid-cols-2 gap-2 sm:hidden">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`
                  py-2.5 rounded-xl text-xs font-medium transition-all duration-200 text-center
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

          {/* Desktop: single centered pill row */}
          <div className="hidden sm:flex justify-center">
            <div className="flex gap-1 p-1 rounded-2xl bg-white/5 border border-white/10">
              {TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`
                    whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
                    ${activeTab === tab.value
                      ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30"
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

        {/* ── Search + View Toggle ── */}
        <div className="flex gap-2 sm:gap-3 mb-6 sm:mb-8 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="
                w-full pl-9 pr-8 py-2 sm:py-2.5 rounded-xl
                bg-white/5 border border-white/10
                text-sm text-white placeholder-gray-500
                focus:outline-none focus:border-brand-400/50
                transition-all duration-200
              "
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <span className="text-xs text-gray-500 shrink-0 hidden sm:block">
            {filtered.length} project{filtered.length !== 1 ? "s" : ""}
          </span>

          <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10 shrink-0">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 sm:p-2 rounded-lg transition-all duration-200 ${viewMode === "grid" ? "bg-brand-500 text-white shadow-md" : "text-gray-400 hover:text-white"}`}
              aria-label="Grid view"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 sm:p-2 rounded-lg transition-all duration-200 ${viewMode === "list" ? "bg-brand-500 text-white shadow-md" : "text-gray-400 hover:text-white"}`}
              aria-label="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Empty state ── */}
        {filtered.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <Search className="w-10 h-10 mx-auto mb-4 opacity-30" />
            <p className="text-base font-medium">No projects found</p>
            <p className="text-sm mt-1 text-gray-600">Try a different search term</p>
          </div>
        )}

        {/* ── Grid view ── */}
        {viewMode === "grid" && filtered.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
            {filtered.map((project) => (
              <div
                key={project.id}
                className="
                  group relative rounded-2xl overflow-hidden
                  bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-md
                  border border-white/10
                  shadow-xl shadow-black/30
                  hover:shadow-brand-500/20 hover:border-brand-400/30
                  transition-all duration-500 flex flex-col
                  hover:-translate-y-1
                "
              >
                <div className={`relative w-full ${getAspectClass(project)} overflow-hidden`}>
                  {project.type === "video" || project.type === "videography" ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${project.youtube}?autoplay=1&mute=1&loop=1&playlist=${project.youtube}&controls=0&modestbranding=1&playsinline=1`}
                      className="w-full h-full absolute inset-0 pointer-events-none"
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                      title={project.title}
                    />
                  ) : (
                    <Image
                      width={800}
                      height={600}
                      src={project.image}
                      alt={project.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      onContextMenu={protectImage}
                      onDragStart={protectImage}
                    />
                  )}
                </div>

                <div className="p-3 sm:p-5 flex flex-col gap-2 flex-1">
                  <h3 className="text-xs sm:text-base font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent leading-snug line-clamp-2">
                    {project.title}
                  </h3>
                  <p className="text-gray-400 text-[11px] sm:text-sm leading-relaxed line-clamp-2 sm:line-clamp-3 flex-1">
                    {project.description}
                  </p>
                  <div className="pt-1 sm:pt-2">
                    <ActionButtons project={project} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── List view ── */}
        {viewMode === "list" && filtered.length > 0 && (
          <div className="flex flex-col gap-3">
            {filtered.map((project) => (
              <div
                key={project.id}
                className="
                  group flex gap-3 sm:gap-4 items-start p-3 sm:p-4 rounded-2xl
                  bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-md
                  border border-white/10
                  hover:border-brand-400/30 hover:shadow-brand-500/10 hover:shadow-xl
                  transition-all duration-300
                "
              >
                <div className="shrink-0 w-20 h-14 sm:w-36 sm:h-24 rounded-xl overflow-hidden bg-black/30">
                  <Image
                    src={project.image}
                    alt={project.title}
                    width={320}
                    height={180}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onContextMenu={protectImage}
                    onDragStart={protectImage}
                  />
                </div>

                <div className="flex-1 min-w-0 flex flex-col gap-1 sm:gap-1.5">
                  <h3 className="text-sm sm:text-base font-bold text-white leading-snug line-clamp-2">
                    {project.title}
                  </h3>
                  <p className="text-gray-400 text-xs sm:text-sm leading-relaxed line-clamp-2 hidden sm:block">
                    {project.description}
                  </p>
                  <div className="mt-1 sm:mt-2">
                    <ActionButtons project={project} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </section>

      {/* ── Image popup ── */}
      {popupImage && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="absolute inset-0" onClick={() => setPopupImage(null)} />
          <div className="relative w-full max-w-3xl max-h-[90vh] z-10">
            <button
              onClick={() => setPopupImage(null)}
              className="absolute -top-11 right-0 z-20"
              aria-label="Close"
            >
              <span className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors">
                <X className="w-4 h-4" /> Close
              </span>
            </button>
            <div className="bg-white/5 rounded-2xl p-2 shadow-2xl">
              <Image
                src={popupImage}
                alt="Full size"
                width={1200}
                height={1200}
                className="max-h-[85vh] w-auto mx-auto rounded-xl"
                style={{ objectFit: "contain" }}
                onContextMenu={protectImage}
                onDragStart={protectImage}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Video popup ── */}
      {popupVideo && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="absolute inset-0" onClick={() => setPopupVideo(null)} />
          <div className="relative w-full max-w-4xl z-10">
            <button
              onClick={() => setPopupVideo(null)}
              className="absolute -top-11 right-0 z-20"
              aria-label="Close"
            >
              <span className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors">
                <X className="w-4 h-4" /> Close
              </span>
            </button>
            <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-black">
              <div className="aspect-video">
                <iframe
                  src={
                    popupVideo.url
                      .replace("watch?v=", "embed/")
                      .replace("youtu.be/", "youtube.com/embed/") +
                    "?autoplay=1&controls=1&modestbranding=1&rel=0"
                  }
                  title={popupVideo.title}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
            </div>
            <h3 className="text-white text-base sm:text-xl font-semibold mt-4 text-center bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent px-4">
              {popupVideo.title}
            </h3>
          </div>
        </div>
      )}
    </>
  );
}