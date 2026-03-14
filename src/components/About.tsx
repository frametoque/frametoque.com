"use client";
import { useEffect, useState } from "react";
import WhyChooseUs from "@/components/WhyChooseUs";
import Clients from "@/components/Clients";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Linkedin, Facebook, Github, Mail, Instagram, Youtube, Music2 } from 'lucide-react';
import Link from 'next/link';

export default function AboutUs() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 50);
    }

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  type TeamMember = {
  name: string;
  role: string;
  expertise: string;
  social: Record<string, string>;
};

  const teamMembers : TeamMember[] = [
    {
      name: "Kavinu Pasandul",
      role: "Video Editor",
      expertise: "Creative storytelling",
      social: {
        linkedin: "https://linkedin.com/in/",
        instagram: "https://instagram.com/", 
        tiktok: "https://tiktok.com/",
        email: "kavinu@frametoque.online"
      }
    },
    {
      name: "Tharul Bandara",
      role: "Graphic Designer",
      expertise: "Brand identity & UI/UX design",
      social: {
        linkedin: "https://linkedin.com/in/",
        facebook: "https://facebook.com/",
        instagram: "https://instagram.com/",
        email: "tharul@frametoque.online"
      }
    },
    {
      name: "Nelitha Priyawansha",
      role: "Developer",
      expertise: "Frontend & Backend development",
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
      social: {
        linkedin: "https://linkedin.com/in/",
        facebook: "https://facebook.com/",
        github: "https://github.com/",
        email: "sadaka@frametoque.online"
      }
    },
    {
      name: "Dasindu Nimnal",
      role: "Photographer",
      expertise: "Portrait & Commercial photography",
      social: {
        instagram: "https://instagram.com/",
        facebook: "https://facebook.com/",
        tiktok: "https://tiktok.com/",
        email: "dasindu@frametoque.online"
      }
    },
    {
      name: "Senuja Brian",
      role: "Video Editor",
      expertise: "Creative storytelling",
      social: {
        instagram: "https://instagram.com/",
        facebook: "https://facebook.com/",
        tiktok: "https://tiktok.com/",
        email: "brian@frametoque.online"
      }
    }
  ];

  return (
    <div>
      <Navbar scrolled={scrolled} />
      <div className="h-20" />
      <section className="min-h-screen bg-slate-950 text-white py-16 px-6 sm:px-10 lg:px-16 relative overflow-hidden">
        {/* Pulse */}
        <div className="absolute top-20 left-4 sm:left-10 w-48 sm:w-72 h-48 sm:h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        
        <div className="max-w-7xl mx-auto text-center mb-16 relative z-10">
          <h2 className="text-5xl sm:text-6xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-b from-white to-gray-300 bg-clip-text text-transparent">
              About&nbsp;
            </span>
            <span className="bg-gradient-to-b from-blue-400 to-blue-500 bg-clip-text text-transparent">
              Us
            </span>
          </h2>

          <p className="text-gray-400 text-base sm:text-lg max-w-3xl mx-auto leading-relaxed">
            At Frame Toque, we believe in bringing creativity to life. From web design to video editing, we help businesses and creators look professional and unforgettable online. Your vision, our skill - a perfect match.
          </p>
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              <span className="text-blue-400">Meet Our</span> Team
            </h2>
          </div>
          
          <div className="flex flex-wrap justify-center gap-6">
            {teamMembers.map((member, index) => (
                <div
                  key={index}
                  className="group relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-slate-700/50 w-full sm:w-[calc(50%-12px)] lg:w-[calc(25%-18px)] max-w-xs"
                >
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-slate-700/50 to-slate-800/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 mt-4">
                  <span className="text-3xl font-bold text-white">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>

                <div className="text-center mb-6">
                  <h4 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                    {member.name}
                  </h4>
                  <p className="text-blue-300 font-medium mb-1">{member.role}</p>
                </div>

                {member.expertise && (
                  <p className="text-sm text-gray-400 text-center mb-6 line-clamp-2">
                    {member.expertise}
                  </p>
                )}

                <div className="flex justify-center space-x-3 mb-4 flex-wrap">
                  {member.social?.linkedin && (
                    <Link
                      href={member.social.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center hover:bg-[#0077B5] hover:text-white transition-all hover:scale-110"
                      aria-label={`${member.name}'s LinkedIn`}
                    >
                      <Linkedin className="w-5 h-5" />
                    </Link>
                  )}
                  
                  {member.social?.facebook && (
                    <Link
                      href={member.social.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center hover:bg-[#1877F2] hover:text-white transition-all hover:scale-110"
                      aria-label={`${member.name}'s Facebook`}
                    >
                      <Facebook className="w-5 h-5" />
                    </Link>
                  )}
                  
                  {member.social?.github && (
                    <Link
                      href={member.social.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center hover:bg-gray-900 hover:text-white transition-all hover:scale-110"
                      aria-label={`${member.name}'s GitHub`}
                    >
                      <Github className="w-5 h-5" />
                    </Link>
                  )}
                  
                  {member.social?.instagram && (
                    <Link
                      href={member.social.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center hover:bg-gradient-to-br hover:from-purple-500 hover:via-pink-500 hover:to-orange-500 hover:text-white transition-all hover:scale-110"
                      aria-label={`${member.name}'s Instagram`}
                    >
                      <Instagram className="w-5 h-5" />
                    </Link>
                  )}
                  
                  {member.social?.youtube && (
                    <Link
                      href={member.social.youtube}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center hover:bg-[#FF0000] hover:text-white transition-all hover:scale-110"
                      aria-label={`${member.name}'s YouTube`}
                    >
                      <Youtube className="w-5 h-5" />
                    </Link>
                  )}
                  
                  {member.social?.tiktok && (
                    <Link
                      href={member.social.tiktok}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center hover:bg-black hover:text-white transition-all hover:scale-110"
                      aria-label={`${member.name}'s TikTok`}
                    >
                      <Music2 className="w-5 h-5" />
                    </Link>
                  )}
                  
                  {member.social?.email && (
                    <Link
                      href={`mailto:${member.social.email}`}
                      className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all hover:scale-110"
                      aria-label={`Email ${member.name}`}
                    >
                      <Mail className="w-5 h-5" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="pt-24" />
        <Clients />
        <div className="pb-16" />
      </section>
      <WhyChooseUs />
      <Footer />
    </div>
  );
}