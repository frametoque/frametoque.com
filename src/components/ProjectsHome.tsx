"use client";
import { useState, useEffect } from "react";
import { Globe, Youtube, Eye, ExternalLink, X, Camera } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const protectImage = (e) => e.preventDefault();

export default function ProjectsHome() {
  const [popupImage, setPopupImage] = useState(null);
  const [popupVideo, setPopupVideo] = useState(null);


  const projects = [
    {
      id: 1,
       title: "Contest Trailer",
      category: "Video Editing",
      image: "https://img.youtube.com/vi/fcm_iurb5dE/hqdefault.jpg",
      type: "video",
      youtube: "https://www.youtube.com/watch?v=fcm_iurb5dE",
      video: "ncss.mp4",
      area: "a", // 9:16 tall left
    },
    {
      id: 2,
       title: "TechRolk | E-commerce Website",
      category: "Web Development",
      image: "/projects/web/techrolk-store.png",
      type: "web",
      live: "https://techrolk.com/shop",
      area: "b", // 4:5 top-mid-left
    },
    {
      id: 3,
       title: "School Website",
      category: "Web Development",
      image: "/projects/web/pwc.png",
      type: "web",
      live: "https://princeofwales.edu.lk/",
      area: "c", // 4:5 top-mid-right
    },
    {
      id: 4,
      title: "Magazine Launch Poster",
      category: "Graphic Design",
      image: "/projects/graphic/ncss.png",
      type: "graphic",
      youtube: "https://www.youtube.com/watch?v=ztSOTGvMqXM",
      video: "graphics.mp4",
      area: "d", // 9:16 tall right
    },
    {
      id: 5,
      title: "SaaS Subscription Marketplace",
      category: "Web Development",
      image: "/projects/web/itech.png",
      type: "web",
      live: "https://www.itechlk.store/",

      area: "e", // 16:9 wide centre
      is169: true,
    },
    {
      id: 6,
      title: "Evendor '25 | Album",
      category: "Photography",
      image: "/projects/graphic/photography-services.png",
      type: "photography",
      live: "https://www.facebook.com/media/set/?set=a.122097815595271134&type=3",
      area: "f", // 1:1 bottom-left
    },
    {
      id: 7,
      title: "Evendor '25 | Aftermovie",
      category: "Videography",
      image: "https://img.youtube.com/vi/Ugd-Q4K-ob0/maxresdefault.jpg",
      type: "video",
      youtube: "https://www.youtube.com/watch?v=Ugd-Q4K-ob0",
      video: "evendor.mp4",
      area: "g", // wide bottom-centre
    },
    {
      id: 8,
      title: "Product Poster Design",
      category: "Graphic Design",
      image: "/projects/graphic/energycup.png",
      type: "graphic",
      area: "h", // 1:1 bottom-right
    },
  ];

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") { setPopupImage(null); setPopupVideo(null); }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const getAction = (project) => {
    if (project.type === "web" && project.live)
      return (
        <Link href={project.live} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-brand-500/30 border border-white/15 hover:border-brand-400/50 text-white text-xs font-semibold backdrop-blur-sm transition-all duration-300 group/btn">
          <Globe className="w-3.5 h-3.5" /> Live Site
          <ExternalLink className="w-3 h-3 opacity-50 group-hover/btn:opacity-100 group-hover/btn:translate-x-0.5 transition-all" />
        </Link>
      );
    if (project.type === "photography" && project.live)
      return (
        <Link href={project.live} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-brand-500/30 border border-white/15 hover:border-brand-400/50 text-white text-xs font-semibold backdrop-blur-sm transition-all duration-300 group/btn">
          <Camera className="w-3.5 h-3.5" /> View Album
          <ExternalLink className="w-3 h-3 opacity-50 group-hover/btn:opacity-100 transition-all" />
        </Link>
      );
    if (project.type === "video" && project.youtube)
      return (
        <button onClick={() => setPopupVideo({ url: project.youtube, title: project.title })}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-brand-500/30 border border-white/15 hover:border-brand-400/50 text-white text-xs font-semibold backdrop-blur-sm transition-all duration-300">
          <Youtube className="w-3.5 h-3.5" /> Watch Full Video
        </button>
      );
    if (project.type === "graphic")
      return (
        <button onClick={() => setPopupImage(project.image)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-brand-500/30 border border-white/15 hover:border-brand-400/50 text-white text-xs font-semibold backdrop-blur-sm transition-all duration-300">
          <Eye className="w-3.5 h-3.5" /> Full View
        </button>
      );
  };

  const CardInner = ({ project }) => (
    <>
      {project.video ? (
        <video
          src={`/projects/video/${project.video}`}
          poster={project.image}
          className="absolute inset-0 w-full h-full pointer-events-none object-cover group-hover:scale-110 transition-transform duration-700"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
      ) : (
        <Image fill src={project.image} alt={project.title}
          onContextMenu={protectImage} onDragStart={protectImage}
          className="object-cover transition-transform duration-700 group-hover:scale-110"
          sizes="(max-width: 768px) 100vw, 50vw" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/5 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-brand-600/0 group-hover:bg-brand-600/8 transition-all duration-500" />
      <div className="absolute top-4 left-4 z-10">
        <span className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-brand-300 text-[8px] font-bold tracking-widest uppercase">
          {project.category}
        </span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
        <h3 className="text-[15px] font-bold text-white leading-snug mb-1.5 ">{project.title}</h3>
        {/* <p className="text-gray-400 text-xs leading-relaxed mb-3 line-clamp-2 max-h-0 overflow-hidden opacity-0 group-hover:max-h-20 group-hover:opacity-100 transition-all duration-500 ease-out">
          {project.subtitle}
        </p> */}
        <div className="max-h-0 overflow-hidden opacity-0 group-hover:max-h-20 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-500 ease-out">
          {getAction(project)}
        </div>
      </div>
    </>
  );

  const card = "group relative rounded-2xl overflow-hidden cursor-pointer border border-white/[0.07] hover:border-brand-500/40 transition-all duration-500 hover:shadow-2xl hover:shadow-brand-500/15 hover:-translate-y-1 hover:scale-[1.01]";

  // helper to get project by area letter
  const byArea = (letter) => projects.find((p) => p.area === letter);

  return (
    <section className="py-16 px-6 sm:px-10 lg:px-16 bg-slate-950 text-white relative overflow-hidden">
      <div className="absolute top-10 left-4 sm:left-10 w-32 sm:w-48 h-32 sm:h-48 bg-brand-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-10 right-4 sm:right-10 w-40 sm:w-64 h-40 sm:h-64 bg-brand-500/10 rounded-full blur-3xl animate-pulse delay-1000" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4 leading-tight">
            <span className="bg-gradient-to-b from-white to-gray-300 bg-clip-text text-transparent">Featured&nbsp;</span>
            <span className="bg-gradient-to-b from-brand-400 to-brand-500 bg-clip-text text-transparent">Projects</span>
          </h2>
          <p className="text-gray-400 text-base sm:text-lg max-w-3xl mx-auto leading-relaxed">
            A quick glimpse into some of our highlighted work across different domains.
          </p>
        </div>

        {/* ══ DESKTOP (lg+) ══ */}
        <div
          className="hidden lg:grid gap-3 mb-12"
          style={{
            gridTemplateColumns: "repeat(4, 1fr)",
            gridTemplateRows: "220px 220px 280px",
            gridTemplateAreas: `
              "a b c d"
              "a e e d"
              "f g g h"
            `,
          }}
        >
          {projects.map((p) => (
            <div key={p.id} className={`${card} relative`} style={{ gridArea: p.area }}>
              <CardInner project={p} />
            </div>
          ))}
        </div>

        {/* ══ TABLET (sm → lg) ══ */}
        <div className="hidden sm:flex lg:hidden flex-col gap-3 mb-12">
          {/* Row 1: two 9:16 side by side */}
          <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className={`${card} relative`} style={{ aspectRatio: "9/16" }}>
              <CardInner project={byArea("a")} />
            </div>
            <div className={`${card} relative`} style={{ aspectRatio: "9/16" }}>
              <CardInner project={byArea("d")} />
            </div>
          </div>
          {/* Row 2: two 4:5 side by side */}
          <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className={`${card} relative`} style={{ aspectRatio: "4/5" }}>
              <CardInner project={byArea("b")} />
            </div>
            <div className={`${card} relative`} style={{ aspectRatio: "4/5" }}>
              <CardInner project={byArea("c")} />
            </div>
          </div>
          {/* Row 3: 16:9 full width */}
          <div className={`${card} relative w-full`} style={{ aspectRatio: "16/9" }}>
            <CardInner project={byArea("e")} />
          </div>
          {/* Row 4: square + square */}
          <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className={`${card} relative`} style={{ aspectRatio: "1/1" }}>
              <CardInner project={byArea("f")} />
            </div>
            <div className={`${card} relative`} style={{ aspectRatio: "1/1" }}>
              <CardInner project={byArea("h")} />
            </div>
          </div>
          {/* Row 5: wide full width */}
          <div className={`${card} relative w-full`} style={{ aspectRatio: "21/9" }}>
            <CardInner project={byArea("g")} />
          </div>
        </div>

        {/* ══ MOBILE ══ */}
        <div className="flex sm:hidden flex-col gap-3 mb-12">
          {/* 16:9 hero */}
          <div className={`${card} relative w-full`} style={{ aspectRatio: "16/9" }}>
            <CardInner project={byArea("e")} />
          </div>
          {/* 4:5 pair */}
          <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className={`${card} relative`} style={{ aspectRatio: "4/5" }}>
              <CardInner project={byArea("b")} />
            </div>
            <div className={`${card} relative`} style={{ aspectRatio: "4/5" }}>
              <CardInner project={byArea("c")} />
            </div>
          </div>
          {/* 9:16 pair */}
          <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className={`${card} relative`} style={{ aspectRatio: "9/16" }}>
              <CardInner project={byArea("a")} />
            </div>
            <div className={`${card} relative`} style={{ aspectRatio: "9/16" }}>
              <CardInner project={byArea("d")} />
            </div>
          </div>
          {/* Wide */}
          <div className={`${card} relative w-full`} style={{ aspectRatio: "21/9" }}>
            <CardInner project={byArea("g")} />
          </div>
          {/* Squares */}
          <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className={`${card} relative`} style={{ aspectRatio: "1/1" }}>
              <CardInner project={byArea("f")} />
            </div>
            <div className={`${card} relative`} style={{ aspectRatio: "1/1" }}>
              <CardInner project={byArea("h")} />
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/projects"
            className="group inline-flex items-center px-6 py-3 bg-gradient-to-r from-brand-600 to-brand-600 text-white font-semibold rounded-lg hover:from-brand-700 hover:to-brand-700 transition-all duration-300 shadow-lg hover:shadow-xl whitespace-nowrap"
            aria-label="View More Projects"
          >
            View All Projects
            <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
          </Link>
        </div>
      </div>

      {/* ── Image Popup ── */}
      {popupImage && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="absolute inset-0" onClick={() => setPopupImage(null)} />
          <div className="relative max-w-5xl max-h-[90vh] z-10">
            <button onClick={() => setPopupImage(null)}
              className="absolute -top-12 right-0 text-white/80 hover:text-white text-sm font-medium transition-colors duration-200 z-20">
              <span className="px-3 py-1.5 bg-white/10 rounded-lg backdrop-blur-sm flex items-center gap-2">
                <X className="w-4 h-4" /> Close (ESC)
              </span>
            </button>
            <div className="bg-white/5 rounded-2xl p-2 shadow-2xl">
              <Image src={popupImage} alt="Popup" width={1200} height={1200}
                className="max-h-[85vh] w-auto rounded-xl" style={{ objectFit: "contain" }} 
                onContextMenu={protectImage} onDragStart={protectImage}  
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Video Popup ── */}
      {popupVideo && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="absolute inset-0" onClick={() => setPopupVideo(null)} />
          <div className="relative max-w-4xl w-full z-10">
            <button onClick={() => setPopupVideo(null)}
              className="absolute -top-12 right-0 text-white/80 hover:text-white text-sm font-medium transition-colors duration-200 z-20">
              <span className="px-3 py-1.5 bg-white/10 rounded-lg backdrop-blur-sm flex items-center gap-2">
                <X className="w-4 h-4" /> Close (ESC)
              </span>
            </button>
            <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-black">
              <div className="aspect-video relative">
                <iframe
                  src={
                    popupVideo.url
                      .replace("watch?v=", "embed/")
                      .replace("youtu.be/", "youtube.com/embed/") +
                    "?&autoplay=1&controls=0&modestbranding=1&rel=0"
                  }
                  title={popupVideo.title}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
            </div>
            <h3 className="text-white text-xl font-semibold mt-4 text-center bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              {popupVideo.title}
            </h3>
          </div>
        </div>
      )}
    </section>
  );
}