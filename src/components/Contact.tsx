"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Mail, Instagram, Linkedin, Youtube, Facebook } from "lucide-react";

const TikTok = () => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
    <title>TikTok</title>
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" fill="currentColor" />
  </svg>
);

const Telegram = () => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
    <title>Telegram</title>
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" fill="currentColor" />
  </svg>
);

const WhatsApp = ({ className = "" }) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 ${className}`} fill="currentColor">
    <title>WhatsApp</title>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

const socialLinks = [
  { href: "https://www.facebook.com/Frametoque/",         icon: <Facebook className="w-5 h-5" />,   label: "Facebook"  },
  { href: "https://instagram.com/frame.toque",             icon: <Instagram className="w-5 h-5" />,  label: "Instagram" },
  { href: "https://www.linkedin.com/company/frametoque/", icon: <Linkedin className="w-5 h-5" />,   label: "LinkedIn"  },
  { href: "https://www.youtube.com/@Frametoque",          icon: <Youtube className="w-5 h-5" />,    label: "YouTube"   },
  { href: "https://tiktok.com/@frame.toque",              icon: <TikTok />,                          label: "TikTok"    },
  { href: "https://t.me/Frametoque",                      icon: <Telegram />,                        label: "Telegram"  },
];

const faqs = [
  { q: "How fast do you reply?",        a: "Usually within a few hours unless we are deep in a project." },
  { q: "What services do you offer?",   a: "Web dev, graphic, branding, short-form content, and more." },
  { q: "Do you take urgent projects?",  a: "Yep — just DM us or WhatsApp us with your deadline." },
  { q: "Can we collaborate long-term?", a: "Absolutely. Many of our clients stick with us for ongoing work." },
];

export default function ContactPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="bg-black text-white selection:bg-brand-500 selection:text-white">
      <Navbar scrolled={true} />

      <main className="min-h-screen relative overflow-hidden">

        <section className="relative h-[40vh] md:h-[35vh] w-full bg-black overflow-hidden flex items-center justify-center">
          <Image
            src="/images/team/banner ft.png"
            alt="Contact Hero"
            fill
            priority
            className="absolute inset-0 w-full h-full object-cover opacity-60 scale-100"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black z-20 pointer-events-none" />
        </section>

        <section className="py-24 px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl sm:text-6xl lg:text-5xl font-black mb-6 tracking-tight">
              <span className="bg-gradient-to-b from-brand-400 to-brand-600 bg-clip-text text-transparent">
                Contact
              </span>
              <span className="bg-gradient-to-b from-white to-gray-300 bg-clip-text text-transparent">
                {" "}Us
              </span>
            </h1>

            <p className="text-slate-300 text-lg leading-relaxed text-center sm:text-left max-w-2xl mx-auto">
              Hit us up anytime, we are always down to build something iconic with you.
            </p>
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-6 pb-20 space-y-10">

          {/* Direct contact */}
          <div className="space-y-4">
            <div className="border-l-2 border-brand-500/60 pl-6 mb-8">
              <h2 className="text-xl font-semibold">
                <span className="text-brand-400">Reach Us Directly</span>
              </h2>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="mailto:contact@frametoque.online"
                className="flex items-center gap-4 flex-1 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-brand-500/40 rounded-2xl px-6 py-5 transition-all duration-200 group"
              >
                <div className="p-2 rounded-xl bg-brand-500/10 group-hover:bg-brand-500/20 transition-colors">
                  <Mail className="w-5 h-5 text-brand-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5 uppercase tracking-wider">Email</p>
                  <p className="text-sm text-slate-200 group-hover:text-brand-400 transition-colors">
                    contact@frametoque.online
                  </p>
                </div>
              </Link>

              <Link
                href="https://wa.me/94701901461"
                target="_blank"
                className="flex items-center gap-4 flex-1 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-brand-500/40 rounded-2xl px-6 py-5 transition-all duration-200 group"
              >
                <div className="p-2 rounded-xl bg-brand-500/10 group-hover:bg-brand-500/20 transition-colors">
                  <WhatsApp className="text-brand-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5 uppercase tracking-wider">WhatsApp</p>
                  <p className="text-sm text-slate-200 group-hover:text-brand-400 transition-colors">
                    +94 70 190 1461
                  </p>
                </div>
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <div className="border-l-2 border-brand-500/60 pl-6 mb-8">
              <h2 className="text-xl font-semibold">
                <span className="text-brand-400">Social Media</span>
              </h2>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              {socialLinks.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-label={item.label}
                  target="_blank"
                  className="flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-brand-500/40 rounded-xl px-4 py-3.5 transition-all duration-200 group w-[calc(50%-6px)] sm:w-[calc(25%-9px)]"
                >
                  <span className="text-slate-400 group-hover:text-brand-400 transition-colors">
                    {item.icon}
                  </span>
                  <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                    {item.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>

        </section>



        <section className="bg-[#111111] py-24 border-y border-white/5">
          <div className="max-w-4xl mx-auto px-6">

            <div className="flex flex-col gap-6 mb-16">
              <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
                Frequently Asked <span className="text-brand-500">Questions</span>
              </h2>
              <p className="text-gray-400 text-sm md:text-base leading-relaxed max-w-2xl">
                Quick answers to the things people ask us most.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {faqs.map((faq, i) => (
                <div
                  key={i}
                  className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-2 hover:border-brand-500/30 transition-colors"
                >
                  <h3 className="font-semibold text-white text-base">{faq.q}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>

          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}