"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Star } from "lucide-react";

import WebSub from "@/components/services/WebSub";
import GraphicsSub from "@/components/services/GraphicsSub";
import VidSub from "@/components/services/VidSub";

export default function ServicesMain() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section className="py-16 sm:py-20 px-6 lg:px-8">
          <section id="web" className="mb-12 sm:mb-16">
            <WebSub />
          </section>
    
          <section id="graphics" className="mb-12 sm:mb-16">
            <GraphicsSub />
          </section>
    
          <section id="video">
            <VidSub />
          </section>

      <div className="max-w-7xl mx-auto space-y-20 mt-16">
       


        <p className="text-center text-gray-400 text-lg">
          Need something custom?{" "}
          <Link
            href="/contact"
            className="text-green-500 font-semibold hover:text-green-400"
          >
            Contact us
          </Link>
        </p>
      </div>
    </section>
  );
}
