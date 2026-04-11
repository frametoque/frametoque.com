"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import HeroSection from "@/components/photography/HeroSection";
import GallerySection from "@/components/photography/GallerySection";
import NewsletterSection from "@/components/photography/NewsletterSection";

export default function PhotographyPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 50);
    }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar scrolled={scrolled} />
      <HeroSection />
      <GallerySection />
      <NewsletterSection />
      <Footer />
    </main>
  );
}
