"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { graphicImages } from "./images";

export function GalleryImage({
  src,
  alt,
  onClick,
  index,
}: {
  src: string;
  alt: string;
  onClick: () => void;
  index: number;
}) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      className="break-inside-avoid mb-4 cursor-pointer group relative overflow-hidden bg-neutral-900 min-h-[200px]"
      onClick={onClick}
    >
      <AnimatePresence>
        {!isLoaded && (
          <motion.div
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-neutral-900 flex items-center justify-center"
          >
            <div
              className="w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer"
              style={{ backgroundSize: "200% 100%" }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Image
        src={src}
        alt={alt}
        width={800}
        height={1000}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        className={`w-full h-auto transition-all duration-1000 group-hover:scale-105 ${
          isLoaded ? "opacity-100 blur-0" : "opacity-0 blur-xl scale-110"
        }`}
        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
      />

      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
      <div className="absolute inset-0 border border-white/0 group-hover:border-white/10 transition-colors duration-300 pointer-events-none" />
    </motion.div>
  );
}

export function GraphicDesignGallery({ onOpen }: { onOpen: (i: number) => void }) {
  return (
    <div className="max-w-7xl mx-auto columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 px-4 overflow-hidden">
      {graphicImages.map((src, i) => (
        <GalleryImage
          key={`${src}-${i}`}
          src={src}
          alt={`Graphic Design photo ${i + 1}`}
          index={i}
          onClick={() => onOpen(i)}
        />
      ))}
    </div>
  );
}
