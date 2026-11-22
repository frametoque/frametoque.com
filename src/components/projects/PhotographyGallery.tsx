"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { type PhotographyEvent, type PhotographyImage } from "@/lib/workdata";

export function GalleryImage({
  img,
  alt,
  onClick,
  index,
}: {
  img: PhotographyImage;
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
      transition={{ duration: 0.5, delay: (index % 12) * 0.04 }}
      className="break-inside-avoid mb-4 cursor-pointer group relative overflow-hidden bg-neutral-900"
      onClick={onClick}
      style={{ aspectRatio: `${img.width} / ${img.height}` }}
    >
      <Image
        src={img.src}
        alt={alt}
        width={img.width}
        height={img.height}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        className={`w-full h-auto transition-all duration-700 group-hover:scale-105 ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
      />

      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
      <div className="absolute inset-0 border border-white/0 group-hover:border-white/10 transition-colors duration-300 pointer-events-none" />
    </motion.div>
  );
}

const INITIAL_LIMIT = 25;

export function PhotographyGallery({
  events,
  onOpen,
}: {
  events: PhotographyEvent[];   
  onOpen: (i: number) => void;
}) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  let globalIndex = 0;

  return (
    <div className="max-w-[1680px] mx-auto px-2 sm:px-4 lg:px-6 flex flex-col gap-24 pb-20">
      {events.map((event, eventIdx) => {
        const startIndex = globalIndex;
        globalIndex += event.images.length;

        const isExpanded = !!expanded[eventIdx];
        const hasMore = event.images.length > INITIAL_LIMIT;
        const visibleImages = hasMore && !isExpanded
          ? event.images.slice(0, INITIAL_LIMIT)
          : event.images;

        return (
          <motion.div
            key={event.name}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: eventIdx * 0.1 }}
            className="flex flex-col gap-6"
          >
            {/* Event Name Header */}
            <div className="flex items-center gap-5">
              <h3 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
                {event.name}
              </h3>
              <div className="flex-1 h-px bg-gradient-to-r from-white/20 to-transparent" />
            </div>

            {/* Single Unified Masonry Grid */}
            <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
              {event.images.map((img, localIndex) => {
                const isExtra = localIndex >= INITIAL_LIMIT;

                if (!isExtra) {
                  return (
                    <GalleryImage
                      key={`${eventIdx}-${localIndex}`}
                      img={img}
                      alt={`${event.name} photo ${localIndex + 1}`}
                      index={localIndex}
                      onClick={() => onOpen(startIndex + localIndex)}
                    />
                  );
                }

                return (
                  <AnimatePresence key={`extra-${eventIdx}-${localIndex}`}>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.35, ease: "easeOut", delay: (localIndex - INITIAL_LIMIT) * 0.02 }}
                        className="break-inside-avoid"
                      >
                        <GalleryImage
                          img={img}
                          alt={`${event.name} photo ${localIndex + 1}`}
                          index={localIndex}
                          onClick={() => onOpen(startIndex + localIndex)}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                );
              })}
            </div>

            {/* Show More / Show Less Button */}
            {hasMore && (
              <motion.div layout className="flex justify-center pt-2">
                <AnimatePresence mode="wait">
                  {!isExpanded ? (
                    <motion.button
                      key="show-more"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => setExpanded(prev => ({ ...prev, [eventIdx]: true }))}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm font-semibold tracking-wide transition-colors duration-300"
                    >
                      Show More
                      <span className="text-white/60 text-xs">({event.images.length - INITIAL_LIMIT} more)</span>
                    </motion.button>
                  ) : (
                    <motion.button
                      key="show-less"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => setExpanded(prev => ({ ...prev, [eventIdx]: false }))}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm font-semibold tracking-wide transition-colors duration-300"
                    >
                      Show Less
                    </motion.button>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
