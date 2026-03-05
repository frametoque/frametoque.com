"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar.jsx";
import Hero from "@/components/Hero.jsx";
import ServicesHome from "@/components/services/ServicesHome.jsx";
import SoftwareWeUse from "@/components/SoftwareWeUse.jsx";
import ProjectsHome from "@/components/ProjectsHome.jsx";
import Collab from "@/components/Collab";
import Testimonials from "@/components/Testimonials.jsx";
import WhyChooseUs from "@/components/WhyChooseUs.jsx";
import Clients from "@/components/Clients.jsx";
import Footer from "@/components/Footer.jsx";
import StudioPromo from "@/components/FTStudio";

export default function HomeClient() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 50);
    }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white overflow-hidden">
      <Navbar scrolled={scrolled} />
      <Hero />
      <ServicesHome />
      <ProjectsHome />
      <Collab />
      <SoftwareWeUse />
      <StudioPromo />
      <Testimonials />
      <Clients />
      <WhyChooseUs />
      <Footer />
    </main>
  );
}
