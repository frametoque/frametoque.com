"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  Laptop,
  PenTool,
  Film,
  Sparkles,
  Megaphone,
} from "lucide-react";

export const digitalCapabilities = [
  {
    icon: Laptop,
    title: "Web Development",
    description:
      "We create spaces that inspire trust and leave a lasting impression.",
    href: "/digital/services/web-dev",
    glowColor: "rgba(22, 159, 228, 0.15)",
  },
  {
    icon: PenTool,
    title: "Graphic Design",
    description:
      "Every piece we craft tells your story and makes your brand unforgettable.",
    href: "/digital/services/graphic-design",
    glowColor: "rgba(168, 85, 247, 0.15)",
  },
  {
    icon: Film,
    title: "Video Editing",
    description:
      "We turn raw footage into cinematic videos that spark emotion and drive engagement.",
    href: "/digital/services/video-editing",
    glowColor: "rgba(245, 158, 11, 0.15)",
  },
  {
    icon: Sparkles,
    title: "Animations & VFX",
    description:
      "Dynamic 2D/3D motion graphics, VFX, and visual animations that bring ideas to life.",
    href: "/digital/services/video-editing",
    glowColor: "rgba(236, 72, 153, 0.15)",
  },
  {
    icon: Megaphone,
    title: "Digital Marketing",
    description:
      "Data-driven social media growth, targeted campaigns, content strategy, and brand visibility that drive real engagement.",
    href: "/contact",
    glowColor: "rgba(16, 185, 129, 0.15)",
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export default function DigitalWhatWeDo() {
  return (
    <section className="py-24 px-6 lg:px-12 xl:px-16 border-t border-white/5 bg-slate-950/60 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-brand-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-[1480px] mx-auto relative z-10">
        {/* Section Header with smooth entrance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-4 tracking-tight">
            <span className="text-white">What We </span>
            <span className="bg-gradient-to-r from-brand-300 via-brand-400 to-brand-500 bg-clip-text text-transparent">
              Do
            </span>
          </h2>
          <p className="text-gray-400 text-base sm:text-lg leading-relaxed">
            Specialized digital solutions engineered from the ground up for speed, visual excellence, and measurable conversion.
          </p>
        </motion.div>

        {/* Capabilities Grid - All 5 Cards Inline on Desktop */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          className="grid gap-4 lg:gap-3.5 xl:gap-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
        >
          {digitalCapabilities.map((cap) => {
            const Icon = cap.icon;
            return (
              <motion.div
                key={cap.title}
                variants={cardVariants}
                className="group relative flex flex-col justify-start overflow-hidden rounded-2xl bg-[#0a0a0a] bg-opacity-80 backdrop-blur-md border border-white/5 p-6 xl:p-7 transition-all duration-500 hover:-translate-y-1 hover:border-white/10"
              >
                {/* Top part / Icon */}
                <div className="mb-5 flex items-center justify-between">
                  <Icon className="h-9 w-9 xl:h-10 xl:w-10 text-brand-500 border-none transition-colors duration-500 group-hover:text-brand-400 shrink-0" />

                  <div className="opacity-0 -translate-x-4 transition-all duration-500 group-hover:translate-x-0 group-hover:opacity-100">
                    <svg
                      className="w-5 h-5 text-brand-500"
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
                  </div>
                </div>

                {/* Content */}
                <div>
                  <h3 className="mb-2.5 text-lg xl:text-xl font-bold tracking-tight text-white/90 transition-colors group-hover:text-white">
                    {cap.title}
                  </h3>
                  <p className="text-xs xl:text-sm leading-relaxed text-gray-400 transition-colors group-hover:text-gray-300">
                    {cap.description}
                  </p>
                </div>

                {/* Link over whole card */}
                {cap.href && (
                  <Link href={cap.href} className="absolute inset-0 z-10 block">
                    <span className="sr-only">View {cap.title} details</span>
                  </Link>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
