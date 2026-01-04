"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

import { Github, Globe, Youtube, Eye, Play, ExternalLink, X } from "lucide-react";

const protectImage = (e) => e.preventDefault();

const projects = [

  {
    id: 1,
    title: "Booking Platform",
    description: "A sleek event booking platform with easy reservations, event listings, and real-time notifications for a seamless experience.",
    category: "Web Development",
    image: "/projects/web/eventpulse.png",
    type: "web",
    aspectRatio: "16:9",
    live: "https://eventpulse.duckdns.org/"
  },

  {
    id: 2,
    title: "E Commerce Website",
    description: "A modern online store for FPV drones, featuring smooth navigation, product showcases, and secure checkout for a seamless shopping experience.",
    type: "web",
    category: "Web Development",
    image: "/projects/web/techrolk-store.png",
    aspectRatio: "16:9",
    live: "https://techrolk.com/shop",
  },
  {
    id: 3,
    title: "Company Landing Page",
    description: "A sleek, modern company website featuring smooth animations, and CMS integration for easy content management and updates.",
    type: "web",
    category: "Web Development",
    image: "/projects/web/techrolk.png",
    aspectRatio: "16:9",
    live: "https://techrolk.com",
  },
  {
    id: 4,
    title: "Personal Portfolio",
    description: "A sleek, modern portfolio showcasing skills, projects, and achievements, designed to highlight your personal brand and online presence.",
    type: "web",
    category: "Web Development",
    image: "/projects/web/itsnelitha.png",
    aspectRatio: "16:9",
    live: "https://itsnelitha.github.io/",
  },


  {
    id: 5,
    title: "Product Poster Design",
    description: "A warm, premium-style product poster designed to highlight Inginee Energy Cup. Focused on rich lighting, smooth textures, and a strong center composition to create a cozy yet energetic feel that instantly grabs attention.",
    type: "graphic",
    category: "Graphic Design",
    image: "/projects/graphic/energycup.png",
    aspectRatio: "1:1",
  },

  {
    id: 6,
    title: "Class Schedule Poster",
    description: "A bold and structured poster designed for an A/L Grade 13 monthly class plan. Uses strong typography, clear hierarchy, and modern color contrast to make schedules easy to read while keeping a clean, professional look for educational branding.",
    type: "graphic",
    category: "Graphic Design",
    image: "/projects/graphic/class.png",
    aspectRatio: "1:1",
  },

  {
    id: 7,
    title: "Magazine Launch Poster",
    description: "A bold promotional poster designed for a science society magazine launch. Strong typography and dramatic lighting give it a serious and professional look.",
    type: "graphic",
    category: "Graphic Design",
    image: "/projects/graphic/ncss.png",
    aspectRatio: "1:1",
  },

  {
    id: 8,
    title: "Product Poster Design",
    description: "A fun and colorful product poster created to show freshness and flavor. Bright lighting, playful visuals, and bold text help make the snack feel exciting and eye-catching.",
    type: "graphic",
    category: "Graphic Design",
    image: "/projects/graphic/smurfs.png",
    aspectRatio: "1:1",
  },

  {
    id: 9,
    title: "Short Visual | Lamborghini Urus Performante",
    description: "A short cinematic video showcasing the Lamborghini Urus Performante, focused on power, design, and premium detail.",
    category: "Video Editing",
    image: "https://img.youtube.com/vi/DSjDmrtzAFE/maxresdefault.jpg",
    type: "video",
    aspectRatio: "9:16",
    youtube: "https://www.youtube.com/watch?v=DSjDmrtzAFE"
  },

  {
    id: 10,
    title: "Promotional Trailer | DocuMind '26",
    description: "A high-energy promo produced for the Nalanda College Science Society (NCSS) to launch the 'DocuMind' Report Contest. This project focuses on seamless transitions, crisp typography, and a narrative flow that connects Sri Lanka’s current challenges with innovative student solutions.",
    category: "Video Editing",
    image: "https://img.youtube.com/vi/fcm_iurb5dE/maxresdefault.jpg",
    type: "video",
    aspectRatio: "9:16",
    youtube: "https://www.youtube.com/watch?v=fcm_iurb5dE"
  },



  {
    id: 11,
    title: "School Website",
    description: "A modern, responsive school website built to showcase Prince of Wales College’s academics, events, and student life.",
    category: "Web Development",
    image: "/projects/web/pwc.png",
    type: "web",
    aspectRatio: "16:9",
    live: "https://princeofwales.edu.lk/"
  },
];

