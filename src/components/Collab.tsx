"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

export default function CollabCompact() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="w-full leading-[0]"
    >
      {/* Banner */}
      <div className="relative w-full overflow-hidden leading-[0]">
        <Link href="/contact" className="block w-full group">
          <Image
            src="/collab-banner.webp"
            alt="Frametoque Digital Productions"
            width={1920}
            height={480}
            quality={100}
            className="w-full h-auto align-top block transition-transform duration-700 group-hover:scale-[1.01]"
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
          />

          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(115deg, transparent 45%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.06) 53%, transparent 58%)",
                transform: "translateX(-100%)",
                animation: "shineSweep 4s ease-in-out infinite",
              }}
            />
          </div>
        </Link>
      </div>

      <style>
        {`
          @keyframes shineSweep {
            0%   { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}
      </style>
    </motion.div>
  );
}
