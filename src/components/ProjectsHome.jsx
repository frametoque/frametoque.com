"use client";
import { useState, useEffect } from "react";
import { Github, Globe, Youtube, Eye, Play, ExternalLink, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const protectImage = (e) => e.preventDefault();

export default function ProjectsHome() {
  const [popupImage, setPopupImage] = useState(null);
  const [popupVideo, setPopupVideo] = useState(null);

  const projects = [
    {
      id: 1,
      title: "Company Website",
      description: "A sleek, modern company website featuring smooth animations, and CMS integration for easy content management and updates.",
      type: "web",
      category: "Web Development",
      image: "/projects/web/techrolk.png",
      aspectRatio: "16:9",
      live: "https://techrolk.com",
    },
    {
      id: 2,
      title: "Product Poster Design",
      description: "A fun and colorful product poster created to show freshness and flavor. Bright lighting, playful visuals, and bold text help make the snack feel exciting and eye-catching.",
      type: "graphic",
      category: "Graphic Design",
      image: "/projects/graphic/smurfs.png",
      aspectRatio: "1:1",
    },
    {
      id: 3,
      title: "Short Visual | Lamborghini Urus Performante",
      description: "A short cinematic video showcasing the Lamborghini Urus Performante, focused on power, design, and premium detail.",
      category: "Video Editing",
      image: "https://img.youtube.com/vi/DSjDmrtzAFE/maxresdefault.jpg",
      type: "video",
      aspectRatio: "9:16",
      youtube: "https://www.youtube.com/watch?v=DSjDmrtzAFE"
    },
    {
      id: 4,
      title: "Booking Platform",
      description: "A sleek event booking platform with easy reservations, event listings, and real-time notifications for a seamless experience.",
      category: "Web Development",
      image: "/projects/web/eventpulse.png",
      type: "web",
      aspectRatio: "16:9",
      live: "https://eventpulse.duckdns.org/"
    },
  ];

  const getAspectClass = () => {
    return "aspect-[3/2]";
  };

  const getImagePosition = (project) => {
    if (project.type === "video" && project.aspectRatio === "9:16") {
      return "object-top";
    }
    return "object-center";
  };

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setPopupImage(null);
        setPopupVideo(null);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  return (
    <section className="py-16 px-6 sm:px-10 lg:px-16 bg-slate-950 text-white relative overflow-hidden">
      {/* Pulse Effects */}
      <div className="absolute top-10 left-4 sm:left-10 w-32 sm:w-48 h-32 sm:h-48 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-10 right-4 sm:right-10 w-40 sm:w-64 h-40 sm:h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4 leading-tight">
            <span className="bg-gradient-to-b from-white to-gray-300 bg-clip-text text-transparent">
              Featured&nbsp;
            </span>
            <span className="bg-gradient-to-b from-blue-400 to-blue-500 bg-clip-text text-transparent">
              Projects
            </span>
          </h2>
          <p className="text-gray-400 text-base sm:text-lg max-w-3xl mx-auto leading-relaxed">
            A quick glimpse into some of our highlighted work across different domains.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {projects.map((project) => (
            <div
              key={project.id}
              className="
                group relative rounded-xl overflow-hidden 
                bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-md 
                border border-white/10 
                shadow-xl shadow-black/30 
                hover:shadow-blue-500/20 
                hover:border-blue-400/30 
                transition-all duration-500 flex flex-col
                hover:-translate-y-1
                h-full
              "
            >

              <div className={`relative w-full ${getAspectClass()} overflow-hidden`}>
                <Image
                  width={600}
                  height={400}
                  src={project.image}
                  alt={project.title}
                  onContextMenu={protectImage}
                  onDragStart={protectImage}
                  className={`
                    w-full h-full object-cover 
                    transition-transform duration-700 
                    group-hover:scale-110
                    ${getImagePosition(project)}
                  `}
                />


              </div>

              <div className="p-5 flex flex-col gap-3 flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium">
                    {project.category}
                  </span>
                </div>
                <h3 className="text-lg font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  {project.title}
                </h3>

                <p className="text-gray-400 text-sm leading-relaxed line-clamp-3">
                  {project.description}
                </p>

                <div className="flex gap-2 mt-auto pt-3">
                  {project.type === "web" && (
                    <>


                      {project.live && (
                        <Link
                          href={project.live}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="
                            flex-1 px-3 py-2 rounded-lg
                            bg-gradient-to-r from-blue-600/20 to-cyan-600/20 
                            hover:from-blue-600/30 hover:to-cyan-600/30
                            transition-all duration-300
                            flex items-center justify-center gap-2
                            border border-blue-400/20 hover:border-blue-400/40
                            hover:shadow-lg hover:shadow-blue-500/20
                            group/btn
                          "
                          aria-label="View Live Site"
                        >
                          <Globe className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                          <span className="text-xs font-medium">Live</span>
                        </Link>
                      )}
                    </>
                  )}

                  {project.type === "video" && project.youtube && (
                    <button
                      onClick={() => setPopupVideo({
                        url: project.youtube,
                        title: project.title
                      })}
                      className="
                        flex-1 px-3 py-2 rounded-lg
                        bg-gradient-to-r from-blue-600/20 to-cyan-600/20 
                        hover:from-blue-600/30 hover:to-cyan-600/30
                        transition-all duration-300
                        flex items-center justify-center gap-2
                        border border-blue-400/20 hover:border-blue-400/40
                        hover:shadow-lg hover:shadow-blue-500/20
                        group/btn
                      "
                      aria-label="Watch on YouTube"
                    >
                      <Youtube className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                      <span className="text-xs font-medium">Watch</span>
                    </button>
                  )}

                  {project.type === "graphic" && (
                    <button
                      onClick={() => setPopupImage(project.image)}
                      className="
                        flex-1 px-3 py-2 rounded-lg
                        bg-gradient-to-r from-blue-600/15 to-cyan-500/15
                        hover:from-blue-600/25 hover:to-cyan-500/25
                        transition-all duration-300
                        flex items-center justify-center gap-2
                        border border-blue-500/25 hover:border-blue-500/40
                        hover:shadow-lg hover:shadow-cyan-500/20
                        group/btn
                      "
                      aria-label="View full size"
                    >
                      <Eye className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                      <span className="text-xs font-medium">View</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/projects"
            className="
              group inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 shadow-lg hover:shadow-xl whitespace-nowrap
            "
            aria-label="View More Projects"
          >
            View All Projects
            <span className="group-hover:translate-x-1 transition-transform duration-300">
              →
            </span>
          </Link>
        </div>
      </div>

      {popupImage && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className="absolute inset-0"
            onClick={() => setPopupImage(null)}
          />
          <div className="relative max-w-5xl max-h-[90vh] z-10">
            <button
              onClick={() => setPopupImage(null)}
              className="
                absolute -top-12 right-0
                text-white/80 hover:text-white
                text-sm font-medium flex items-center gap-2
                transition-colors duration-200
                z-20
              "
            >
              <span className="px-3 py-1.5 bg-white/10 rounded-lg backdrop-blur-sm flex items-center gap-2">
                <X className="w-4 h-4" />
                Close (ESC)
              </span>
            </button>
            <div className="bg-white/5 rounded-2xl p-2 shadow-2xl">
              <Image
                src={popupImage}
                alt="Popup"
                width={1200}
                height={1200}
                className="max-h-[85vh] w-auto rounded-xl"
                style={{ objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      )}

      {popupVideo && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className="absolute inset-0"
            onClick={() => setPopupVideo(null)}
          />
          <div className="relative max-w-4xl w-full z-10">
            <button
              onClick={() => setPopupVideo(null)}
              className="
                absolute -top-12 right-0
                text-white/80 hover:text-white
                text-sm font-medium flex items-center gap-2
                transition-colors duration-200
                z-20
              "
            >
              <span className="px-3 py-1.5 bg-white/10 rounded-lg backdrop-blur-sm flex items-center gap-2">
                <X className="w-4 h-4" />
                Close (ESC)
              </span>
            </button>

            <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-black">
              <div className="aspect-video">
                <iframe
                  src={popupVideo.url.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")}
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