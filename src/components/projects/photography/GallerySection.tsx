"use client";

import { useState } from "react";
import { photographyImages } from "./images";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";

const GallerySection = () => {
  const images = photographyImages;
  
  // -1 means closed, otherwise it represents the slide index
  const [index, setIndex] = useState(-1);

  // Transform our simple string paths into the slide objects the lightbox expects
  const slides = images.map((src) => ({ src }));

  return (
    <section className="py-24 px-4 bg-black text-white">
        <div className="text-center mb-12 sm:mb-16 lg:mb-20">
          <h2 className="text-5xl sm:text-4xl md:text-5xl lg:text-7xl font-black mb-4 sm:mb-6 tracking-tight">
            <span className="bg-gradient-to-b from-white to-gray-300 bg-clip-text text-transparent">
              Our Latest&nbsp;
            </span>
            <span className="bg-gradient-to-b from-brand-400 to-brand-600 bg-clip-text text-transparent">
              Works
            </span>
          </h2>
          <p className="text-gray-400 text-base sm:text-lg max-w-3xl mx-auto leading-relaxed">
            Explore our diverse portfolio of cinematic and beautiful photography captures.
          </p>
        </div>

      {/* Masonry Columns Layout */}
      <div className="max-w-7xl mx-auto columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
        {images.map((src, i) => (
          <div 
            key={`img-${i}`} 
            className="break-inside-avoid cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setIndex(i)}
          >
            <img
              src={src}
              alt={`Gallery photo ${i + 1}`}
              loading="lazy"
              className="w-full h-auto rounded-sm"
            />
          </div>
        ))}
      </div>

      {images.length > 0 && (
        <div className="flex justify-center mt-16 pb-8">
          <button className="px-8 py-3 rounded-full font-medium text-sm shadow-lg shadow-brand-500/30 bg-gradient-to-br from-brand-400 via-brand-500 to-brand-600 text-white hover:opacity-90 transition-opacity uppercase tracking-widest">
            Load More
          </button>
        </div>
      )}

      {/* Interactive Swipe & Zoom Lightbox */}
      <Lightbox
        open={index >= 0}
        index={index >= 0 ? index : 0}
        close={() => setIndex(-1)}
        slides={slides}
        plugins={[Zoom]}
        controller={{ closeOnBackdropClick: true }}
        zoom={{
          maxZoomPixelRatio: 3,
        }}
      />
    </section>
  );
};

export default GallerySection;
