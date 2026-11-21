"use client";
import { useEffect, useState } from "react";

import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ArmCards from "@/components/ArmCards";
import ProjectsHome from "@/components/ProjectsHome";
import Collab from "@/components/Collab";
import Testimonials from "@/components/Testimonials";
import WhyChooseUs from "@/components/WhyChooseUs";
import Clients from "@/components/Clients";
import Footer from "@/components/Footer";

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
    <main className="min-h-screen bg-black text-white overflow-hidden">
      <Navbar scrolled={scrolled} />
      <Hero />
      <ArmCards />
      <ProjectsHome />
      <Testimonials />
      <Clients />
      <WhyChooseUs />
      <Collab />
      <Footer />
    </main>
  );
}