export default function ProjectsComponent() {
  const [popupImage, setPopupImage] = useState(null);
  const [popupVideo, setPopupVideo] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const groupedProjects = projects.reduce((acc, project) => {
    if (!acc[project.category]) {
      acc[project.category] = [];
    }
    acc[project.category].push(project);
    return acc;
  }, {});

  const getAspectClass = (project) => {
    if (project.type === "web") return "aspect-[4/3]";
    if (project.type === "graphic") return "aspect-square";
    if (project.type === "video") {
      return project.aspectRatio === "9:16" ? "aspect-[4/5]" : "aspect-video";
    }
    return "aspect-square";
  };

  return (
    <>

      <section className="py-16 sm:py-20 px-6 lg:px-8">

        <div className="max-w-7xl mx-auto relative z-10">

          {Object.entries(groupedProjects).map(([category, categoryProjects]) => (
            <div key={category} className="mb-16 last:mb-0">
              <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                  <span className="text-blue-400">{category.split(' ')[0]}</span> {category.split(' ')[1]}
                </h2>
                <p className="text-gray-400 max-w-2xl mx-auto">
                  Explore our innovative solutions in {category}.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {categoryProjects.map((project) => (
                  <div
                    key={project.id}
                    className="
                      group relative rounded-2xl overflow-hidden 
                      bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-md 
                      border border-white/10 
                      shadow-2xl shadow-black/30 
                      hover:shadow-blue-500/20 
                      hover:border-blue-400/30 
                      transition-all duration-500 flex flex-col
                      hover:-translate-y-1
                    "
                  >

                    {/* <span className={`
                      absolute top-3 left-3 text-xs font-medium
                      px-3 py-1.5 rounded-full z-20 
                      backdrop-blur-sm
                      shadow-lg shadow-black/30
                    ${project.type === "web" ? "bg-gradient-to-r from-blue-800 to-blue-700" : 
                      project.type === "graphic" ? "bg-gradient-to-r from-indigo-500 to-indigo-400" : 
                      "bg-gradient-to-r from-sky-600 to-sky-500"}
                    `}>
                      {project.type.toUpperCase()}
                    </span> */}

                    <div className={`relative w-full ${getAspectClass(project)} overflow-hidden`}>
                      <Image
                        width={project.type === "graphic" ? 800 : project.aspectRatio === "9:16" ? 600 : 1200}
                        height={project.type === "graphic" ? 800 : project.aspectRatio === "9:16" ? 1067 : 675}
                        src={project.image}
                        alt={project.title}
                        className="
                          w-full h-full object-cover 
                          transition-transform duration-700 
                          group-hover:scale-110
                        "
                        onContextMenu={protectImage}
                        onDragStart={protectImage}
                      />

                    </div>


                    <div className="p-5 flex flex-col gap-3 flex-1">
                      <h3 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                        {project.title}
                      </h3>

                      <p className="text-gray-400 text-sm leading-relaxed line-clamp-3">
                        {project.description}
                      </p>

                      <div className="flex gap-2 mt-auto pt-4">

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
                              bg-gradient-to-r from-blue-600/15 to-cyan-500/15
                              hover:from-blue-600/25 hover:to-cyan-500/25
                              transition-all duration-300
                              flex items-center justify-center gap-2
                              border border-blue-500/25 hover:border-blue-500/40
                              hover:shadow-lg hover:shadow-cyan-500/20
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
            </div>
          ))}
        </div>
      </section>

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

    </>
  );
}