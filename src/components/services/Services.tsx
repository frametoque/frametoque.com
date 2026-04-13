"use client";
import { useEffect, useState } from "react";


import WebSub from "@/components/services/WebSub";
import GraphicsSub from "@/components/services/GraphicsSub";
import VidSub from "@/components/services/VidSub";
import PhotoSub from "@/components/services/PhotoSub";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";


export default function ServicesMain() {

    const [scrolled, setScrolled] = useState(false);
  
    useEffect(() => {
      function handleScroll() {
        setScrolled(window.scrollY > 50);
      }
  
      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
    }, []);

  return (
    <>
    <Navbar scrolled={scrolled} />

        <div className="h-20" />
        <div className="h-20" />

        {/* Pulse */}
        <div className="absolute top-20 left-4 sm:left-10 w-48 sm:w-72 h-48 sm:h-72 bg-brand-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-4 sm:right-10 w-64 sm:w-96 h-64 sm:h-96 bg-[#3B82F6]-500/10 rounded-full blur-3xl animate-pulse delay-1000" />

        <div className="max-w-7xl mx-auto text-center mb-8">
          <h2 className="text-5xl sm:text-6xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-b from-white to-gray-300 bg-clip-text text-transparent">What We
            </span>
            <span className="bg-gradient-to-b from-brand-400 to-brand-500 bg-clip-text text-transparent">
              &nbsp;Do
            </span>
          </h2>
          <p className="text-gray-400 text-base sm:text-lg max-w-3xl mx-auto leading-relaxed">
            From websites to videos, we make your brand look amazing everywhere.
          </p>
        </div>

    <section className="py-16 sm:py-20 px-6 lg:px-8">
      <section id="web" className="mb-12 sm:mb-16">
        <WebSub />
      </section>

      <section id="graphic" className="mb-12 sm:mb-16">
        <GraphicsSub />
      </section>

      <section id="video">
        <VidSub />
      </section>

      <section id="photo">
        <PhotoSub />
      </section>
      

        
     
    </section>


            <br /><br /><br /><br /><br />
        <Footer />

    </>
  );
}