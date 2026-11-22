"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GallerySection from "@/components/projects/GallerySection";
import ProductionsWhatWeDo from "@/components/productions/ProductionsWhatWeDo";
import type { PhotographyEvent, VideoProject } from "@/lib/workdata";

interface ProductionsClientProps {
  photographyEvents: PhotographyEvent[];
  videographyUrls: VideoProject[];
  eventProductionUrls: VideoProject[];
  initialTab?: string;
}

export default function ProductionsClient({
  photographyEvents,
  videographyUrls,
  eventProductionUrls,
  initialTab,
}: ProductionsClientProps) {
  return (
    <main className="min-h-screen bg-black text-white selection:bg-brand-500 selection:text-white">
      <Navbar scrolled={true} />

      {/* Hero Section */}
      <section className="relative pt-36 pb-20 sm:pt-44 sm:pb-28 px-6 lg:px-16 overflow-hidden">
        {/* Ambient Glow Background */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] sm:w-[900px] h-[400px] bg-brand-500/15 blur-[120px] rounded-full" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(22,159,228,0.2),rgba(0,0,0,0))]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-5xl mx-auto text-center relative z-10"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="flex justify-center mb-8"
          >
            <Image
              src="/logos/ft/name-logo.png"
              alt="Frametoque Productions"
              width={180}
              height={36}
              className="h-7 sm:h-8 w-auto object-contain"
              priority
            />
          </motion.div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight mb-5">
            <span className="bg-gradient-to-b from-white via-white to-gray-400 bg-clip-text text-transparent block">
              We Craft Cinematic Productions
            </span>
            <span className="bg-gradient-to-r from-brand-300 via-brand-400 to-brand-500 bg-clip-text text-transparent block">
              That Demand Attention.
            </span>
          </h1>

          <p className="text-gray-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed mb-8 sm:mb-10">
            Commercial photography, cinematic videography, and full-scale event productions.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link
              href="/productions/services/photo-video"
              className="w-full sm:w-auto inline-flex items-center justify-center px-5 sm:px-6 py-2.5 rounded-full bg-brand-500/5 border border-brand-500/50 hover:bg-brand-500/15 hover:border-brand-400 text-brand-400 hover:text-brand-300 font-semibold text-xs sm:text-sm transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm"
            >
              Explore Packages & Pricing
              <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
            </Link>
            <Link
              href="#work"
              className="w-full sm:w-auto inline-flex items-center justify-center px-5 sm:px-6 py-2.5 rounded-full bg-white/5 border border-white/20 hover:bg-white/10 hover:border-white/40 text-white font-semibold text-xs sm:text-sm transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm"
            >
              View Portfolio
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Services Grid (What We Do with Animations) */}
      <ProductionsWhatWeDo />

      {/* Media Portfolio Work with Tabs */}
      <GallerySection
        arm="productions"
        initialTab={initialTab}
        photographyEvents={photographyEvents}
        videographyUrls={videographyUrls}
        eventProductionUrls={eventProductionUrls}
      />



      {/* CTA Section */}
      <section className="py-20 px-6 lg:px-16 border-t border-white/5 text-center bg-black relative">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl mx-auto"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Have a Production in Mind?</h2>
          <p className="text-gray-400 text-base sm:text-lg mb-8">
            From commercial film shoots and concert stages to cinematic live event coverage, our production crew is geared up and ready to roll.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center px-8 py-3.5 rounded-full bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 text-white font-semibold text-sm transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg shadow-brand-500/20"
          >
            Contact Productions Team
            <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </motion.div>
      </section>

      <Footer arm="productions" />
    </main>
  );
}
