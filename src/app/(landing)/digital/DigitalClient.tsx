"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, ExternalLink } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FramebooksDashboardMockup from "@/components/FramebooksDashboardMockup";
import FramebooksFeaturesSlider from "@/components/FramebooksFeaturesSlider";
import DigitalWhatWeDo from "@/components/digital/DigitalWhatWeDo";
import GallerySection from "@/components/projects/GallerySection";
import type { VideoProject, WebDevImage, SiteDetails } from "@/lib/workdata";

interface DigitalClientProps {
  booksUrl: string;
  graphicImages: string[];
  webProjects: WebDevImage[];
  webDetailsMap: Record<string, SiteDetails>;
  videoEditingUrls: VideoProject[];
  initialTab?: string;
}

export default function DigitalClient({
  booksUrl,
  graphicImages,
  webProjects,
  webDetailsMap,
  videoEditingUrls,
  initialTab,
}: DigitalClientProps) {
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
              alt="Frametoque Digital"
              width={180}
              height={36}
              className="h-7 sm:h-8 w-auto object-contain"
              priority
            />
          </motion.div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight mb-5">
            <span className="bg-gradient-to-b from-white via-white to-gray-400 bg-clip-text text-transparent block">
              We Build Digital Experiences
            </span>
            <span className="bg-gradient-to-r from-brand-300 via-brand-400 to-brand-500 bg-clip-text text-transparent block">
              That Power Modern Brands.
            </span>
          </h1>

          <p className="text-gray-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed mb-8 sm:mb-10">
            High-performance websites, custom web applications, and modern digital design.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link
              href="/digital/services/web-dev"
              className="w-full sm:w-auto inline-flex items-center justify-center px-5 sm:px-6 py-2.5 rounded-full bg-brand-500/5 border border-brand-500/50 hover:bg-brand-500/15 hover:border-brand-400 text-brand-400 hover:text-brand-300 font-semibold text-xs sm:text-sm transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm"
            >
              Explore Services & Pricing
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
      <DigitalWhatWeDo />

      {/* Featured Digital Work Section with Tabs */}
      <GallerySection
        arm="digital"
        initialTab={initialTab}
        graphicImages={graphicImages}
        webProjects={webProjects}
        webDetailsMap={webDetailsMap}
        videoEditingUrls={videoEditingUrls}
      />

      {/* SaaS Product Section (Framebooks) */}
      <section id="saas" className="py-24 px-6 lg:px-16 border-t border-white/5 relative bg-gradient-to-b from-black via-slate-950/80 to-black">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              <span className="block text-white">Meet Framebooks</span>
              <span className="block bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-400 bg-clip-text text-transparent mt-1">
                Cloud ERP & Business Accounting Software
              </span>
            </h2>
          </motion.div>

          {/* Main SaaS Card */}
          <motion.div
            initial={{ opacity: 0, y: 35 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950/30 via-slate-900/60 to-black border border-emerald-500/20 p-8 sm:p-12 lg:p-16 mb-12 shadow-2xl"
          >
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
              <div className="lg:col-span-5 space-y-6">
                <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Invoices, clients, and revenue. In one simple place.
                </h3>

                <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                  Framebooks brings effortless clarity to your business. Send clean invoices, manage client agreements, and keep track of your cash flow with zero friction.
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-4">
                  <a
                    href={booksUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm sm:text-base transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/25"
                  >
                    <span>Open Framebooks</span>
                    <ExternalLink className="ml-2 w-4 h-4" />
                  </a>
                </div>
              </div>

              <div className="lg:col-span-7 flex justify-center">
                <FramebooksDashboardMockup />
              </div>
            </div>
          </motion.div>

          {/* SaaS Feature One-Row Slider (9 Core Modules) */}
          <FramebooksFeaturesSlider />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 lg:px-16 border-t border-white/5 text-center bg-black relative">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl mx-auto"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Have a Digital Project in Mind?</h2>
          <p className="text-gray-400 text-base sm:text-lg mb-8">
            Tell us what you are building. From clean portfolio sites to enterprise web systems, we are ready to build it with you.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center px-8 py-3.5 rounded-full bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 text-white font-semibold text-sm transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg shadow-brand-500/20"
          >
            Start a Conversation
            <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </motion.div>
      </section>

      <Footer arm="digital" />
    </main>
  );
}
