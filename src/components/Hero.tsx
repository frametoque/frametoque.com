"use client";

import Link from "next/link";
import Image from "next/image";
import { Zap, FolderKanban, Layers } from "lucide-react";
import { useState } from "react";

export default function Hero() {
  const [loaded, setLoaded] = useState(false);
  const protectImage = (e) => e.preventDefault();
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
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 mb-8 backdrop-blur-sm animate-in slide-in-from-bottom duration-700">
              <span className="bg-brand-500/20 text-brand-300 text-xs font-medium px-3 py-0.5 rounded-full flex items-center justify-center gap-1">
                <Zap className="w-3 h-3" /> Strategy
              </span>
              <span className="text-sm text-gray-300">Simple.Better.Fast.</span>
            </div>

            {/* Heading */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.1] max-w-4xl tracking-tight animate-in slide-in-from-bottom duration-700 delay-100">
              <span className="bg-gradient-to-b from-white to-white/95 bg-clip-text text-transparent block">
                Your Brand Deserves
              </span>
              <span className="bg-gradient-to-r from-brand-300 to-brand-500 bg-clip-text text-transparent block">
                Better Visuals.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-6 text-gray-400 text-sm md:text-base max-w-2xl leading-relaxed animate-in slide-in-from-bottom duration-700 delay-200">
              We craft fast websites, bold graphic, and pro videos that make your brand shine. We make brands look serious.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-4 mt-10 animate-in slide-in-from-bottom duration-700 delay-300 w-full sm:w-auto">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-6 py-2.5 rounded-full font-medium text-sm shadow-lg shadow-brand-500/30 bg-gradient-to-br from-brand-400 via-brand-500 to-brand-600 text-white hover:opacity-90 transition-opacity flex items-center justify-center"
              >
                Dashboard
              </Link>
              <Link
                href="/projects"
                className="w-full sm:w-auto px-6 py-2.5 rounded-full font-medium text-sm border-2 border-brand-500/50 text-white hover:bg-brand-500/10 transition-colors flex items-center justify-center gap-2"
              >
                <FolderKanban className="w-4 h-4 text-brand-400" /> What We Did
              </Link>
            </div>
          </div>
        </section>

          {/*  Divider */}
          <div className="w-full leading-none -mt-15 relative z-2">
            <Image
              src="/divider.png"
              alt=" Divider"
              width={1920}
              height={200}
              quality={100}
              className="w-full h-auto block"
              priority
              onContextMenu={protectImage}
              onDragStart={protectImage}    
            />
          </div>
    </>
  );
}
