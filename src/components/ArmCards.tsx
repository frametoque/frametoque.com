import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Code2,
  Palette,
  Film,
  Sparkles,
  Video,
  Camera,
  Clapperboard,
  Aperture,
  CircleDot,
  Sun,
  Mic,
  CheckCircle2,
  TrendingUp,
  FileText,
  Activity,
  Megaphone,
  Plane,
} from "lucide-react";

const digitalServices = [
  {
    name: "Web Development",
    href: "/digital/services/web-dev",
    icon: Code2,
  },
  {
    name: "Graphic & Brand Design",
    href: "/digital/services/graphic-design",
    icon: Palette,
  },
  {
    name: "Video Editing",
    href: "/digital/services/video-editing",
    icon: Film,
  },
  {
    name: "Animations & VFX",
    href: "/digital/services/video-editing",
    icon: Sparkles,
  },
  {
    name: "Digital Marketing & Social Media Management",
    href: "/contact",
    icon: Megaphone,
  },
];

const productionsServices = [
  {
    name: "Cinematic Videography",
    href: "/productions#work",
    icon: Video,
  },
  {
    name: "Event Photography",
    href: "/productions#work",
    icon: Camera,
  },
  {
    name: "Event Productions",
    href: "/productions/services/event-productions",
    icon: Clapperboard,
  },
  {
    name: "Commercial Shoots",
    href: "/productions/services/photo-video",
    icon: Aperture,
  },
  {
    name: "Aerial & FPV Drone Cinematography",
    href: "/productions/services/photo-video",
    icon: Plane,
  },
];

const framebooksFeatures = [
  { name: "Invoicing & Quotes", icon: CheckCircle2 },
  { name: "Cash Flow & Ledger", icon: TrendingUp },
  { name: "Client Agreements", icon: FileText },
  { name: "Real-time Analytics", icon: Activity },
];

const rentalsGear = [
  { name: "Camera Bodies", icon: Camera },
  { name: "Lenses & Filters", icon: CircleDot },
  { name: "Studio & Location Lighting", icon: Sun },
  { name: "Audio Rigs & Wireless", icon: Mic },
];

