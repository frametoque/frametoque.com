"use client";

import Link from "next/link";
import Image from "next/image";
import { Zap } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

export default function Hero() {
  const [loaded, setLoaded] = useState(false);
  const protectImage = (e: React.SyntheticEvent) => e.preventDefault();

  return (
    <>
      <section className="relative min-h-[110vh] overflow-hidden bg-black">
        {/* Background Image */}
        <div className="absolute inset-0 z-0 animate-hero-zoom">
          <Image
            src="/back3.png"
            alt="Hero Background"
            fill
            priority
            className="object-cover"
            quality={75}
            onLoad={() => setLoaded(true)}
            onContextMenu={protectImage}
            onDragStart={protectImage}
          />
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-40 pb-16 min-h-screen">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 mb-8 backdrop-blur-sm"
          >
            <span className="bg-brand-500/20 text-brand-300 text-xs font-medium px-3 py-0.5 rounded-full flex items-center justify-center gap-1">
              <Zap className="w-3 h-3" /> Strategy
            </span>
            <span className="text-sm text-gray-300">Simple.Better.Fast.</span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.1] max-w-4xl tracking-tight"
          >
            <span className="bg-gradient-to-b from-white to-white/95 bg-clip-text text-transparent block">
              Your Brand Deserves
            </span>
            <span className="bg-gradient-to-r from-brand-300 to-brand-500 bg-clip-text text-transparent block">
              Better Visuals.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 text-gray-400 text-sm md:text-base max-w-2xl leading-relaxed"
          >
            Frametoque Digital Productions unites high-performance web engineering, distinctive branding, and cinematic video storytelling under one roof. We make brands look serious.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.34, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col sm:flex-row items-center gap-4 mt-10 w-full sm:w-auto"
          >
            <Link
              href="/digital"
              className="w-full sm:w-auto px-7 py-3 rounded-full font-semibold text-sm border-2 border-brand-500/50 text-white hover:bg-brand-500/10 hover:border-brand-400 transition-all duration-300 flex items-center justify-center gap-2.5 hover:scale-105 active:scale-95 shadow-lg shadow-brand-500/10"
            >
              <Image
                src="/logos/ft/logo.png"
                alt="Frametoque Digital"
                width={20}
                height={20}
                className="w-4.5 h-4.5 sm:w-5 sm:h-5 object-contain shrink-0"
              />
              <span>Frametoque Digital</span>
            </Link>
            <Link
              href="/productions"
              className="w-full sm:w-auto px-7 py-3 rounded-full font-semibold text-sm border-2 border-brand-500/50 text-white hover:bg-brand-500/10 hover:border-brand-400 transition-all duration-300 flex items-center justify-center gap-2.5 hover:scale-105 active:scale-95 shadow-lg shadow-brand-500/10"
            >
              <Image
                src="/logos/ft/logo.png"
                alt="Frametoque Productions"
                width={20}
                height={20}
                className="w-4.5 h-4.5 sm:w-5 sm:h-5 object-contain shrink-0"
              />
              <span>Frametoque Productions</span>
            </Link>
          </motion.div>
        </div>
      </section>

      {/*  Divider */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="w-full leading-none -mt-15 relative z-2"
      >
        <Image
          src="/divider.webp"
          alt=" Divider"
          width={1920}
          height={200}
          quality={100}
          className="w-full h-auto block"
          priority
          onContextMenu={protectImage}
          onDragStart={protectImage}
        />
      </motion.div>
    </>
  );
}
