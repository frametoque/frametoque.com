"use client";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FounderSpotlight from "@/components/about/FounderSpotlight";
import TeamMemberCard from "@/components/about/TeamMemberCard";
import Image from "next/image";

export default function AboutUs() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 50);
    }

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const teamMembers = [
        {
      name: "Kavinu Pasandul",
      role: "Cinematographer | Video Editor",
      expertise: "Creative storytelling & Visual Excellence",
      image: "/images/team/kavinu.jpg",
      social: {
        linkedin: "https://www.linkedin.com/in/kavinudigitalworks/",
        facebook: "https://facebook.com/podismoka",
        instagram: "https://www.instagram.com/skingod.frrr/",
        email: "kavinu@frametoque.online"
      }
    },
    {
      name: "Tharul Bandara",
      role: "Video Editor | Graphic Designer",
      expertise: "Brand identity & UI/UX design",
      image: "/images/team/tharul.jpg",
      social: {

        linkedin: "https://linkedin.com/in/",
        facebook: "https://www.facebook.com/profile.php?id=100085498870782",
        instagram: "https://instagram.com/bandara.tharul",
        email: "tharul@frametoque.online"
      }
    },
    {
      name: "Nelitha Priyawansha",
      role: "Video Editor | Developer",
      expertise: "Frontend & Backend development",
      image: "/images/team/nelitha.jpg",
      social: {
        linkedin: "https://linkedin.com/in/itsnelitha",
        facebook: "https://facebook.com/itsnelitha",
        github: "https://github.com/itsnelitha",
        email: "nelitha@frametoque.online"
      }
    },
    {
      name: "Sadaka Wijerathna",
      role: "Developer",
      expertise: "Frontend development",
      image: "/images/team/sadaka.jpg",
      social: {
        instagram: "https://www.instagram.com/sadaka.wijerathna/",
        facebook: "https://www.facebook.com/profile.php?id=61563544419694",
        github: "https://github.com/Sadaka-Wijerathna",
        email: "sadaka@frametoque.online"
      }
    },
    {
      name: "Dasindu Nimnal",
      role: "Photographer",
      expertise: "Portrait & Commercial photography",
      image: "/images/team/dasindu.jpg",
      social: {
        instagram: "https://www.instagram.com/dazuu.jay/",
        facebook: "https://www.facebook.com/profile.php?id=100082846762501",
        email: "dasindu@frametoque.online"
      }
    },
  ];   

  return (
    <div className="bg-black text-white selection:bg-brand-500 selection:text-white">
      <Navbar scrolled={true} />
      
      <main className="min-h-screen relative overflow-hidden">
        <section className="relative h-[40vh] md:h-[35vh] w-full bg-black overflow-hidden flex items-center justify-center">
          <Image
            src="/images/team/banner ft.png"
            alt="About Us Hero"
            fill
            priority
            className="absolute inset-0 w-full h-full object-cover opacity-60 scale-100"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black z-20 pointer-events-none" />
        </section>

        {/* Hero / Header Section */}
        <section className="py-24 px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">

            <h1 className="text-5xl sm:text-6xl lg:text-5xl font-black mb-12 tracking-tight">
              <span className="bg-gradient-to-b from-brand-400 to-brand-600 bg-clip-text text-transparent">
                About
              </span>
              <span className="bg-gradient-to-b from-white to-gray-300 bg-clip-text text-transparent">
                {" "}Us
              </span>
            </h1>

            <div className="space-y-12 text-left">

            <p className="text-slate-300 text-lg leading-relaxed text-center sm:text-left">
              Frametoque first started in Sri Lanka during our school days through media units and small creative projects.
              What began as simple school-level media work and fun experiments with cameras and code has now grown into a creative studio making modern digital experiences.
            </p>

            <div className="border-l-2 border-brand-500/60 pl-6 space-y-2">
              <h2 className="text-xl font-semibold text-white">
                <span className="text-brand-400">Our Vision</span>
              </h2>
              <p className="text-slate-400 leading-relaxed">
                To grow into one of Sri Lanka’s leading creative teams that helps brands
                stand out. We want to mix creativity and technology to build fresh,
                powerful digital stories.
              </p>
            </div>

            <div className="border-l-2 border-brand-500/60 pl-6 space-y-2">
              <h2 className="text-xl font-semibold text-white">
                <span className="text-brand-400">Our Mission</span>
              </h2>
              <p className="text-slate-400 leading-relaxed">
                To create real and meaningful experiences through design, video, and code.
                Our goal is to help brands connect with people in a way that
                feels honest, modern, and unforgettable.
              </p>
            </div>


            </div>
          </div>
        </section>


        <section className="max-w-6xl mx-auto px-6 py-20 border-t border-white/5">
          <FounderSpotlight />
        </section>

        <section className="bg-[#111111] py-24 border-y border-white/5">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex flex-col gap-6 mb-16">
              <div className="max-w-4xl">
                <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
                  The Minds Behind <span className="text-brand-500">The Magic</span>
                </h2>
              </div>
              <p className="text-gray-400 text-sm md:text-base leading-relaxed max-w-2xl">
                A diverse group of designers, developers, and creators dedicated to pushing the boundaries of digital excellence.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {teamMembers.map((member, index) => (
                <TeamMemberCard
                  key={member.name}
                  {...member}
                  accentColor={index % 2 === 0 ? "brand-500" : "brand-400"}
                />
              ))}
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
