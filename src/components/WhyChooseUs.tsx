"use client";

import { Check, X } from "lucide-react";
import Image from "next/image";
import { motion } from "framer-motion";
const protectImage = (e) => e.preventDefault();

const otherAgencies = [
  "Reactive communication",
  "Single channel approach",
  "Copy paste growth strategies",
  "Lack of research on your industry",
  "Outsourced to junior talent",
];

const conversionPoints = [
  "Constant, proactive communication",
  "Omni channel approach",
  "Tailored best-fit solutions",
  "Provides industry specific expertise",
  "Experts with 10+ years of experience",
];

export default function WhyChooseUs() {
  return (
    <section className="relative flex flex-col items-center justify-center px-6 py-24 overflow-hidden bg-[#111111] text-white">
      {/* Heading */}
      <motion.h2
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="text-4xl md:text-5xl lg:text-6xl font-bold text-center leading-tight mb-16 max-w-3xl relative z-10"
      >
        But, why would you
        want to work <em className="italic font-bold bg-gradient-to-b from-brand-400 to-brand-500 bg-clip-text text-transparent pr-2">with us?</em>
      </motion.h2>

      {/* Comparison cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl relative z-10">
        {/* Other Agencies */}
        <motion.div
          initial={{ opacity: 0, x: -25 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-center text-gray-400 text-lg mb-4">Other Agencies</p>
          <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-8 space-y-5 h-full">
            {otherAgencies.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <X className="w-5 h-5 mt-0.5 shrink-0 text-gray-500" />
                <span className="text-gray-400 text-[15px]">{item}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Conversion */}
        <motion.div
          initial={{ opacity: 0, x: 25 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-lg font-semibold text-white">
              <Image src="/logos/ft/name-logo.png" alt="FT logo" width={130} height={15} className="inline-block pt-10 sm:pt-20 md:pt-1 lg:pt-1" 
                onContextMenu={protectImage}
                onDragStart={protectImage} />
            </span>
          </div>
          <div className="rounded-2xl border border-brand-500/30 bg-gradient-to-br from-white/5 via-brand-900/20 to-brand-800/30 p-8 space-y-5 h-full backdrop-blur-md shadow-xl shadow-brand-500/10">
            {conversionPoints.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <Check className="w-5 h-5 mt-0.5 shrink-0 text-brand-400" />
                <span className="text-gray-100 text-[15px]">{item}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
