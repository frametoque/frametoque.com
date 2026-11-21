"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FounderSpotlight from "@/components/about/FounderSpotlight";
import TeamMemberCard from "@/components/about/TeamMemberCard";

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
      role: "Co-Founder & Chief Executive Officer",
      workingRole: "Cinematographer & Video Editor",
      expertise: "Creative storytelling & Visual Excellence",
      image: "/images/team/kavinu.jpg",
      social: {
        linkedin: "https://www.linkedin.com/in/kavinudigitalworks/",
        facebook: "https://facebook.com/podismoka",
        instagram: "https://instagram.com/skingod.frrr/",
        email: "kavinu@frametoque.com"
      }
    },
    {
      name: "Tharul Bandara",
      role: "Co-Founder & Chief Executive Officer",
      workingRole: "Video Editor & Graphic Designer",
      expertise: "Brand identity & UI/UX design",
      image: "/images/team/tharul.jpg",
      social: {

        linkedin: "https://linkedin.com/in/",
        facebook: "https://facebook.com/profile.php?id=100085498870782",
        instagram: "https://instagram.com/bandara.tharul",
        email: "tharul@frametoque.com"
      }
    },
    {
      name: "Nelitha Priyawansha",
      role: "Chief Technology Officer",
      workingRole: "Video Editor & Web Developer",
      expertise: "Frontend & Backend development",
      image: "/images/team/nelitha.jpg",
      social: {
        linkedin: "https://linkedin.com/in/itsnelitha",
        facebook: "https://facebook.com/itsnelitha",
        github: "https://github.com/itsnelitha",
        email: "nelitha@frametoque.com"
      }
    },
    {
      name: "Sadaka Parami",
      role: "Head of Engineering",
      workingRole: "Web Developer",
      expertise: "Frontend development",
      image: "/images/team/sadaka.jpg",
      social: {
        instagram: "https://www.instagram.com/sadaka.wijerathna/",
        facebook: "https://www.facebook.com/profile.php?id=61563544419694",
        github: "https://github.com/Sadaka-Wijerathna",
        email: "sadaka@frametoque.com"
      }
    },
    {
      name: "Dasindu Nimnal",
      role: "Head of Media",
      workingRole: "Photographer",
      expertise: "Portrait photography",
      image: "/images/team/dasindu.jpg",
      social: {
        instagram: "https://www.instagram.com/dazuu.jay/",
        facebook: "https://www.facebook.com/profile.php?id=100082846762501",
        email: "dasindu@frametoque.com"
      }
    },
  ];   

  return (
    <div className="bg-black text-white selection:bg-brand-500 selection:text-white">
      <Navbar scrolled={true} />
      
      <main className="min-h-screen relative overflow-hidden">
        {/* Hero Section */}
        <section className="relative pt-36 pb-20 sm:pt-44 sm:pb-28 px-6 lg:px-16 overflow-hidden">
          {/* Ambient Glow Background */}
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] sm:w-[900px] h-[400px] bg-brand-500/15 blur-[120px] rounded-full" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(22,159,228,0.2),rgba(0,0,0,0))]" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-5xl mx-auto text-center relative z-10"
          >
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight mb-5">
              <span className="bg-gradient-to-b from-white via-white to-gray-400 bg-clip-text text-transparent">
                About{" "}
              </span>
              <span className="bg-gradient-to-r from-brand-300 via-brand-400 to-brand-500 bg-clip-text text-transparent">
                Frametoque.
              </span>
            </h1>

            <p className="text-gray-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
              One creative collective across two core arms. Born in Sri Lanka from school media units and curious experiments with cameras and code, Frametoque has grown from student creative projects into a modern technology and production house crafting high-impact digital experiences.
            </p>
          </motion.div>
        </section>

        {/* Story & Structure Section */}
        <section className="py-20 px-6 lg:px-16 border-t border-white/5 bg-slate-950/60 relative">
          <div className="max-w-4xl mx-auto">
            <div className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  className="border-l-2 border-brand-500/60 pl-6 space-y-2"
                >
                  <h2 className="text-xl font-semibold text-white">
                    <span className="text-brand-400">Our Vision</span>
                  </h2>
                  <p className="text-slate-400 leading-relaxed text-sm sm:text-base">
                    To grow into one of Sri Lanka’s leading creative teams that helps brands
                    stand out. We want to mix creativity and technology to build fresh,
                    powerful digital stories.
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                  className="border-l-2 border-brand-500/60 pl-6 space-y-2"
                >
                  <h2 className="text-xl font-semibold text-white">
                    <span className="text-brand-400">Our Mission</span>
                  </h2>
                  <p className="text-slate-400 leading-relaxed text-sm sm:text-base">
                    To create real and meaningful experiences through design, video, and code.
                    Our goal is to help brands connect with people in a way that
                    feels honest, modern, and unforgettable.
                  </p>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.55, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="border-l-2 border-brand-500/60 pl-6 space-y-4 pt-4"
              >
                <h2 className="text-xl font-semibold text-white">
                  <span className="text-brand-400">Our Structure</span>
                </h2>
                <p className="text-slate-400 leading-relaxed text-sm sm:text-base">
                  Frametoque Digital Productions operates as a unified group with two core operational arms and their dedicated sub-arms:
                </p>
                <ul className="space-y-2.5 text-sm sm:text-base text-slate-300">
                  <li><strong className="text-white">Frametoque Digital:</strong> Full-stack web application development, brand identity systems, video editing & VFX, and digital marketing, with <em>Framebooks</em> as its proprietary cloud ERP and accounting sub-arm.</li>
                  <li><strong className="text-white">Frametoque Productions:</strong> Cinematic videography, event photography, commercial shoots, and live event productions, with <em>Frametoque Rentals</em> as its dedicated cinema gear and equipment hire sub-arm.</li>
                </ul>
              </motion.div>
            </div>
          </div>
        </section>


        <section className="max-w-6xl mx-auto px-6 py-20 border-t border-white/5">
          <FounderSpotlight />
        </section>

        <section className="bg-[#111111] py-24 border-y border-white/5">
          <div className="max-w-6xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-6 mb-16"
            >
              <div className="max-w-4xl">
                <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
                  The Minds Behind <span className="text-brand-500">The Magic</span>
                </h2>
              </div>
              <p className="text-gray-400 text-sm md:text-base leading-relaxed max-w-2xl">
                A diverse group of designers, developers, and creators dedicated to pushing the boundaries of digital excellence.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {teamMembers.map((member, index) => (
                <motion.div
                  key={member.name}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                >
                  <TeamMemberCard
                    {...member}
                    accentColor={index % 2 === 0 ? "brand-500" : "brand-400"}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