export default function ArmCards() {
  return (
    <section id="ecosystem" className="py-24 px-6 lg:px-16 border-t border-white/5 bg-slate-950/70 relative">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="text-xs font-bold uppercase tracking-widest text-brand-400 px-3.5 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 inline-block mb-4">
            OUR ECOSYSTEM & WHAT WE DO
          </span>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight">
            Two Specialized Arms.
            <span className="block text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-brand-300 via-brand-400 to-brand-500 bg-clip-text text-transparent mt-2">
              One Creative Collective.
            </span>
          </h2>
        </motion.div>

        {/* Row 1: Two Main Arms as Equal Size Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 xl:gap-8 mb-8 sm:mb-10">
          {/* Frametoque Digital */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -6, transition: { duration: 0.25 } }}
            className="group relative bg-white/[0.02] backdrop-blur-md border border-white/10 hover:border-cyan-500/40 rounded-3xl p-6 sm:p-8 xl:p-9 transition-colors duration-300 hover:shadow-2xl flex flex-col justify-between overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-blue-500/20 to-cyan-500/10 rounded-full blur-3xl opacity-30 group-hover:opacity-60 transition-opacity pointer-events-none" />

            <div>
              <div className="flex items-center mb-6">
                <div className="h-8 flex items-center">
                  <Image
                    src="/logos/ft/name-logo.png"
                    alt="Frametoque Digital"
                    width={180}
                    height={36}
                    className="h-7 w-auto object-contain opacity-90 group-hover:opacity-100 transition-opacity"
                  />
                </div>
              </div>

              <h3 className="text-2xl sm:text-[26px] font-bold text-white mb-6 tracking-tight">
                Frametoque Digital
              </h3>

              {/* Digital Services List */}
              <div className="space-y-4 mb-8">
                {digitalServices.map((svc) => (
                  <Link
                    key={svc.name}
                    href={svc.href}
                    className="group/item flex items-center gap-3 text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    <svc.icon className="w-4 h-4 text-cyan-400 shrink-0 group-hover/item:text-cyan-300 transition-colors" />
                    <span className="font-medium">{svc.name}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-white/5 flex items-center justify-between mt-auto">
              <Link
                href="/digital"
                className="inline-flex items-center text-sm font-semibold text-brand-400 hover:text-brand-300 transition-colors group/link"
              >
                <span>Explore Digital Arm</span>
                <ArrowRight className="ml-1.5 w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>

          {/* Frametoque Productions */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -6, transition: { duration: 0.25 } }}
            className="group relative bg-white/[0.02] backdrop-blur-md border border-white/10 hover:border-brand-500/40 rounded-3xl p-6 sm:p-8 xl:p-9 transition-colors duration-300 hover:shadow-2xl flex flex-col justify-between overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-brand-500/20 to-blue-600/10 rounded-full blur-3xl opacity-30 group-hover:opacity-60 transition-opacity pointer-events-none" />

            <div>
              <div className="flex items-center mb-6">
                <div className="h-8 flex items-center">
                  <Image
                    src="/logos/ft/name-logo.png"
                    alt="Frametoque Productions"
                    width={180}
                    height={36}
                    className="h-7 w-auto object-contain opacity-90 group-hover:opacity-100 transition-opacity"
                  />
                </div>
              </div>

              <h3 className="text-2xl sm:text-[26px] font-bold text-white mb-6 tracking-tight">
                Frametoque Productions
              </h3>

              {/* Productions Services List */}
              <div className="space-y-4 mb-8">
                {productionsServices.map((svc) => (
                  <Link
                    key={svc.name}
                    href={svc.href}
                    className="group/item flex items-center gap-3 text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    <svc.icon className="w-4 h-4 text-cyan-400 shrink-0 group-hover/item:text-cyan-300 transition-colors" />
                    <span className="font-medium">{svc.name}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-white/5 flex items-center justify-between mt-auto">
              <Link
                href="/productions"
                className="inline-flex items-center text-sm font-semibold text-brand-400 hover:text-brand-300 transition-colors group/link"
              >
                <span>Explore Productions Arm</span>
                <ArrowRight className="ml-1.5 w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Row 2: Sub-Arms & Products Landscape Banner (Framebooks on Left, Rentals on Right) */}
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/80 via-slate-950 to-black border border-white/10 shadow-2xl"
        >
          {/* Subtle Ambient Background Glows */}
          <div className="absolute top-0 left-0 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-red-500/10 blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-white/10 relative z-10">
            {/* Left Side: Framebooks */}
            <div className="p-6 sm:p-8 xl:p-10 flex flex-col justify-between">
              <div>
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-1">
                  Framebooks
                </h3>
                <p className="text-xs sm:text-sm font-semibold text-emerald-400 mb-5">
                  ERP & Business Accounting Software by Frametoque Digital
                </p>

                <div className="grid grid-cols-2 gap-2.5 mb-6">
                  {framebooksFeatures.map((f) => (
                    <div
                      key={f.name}
                      className="flex items-center gap-2 text-xs text-gray-300 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/5"
                    >
                      <f.icon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{f.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-auto">
                <a
                  href="https://books.frametoque.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-6 py-2.5 rounded-full text-white font-bold text-xs sm:text-sm transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-emerald-500/25"
                >
                  <span>Learn More</span>
                  <ArrowRight className="ml-1.5 w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Right Side: Frametoque Rentals */}
            <div className="p-6 sm:p-8 xl:p-10 flex flex-col justify-between">
              <div>
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-1">
                  Frametoque Rentals
                </h3>
                <p className="text-xs sm:text-sm font-semibold text-red-400 mb-5">
                  Equipment Rentals by Frametoque Productions
                </p>

                <div className="grid grid-cols-2 gap-2.5 mb-6">
                  {rentalsGear.map((g) => (
                    <Link
                      key={g.name}
                      href="/rentals"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group/item flex items-center gap-2 text-xs text-gray-300 hover:text-white px-3 py-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 transition-colors"
                    >
                      <g.icon className="w-3.5 h-3.5 text-red-400 shrink-0 group-hover/item:text-red-300 transition-colors" />
                      <span className="truncate">{g.name}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-auto">
                <Link
                  href="/rentals"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-6 py-2.5 rounded-full text-white font-bold text-xs sm:text-sm transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-red-500/25"
                >
                  <span>Browse Rentals Catalog</span>
                  <ArrowRight className="ml-1.5 w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
