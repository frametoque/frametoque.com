"use client";
import { useEffect, useState } from "react";

import { Check, Star } from "lucide-react";
import Link from "next/link";

import WebSub from "@/components/services/WebSub";
import GraphicsSub from "@/components/services/GraphicsSub";
import VidSub from "@/components/services/VidSub";


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
      

        <div className="mt-8 sm:mt-12 text-center">
          <p className="text-gray-400 text-base text-xl">
            Need a custom plan? &nbsp;
            <Link href="/contact" className="text-green-600 hover:text-green-500 font-semibold">
              Contact Us
            </Link>
          </p>
        </div>
     
    </section>

    </>
  );
}