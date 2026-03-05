"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Mail,
  Instagram,
  Linkedin,
  Youtube, Facebook
} from "lucide-react";

const TikTok = () => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6">
    <title>TikTok</title>
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" fill="currentColor" />
  </svg>
);

const Telegram = () => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6">
    <title>Telegram</title>
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" fill="currentColor" />
  </svg>
);

const WhatsApp = ({ className = "" }) => (
  <svg 
    role="img" 
    viewBox="0 0 24 24" 
    xmlns="http://www.w3.org/2000/svg" 
    className={`w-6 h-6 ${className}`}
    fill="currentColor"
  >
    <title>WhatsApp</title>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

import Link from "next/link";

export default function ContactPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 50);
    }

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      <Navbar scrolled={scrolled} />
      <div className="h-20" />
      <br /> <br />
      <section className="relative bg-slate-950/30 backdrop-blur-md py-5 px-4 sm:px-6 lg:px-8 text-center">
        {/* Pulse */}
        <div className="absolute top-20 left-4 sm:left-10 w-48 sm:w-72 h-48 sm:h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-4 sm:right-10 w-64 sm:w-96 h-64 sm:h-96 bg-[#3B82F6]-500/10 rounded-full blur-3xl animate-pulse delay-1000" />

        <div className="max-w-7xl mx-auto text-center mb-8">
          <h2 className="text-5xl sm:text-6xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-b from-blue-400 to-blue-500 bg-clip-text text-transparent">
              Contact&nbsp;
            </span>
            <span className="bg-gradient-to-b from-white to-gray-300 bg-clip-text text-transparent">
              Us
            </span>
          </h2>

          <p className="text-gray-400 text-base sm:text-lg max-w-3xl mx-auto leading-relaxed">
            Hit us up anytime - we are always down to build something iconic
            with you.
          </p>
        </div>
      </section>
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-9 space-y-10 pb-24">
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-2xl border border-white/10 space-y-6">
          <h3 className="text-3xl font-semibold text-blue-400">
            Reach Us Directly
          </h3>

          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <Mail className="text-blue-400 w-6 h-6" />
              <Link
                href="mailto:contact@frametoque.online"
                className="hover:text-blue-400 transition"
              >
                contact@frametoque.online
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              <WhatsApp className="text-blue-400 w-6 h-6" />
              <Link
                href="https://wa.me/94701901461"
                target="_blank"
                className="hover:text-blue-400 transition"
              >
                WhatsApp: +94 70 190 1461
              </Link>
            </div>
          </div>

          <h3 className="text-3xl font-semibold text-blue-400 mt-10">
            Social Media
          </h3>

          <div className="flex justify-start sm:justify-between flex-wrap gap-4 pt-2">
            {[
                {
                  href: "https://instagram.com/frametoque",
                  icon: <Instagram />,
                  label: "Instagram",
                },
                {
                  href: "https://www.linkedin.com/company/frametoque/",
                  icon: <Linkedin />,
                  label: "LinkedIn",
                },
                {
                  href: "https://www.facebook.com/FrameToque/",
                  icon: <Facebook />,
                  label: "Facebook",
                },
                {
                  href: "https://www.youtube.com/@FrameToque",
                  icon: <Youtube />,
                  label: "YouTube",
                },
                {
                  href: "https://tiktok.com/@frame.toque",
                  icon: <TikTok />,
                  label: "TikTok",
                },
                {
                  href: "https://t.me/FrameToque",
                  icon: <Telegram />,
                  label: "Telegram",
                },
                {
                  href: "mailto:info@frametoque.com",
                  icon: <Mail />,
                  label: "Email",
                },
            ].map((item, idx) => (
              <Link
                key={idx}
                href={item.href}
                aria-label={item.label}
                target="_blank"
                className="p-3 bg-slate-800/50 hover:bg-slate-700/50 transition-colors rounded-xl flex items-center justify-center"
              >
                {item.icon}
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white/5 rounded-2xl p-6 sm:p-8 shadow-2xl border border-white/10">
          <h3 className="text-3xl font-semibold text-blue-400 mb-6">FAQ</h3>

          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-lg">How fast do you reply?</h4>
              <p className="text-gray-400">
                Usually within a few hours unless we are deep in a project.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-lg">
                What services do you offer?
              </h4>
              <p className="text-gray-400">
                Web dev, graphic, branding, short-form content, and more.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-lg">
                Do you take urgent projects?
              </h4>
              <p className="text-gray-400">
                Yep - just DM us or WhatsApp us with your deadline.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-lg">
                Can we collaborate long-term?
              </h4>
              <p className="text-gray-400">
                Absolutely. Many of our clients stick with us for ongoing work.
              </p>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
