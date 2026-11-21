"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

const protectImage = (e) => e.preventDefault();

const clients = [
  { name: "Prince of Wales' College", logo: "/images/clients/logo/pwc.webp" },
  { name: "Nalanda College", logo: "/images/clients/logo/nalanda.png" },
  { name: "D.S. Senanayake College", logo: "/images/clients/logo/ds.png" },
  { name: "Carz One Motor Trading", logo: "/images/clients/logo/carzone.png" },
  { name: "NextVibe", logo: "/images/clients/logo/nextvibe.png" },
  { name: "TechRoLK", logo: "/images/clients/logo/techrolk.png" },
  { name: "CM with Janindu", logo: "/images/clients/logo/cmjr.png" },
];

export default function Clients() {
  const sliderRef = useRef(null);
  
    useEffect(() => {
      const slider = sliderRef.current;
      if (!slider) return;
  
      let speed = 0.8;
      let animation;
  
      const autoScroll = () => {
        slider.scrollLeft += speed;

        if (slider.scrollLeft >= slider.scrollWidth / 2) {
          slider.scrollLeft -= slider.scrollWidth / 2;
        }

        animation = requestAnimationFrame(autoScroll);
      };
  
      animation = requestAnimationFrame(autoScroll);
  
      return () => cancelAnimationFrame(animation);
    }, []);
  
    useEffect(() => {
      const slider = sliderRef.current;
      if (!slider) return;
  
      let isDown = false;
      let startX;
      let scrollLeft;
  
      const startDrag = (e) => {
        isDown = true;
        slider.classList.add("cursor-grabbing");
        slider.classList.remove("cursor-grab");
  
        startX = (e.pageX || e.touches[0].pageX) - slider.offsetLeft;
        scrollLeft = slider.scrollLeft;
      };
  
      const stopDrag = () => {
        isDown = false;
        slider.classList.add("cursor-grab");
        slider.classList.remove("cursor-grabbing");
      };
  
      
      const moveDrag = (e) => {
        if (!isDown) return;
  
        e.preventDefault();
        const x = (e.pageX || e.touches[0].pageX) - slider.offsetLeft;
        const walk = (x - startX) * 1.2; 
        slider.scrollLeft = scrollLeft - walk;
      };
  
      slider.addEventListener("mousedown", startDrag);
      slider.addEventListener("mouseleave", stopDrag);
      slider.addEventListener("mouseup", stopDrag);
      slider.addEventListener("mousemove", moveDrag);
  
      slider.addEventListener("touchstart", startDrag);
      slider.addEventListener("touchend", stopDrag);
      slider.addEventListener("touchmove", moveDrag);
  
      return () => {
        slider.removeEventListener("mousedown", startDrag);
        slider.removeEventListener("mouseleave", stopDrag);
        slider.removeEventListener("mouseup", stopDrag);
        slider.removeEventListener("mousemove", moveDrag);
  
        slider.removeEventListener("touchstart", startDrag);
        slider.removeEventListener("touchend", stopDrag);
        slider.removeEventListener("touchmove", moveDrag);
      };
    }, []);

  return (
    <section className="py-20 bg-slate-950 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-6xl mx-auto text-center mb-12"
      >
        <h2 className="text-4xl sm:text-5xl font-bold">
          <span className="bg-gradient-to-b from-white to-gray-300 bg-clip-text text-transparent">
            Our&nbsp;
          </span>
          <span className="bg-gradient-to-b from-brand-400 to-brand-500 bg-clip-text text-transparent">
            Clients
          </span>
        </h2>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.8, delay: 0.15 }}
        className="relative max-w-6xl mx-auto px-6"
      >
        <div className="pointer-events-none absolute left-0 top-0 h-full w-24 bg-gradient-to-r from-slate-950 to-transparent z-20"></div>
        <div className="pointer-events-none absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-slate-950 to-transparent z-20"></div>

        <div
          ref={sliderRef}
          className="
            flex gap-8 py-4 
            overflow-hidden
            select-none
            cursor-grab
          "
        >
          {clients.concat(clients).map((client, i) => (
            <div
              key={i}
              className="
                min-w-[210px] sm:min-w-[230px] 
                shrink-0 
                bg-slate-900/60 
                border border-white/5 hover:border-brand-500/30
                rounded-2xl 
                px-6 py-5 
                flex flex-col items-center justify-center
                hover:bg-slate-900/90 transition-all duration-300
              "
            >
              <div className="w-16 h-16 flex items-center justify-center relative mb-3">
                <Image
                  src={client.logo}
                  width={64}
                  height={64}
                  alt={client.name}
                  onContextMenu={protectImage}
                  onDragStart={protectImage}
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-sm font-semibold text-white text-center truncate max-w-[190px]">
                {client.name}
              </p>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
