"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Mail,
  Instagram,
  Linkedin,
  Youtube,
  Facebook,
  Phone,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { CONTACT } from "@/config/contact";

const TikTok = () => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    className="w-5 h-5"
  >
    <title>TikTok</title>
    <path
      d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"
      fill="currentColor"
    />
  </svg>
);

const WhatsApp = ({ className = "" }: { className?: string }) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    className={`w-5 h-5 ${className}`}
    fill="currentColor"
  >
    <title>WhatsApp</title>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

const socialLinks = [
  // Instagram (Productions & Digital)
  {
    href: "https://instagram.com/frametoque.productions",
    icon: <Instagram className="w-5 h-5" />,
    label: "Productions (Instagram)",
  },
  {
    href: "https://instagram.com/frametoque.digital",
    icon: <Instagram className="w-5 h-5" />,
    label: "Digital (Instagram)",
  },

  // Facebook (Productions & Digital)
  {
    href: "https://facebook.com/frametoque.productions",
    icon: <Facebook className="w-5 h-5" />,
    label: "Productions (Facebook)",
  },
  {
    href: "https://facebook.com/frametoque.digital",
    icon: <Facebook className="w-5 h-5" />,
    label: "Digital (Facebook)",
  },

  // TikTok (Productions & Digital)
  {
    href: "https://tiktok.com/@frametoque.productions",
    icon: <TikTok />,
    label: "Productions (TikTok)",
  },
  {
    href: "https://tiktok.com/@frametoque.digital",
    icon: <TikTok />,
    label: "Digital (TikTok)",
  },

  // Single platforms
  {
    href: "https://www.linkedin.com/company/frametoque/",
    icon: <Linkedin className="w-5 h-5" />,
    label: "LinkedIn",
  },
  {
    href: "https://www.youtube.com/@Frametoque",
    icon: <Youtube className="w-5 h-5" />,
    label: "YouTube",
  },
];

const departments = [
  {
    role: "General Inquiries",
    email: CONTACT.emails.general,
  },
  {
    role: "Frametoque Digital",
    email: CONTACT.emails.digital,
  },
  {
    role: "Frametoque Productions",
    email: CONTACT.emails.productions,
  },
  {
    role: "Frametoque Rentals",
    email: CONTACT.emails.rentals,
  },
  {
    role: "Careers",
    email: CONTACT.emails.careers,
  },
  {
    role: "Marketing & Partnerships",
    email: CONTACT.emails.marketing,
  },
];

