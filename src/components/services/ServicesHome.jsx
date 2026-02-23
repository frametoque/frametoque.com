"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Laptop, PenTool, Video, Camera } from "lucide-react";

const features = [
  {
    title: "Web Development",
    description:
      "Your website is more than pages, it’s how people feel about your brand. We create spaces that inspire trust and leave a lasting impression.",
    icon: Laptop,
    imagePosition: "left",
    link: "/services#web",
  },
  {
    title: "Graphic Design",
    description:
      "Design isn’t just visuals, it’s memory you leave behind. Every piece we craft tells your story and makes your brand unforgettable.",
    icon: PenTool,
    imagePosition: "left",
    link: "/services#graphic",

  },
  {
    title: "Video Editing",
    description:
      "Stories don’t just play, they connect. We turn ideas into videos that spark emotion and stay in people’s minds.",
    icon: Video,
    imagePosition: "left",
    link: "/services#video",

  },
  {
    title: "Photography & Videography",
    description:
      "A picture is worth a thousand words, but a video captures a thousand moments. We create visual stories that resonate and leave a lasting impression.",
    icon: Camera,
    imagePosition: "left",
    link: "/services#photo",

  },
];

export default function Features() {
  return (
    <section id="features" className="py-16 sm:py-20 px-6 sm:px-10 lg:px-16 relative">

      {/* Pulse */}
      <div className="absolute top-20 left-4 sm:left-10 w-48 sm:w-72 h-48 sm:h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-4 sm:right-10 w-64 sm:w-96 h-64 sm:h-96 bg-[#3B82F6]-500/10 rounded-full blur-3xl animate-pulse delay-1000" />

      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12 sm:mb-16 lg:mb-20">
          <h2 className="text-5xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6">
            <span className="bg-gradient-to-b from-white to-gray-300 bg-clip-text text-transparent">
              What We&nbsp;
            </span>
            <span className="bg-gradient-to-b from-blue-400 to-blue-400 bg-clip-text text-transparent">
              Do
            </span>
          </h2>
        </div>

        <div className="space-y-16 sm:space-y-20 lg:space-y-32">
          {features.map((feature, key) => {
            const Icon = feature.icon;
            return (

             <div
              key={key}
              className={`flex flex-col lg:flex-row items-center gap-6 sm:gap-8 ${
                feature.imagePosition === "right" ? "lg:flex-row-reverse" : ""
              }`}
            >
              <div className="flex-1 w-full flex justify-center lg:order-0 mb-6 lg:mb-0">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl sm:rounded-2xl transition-all duration-500" />
                  <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl sm:rounded-2xl p-10 flex items-center justify-center group-hover:border-blue-600/50 transition-all duration-300">
                    <Icon className="w-16 h-16 sm:w-20 sm:h-20 text-blue-400" />
                  </div>
                </div>
              </div>

              <div className="flex-1 w-full">
                <div className="max-w-lg mx-auto lg:mx-0 text-center lg:text-left">
                  <h3 className="text-4xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6 text-white">
                    {feature.title}
                  </h3>
                  <p className="text-gray-300 text-xl sm:text-lg leading-relaxed mb-6 sm:mb-8">
                    {feature.description}
                  </p>
                  
                  {feature.link && (
                    <Link
                      href={feature.link}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 hover:shadow-lg hover:shadow-blue-600/20 hover:-translate-y-0.5"
                    >
                      <span>View Packages</span>
                      <svg 
                        className="w-4 h-4" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M14 5l7 7m0 0l-7 7m7-7H3" 
                        />
                      </svg>
                    </Link>
                  )}
                </div>
              </div>
            </div>


            );
          })}
        </div>
      </div>
    </section>
  );
}