const faqs = [
  {
    q: "How fast do you reply?",
    a: "Usually within a few hours during business hours. For urgent equipment rentals or shoot inquiries, WhatsApp is the fastest channel.",
  },
  {
    q: "How do I choose between Digital and Productions?",
    a: "Frametoque Digital handles web development, apps, digital design, and video editing. Frametoque Productions handles photography, cinematic videography, and event production packages. For cross-discipline projects, our teams collaborate seamlessly.",
  },
  {
    q: "How do equipment rentals work?",
    a: "Explore our live gear catalog under /rentals, add items to your cart, and complete your reservation via WhatsApp with our rental desk. Verification is fast and secure.",
  },
  {
    q: "Can we collaborate long-term?",
    a: "Absolutely. Many of our corporate clients maintain ongoing monthly retainers for digital engineering, video content creation, or SaaS tooling.",
  },
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
        {/* Hero Section */}
        <section className="relative pt-36 pb-20 sm:pt-44 sm:pb-24 px-6 lg:px-16 overflow-hidden">
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
                Get in{" "}
              </span>
              <span className="bg-gradient-to-r from-brand-300 via-brand-400 to-brand-500 bg-clip-text text-transparent">
                Touch.
              </span>
            </h1>

            <p className="text-gray-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
              Connect directly with our specialized teams across Digital, Productions, and Rentals. We are ready to build something iconic together.
            </p>
          </motion.div>
        </section>

        <section className="max-w-5xl mx-auto px-6 pt-12 sm:pt-16 pb-20 space-y-16">
          {/* Quick Direct Lines */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="border-l-2 border-brand-500/60 pl-6"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-400">Direct Lines & Address</p>
              <h2 className="text-2xl font-bold text-white">Call or WhatsApp</h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: 0, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link
                  href={CONTACT.whatsapp.general.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-brand-500/40 rounded-2xl px-6 py-5 transition-all duration-200 group h-full"
                >
                  <div className="p-3 rounded-xl bg-brand-500/10 group-hover:bg-brand-500/20 transition-colors">
                    <WhatsApp className="text-brand-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5 uppercase tracking-wider">
                      WhatsApp (Primary)
                    </p>
                    <p className="text-sm font-semibold text-slate-200 group-hover:text-brand-400 transition-colors">
                      {CONTACT.whatsapp.general.display}
                    </p>
                  </div>
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link
                  href={CONTACT.phones.secondary.tel}
                  className="flex items-center gap-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-brand-500/40 rounded-2xl px-6 py-5 transition-all duration-200 group h-full"
                >
                  <div className="p-3 rounded-xl bg-brand-500/10 group-hover:bg-brand-500/20 transition-colors">
                    <Phone className="w-5 h-5 text-brand-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5 uppercase tracking-wider">
                      Secondary Line
                    </p>
                    <p className="text-sm font-semibold text-slate-200 group-hover:text-brand-400 transition-colors">
                      {CONTACT.phones.secondary.display}
                    </p>
                  </div>
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link
                  href={CONTACT.address.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-brand-500/40 rounded-2xl px-6 py-5 transition-all duration-200 group h-full"
                >
                  <div className="p-3 rounded-xl bg-brand-500/10 group-hover:bg-brand-500/20 transition-colors">
                    <MapPin className="w-5 h-5 text-brand-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-400 mb-0.5 uppercase tracking-wider flex items-center gap-1">
                      Address <ExternalLink className="w-3 h-3 text-slate-500" />
                    </p>
                    <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-brand-400 transition-colors">
                      {CONTACT.address.full}
                    </p>
                  </div>
                </Link>
              </motion.div>
            </div>
          </div>

          {/* Department Directory */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="border-l-2 border-brand-500/60 pl-6"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-400">Department Directory</p>
              <h2 className="text-2xl font-bold text-white">Reach the Right Team Directly</h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {departments.map((dept, index) => (
                <motion.div
                  key={dept.email + dept.role}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Link
                    href={`mailto:${dept.email}`}
                    className="flex flex-col justify-between bg-white/5 hover:bg-white/10 border border-white/10 hover:border-brand-500/40 rounded-2xl p-6 transition-all duration-200 group h-full"
                  >
                    <div className="space-y-3">
                      <div className="w-9 h-9 rounded-xl bg-brand-500/10 group-hover:bg-brand-500/20 transition-colors flex items-center justify-center">
                        <Mail className="w-4 h-4 text-brand-400" />
                      </div>
                      <h3 className="text-base font-semibold text-white group-hover:text-brand-300 transition-colors">
                        {dept.role}
                      </h3>
                    </div>
                    <div className="mt-4">
                      <span className="text-xs font-medium text-brand-400 group-hover:text-brand-300 transition-colors">
                        {dept.email}
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Socials */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="border-l-2 border-brand-500/60 pl-6"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-400">Social Channels</p>
              <h2 className="text-2xl font-bold text-white">Follow Our Work</h2>
            </motion.div>

            <div className="flex flex-wrap justify-center gap-3">
              {socialLinks.map((item, index) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.45, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  className="w-[calc(50%-6px)] sm:w-[calc(25%-9px)]"
                >
                  <Link
                    href={item.href}
                    aria-label={item.label}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-brand-500/40 rounded-xl px-4 py-3.5 transition-all duration-200 group w-full"
                  >
                    <span className="text-slate-400 group-hover:text-brand-400 transition-colors">
                      {item.icon}
                    </span>
                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors truncate">
                      {item.label}
                    </span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="bg-[#111111] py-24 border-y border-white/5">
          <div className="max-w-4xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-4 mb-16"
            >
              <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
                Frequently Asked{" "}
                <span className="text-brand-500">Questions</span>
              </h2>
              <p className="text-gray-400 text-sm md:text-base leading-relaxed max-w-2xl">
                Quick answers across Frametoque Digital, Frametoque Productions, Frametoque Rentals, and Framebooks.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {faqs.map((faq, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                  className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-2 hover:border-brand-500/30 transition-colors"
                >
                  <h3 className="font-semibold text-white text-base">
                    {faq.q}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {faq.a}
                  </p>
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
