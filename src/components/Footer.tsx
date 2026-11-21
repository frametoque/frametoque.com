"use client";

import { useState, useRef, useEffect } from "react";
import {
  Linkedin,
  Mail,
  Instagram,
  Youtube,
  Facebook,
} from "lucide-react";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { CONTACT } from "@/config/contact";
import { SOCIALS } from "@/config/social";
import { motion } from "framer-motion";

const TikTok = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="currentColor"
  >
    <title>TikTok</title>
    <path
      d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"
    />
  </svg>
);

interface FooterLink {
  label: string;
  href: string;
  isExternal?: boolean;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

const footerSections: FooterSection[] = [
  {
    title: "Digital",
    links: [
      { label: "Overview", href: "/digital" },
      { label: "Web Development", href: "/digital/services/web-dev" },
      { label: "Graphic Design", href: "/digital/services/graphic-design" },
      { label: "Video Editing", href: "/digital/services/video-editing" },
      { label: "Portfolio", href: "/digital#work" },
    ],
  },
  {
    title: "Productions",
    links: [
      { label: "Overview", href: "/productions" },
      { label: "Photography & Videography", href: "/productions/services/photo-video" },
      { label: "Event Productions", href: "/productions/services/event-productions" },
      { label: "Portfolio", href: "/productions#work" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Cookies", href: "/cookies" },
    ],
  },
];

interface FooterProps {
  arm?: "parent" | "digital" | "productions" | "rental" | "framebooks";
}

export default function Footer({ arm = "parent" }: FooterProps = {}) {
  const [activePopover, setActivePopover] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActivePopover(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isDividedArm = arm === "digital" || arm === "productions";

  // Channel definitions
  const dividedChannels = [
    {
      name: "Instagram",
      Icon: Instagram,
      iconClass: "w-[17px] h-[17px]",
      digitalUrl: "https://instagram.com/frametoque.digital",
      productionsUrl: "https://instagram.com/frametoque.productions",
    },
    {
      name: "Facebook",
      Icon: Facebook,
      iconClass: "w-[17px] h-[17px]",
      digitalUrl: "https://facebook.com/frametoque.digital",
      productionsUrl: "https://facebook.com/frametoque.productions",
    },
    {
      name: "TikTok",
      Icon: TikTok,
      iconClass: "w-[15px] h-[15px]",
      digitalUrl: "https://tiktok.com/@frametoque.digital",
      productionsUrl: "https://tiktok.com/@frametoque.productions",
    },
  ];

  const singleChannels = [
    {
      name: "LinkedIn",
      Icon: Linkedin,
      iconClass: "w-[17px] h-[17px]",
      url: "https://www.linkedin.com/company/frametoque/",
    },
    {
      name: "YouTube",
      Icon: Youtube,
      iconClass: "w-[18px] h-[18px]",
      url: "https://youtube.com/@Frametoque",
    },
    {
      name: "Mail",
      Icon: Mail,
      iconClass: "w-[17px] h-[17px]",
      url: `mailto:${CONTACT.emails.general}`,
    },
  ];

  return (
    <footer className="bg-black backdrop-blur-xl border-t border-white/5 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 relative z-10"
      >
        
        {/* Top Section: Brand Info + Multi-Column Links */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 mb-12 sm:mb-16">
          
          {/* Brand & Address Column */}
          <div className="lg:col-span-4 text-center sm:text-left space-y-4">
            <div className="flex items-center justify-center sm:justify-start">
              <BrandLogo brand="parent" />
            </div>

            <p className="text-gray-400 max-w-sm mx-auto sm:mx-0 text-sm leading-relaxed">
              <Link
                href={CONTACT.address.googleMapsUrl}
                aria-label="Google Maps"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-brand-400 transition inline-block py-1"
              >
                {CONTACT.address.full}
              </Link>
              <br />
              <span className="whitespace-nowrap">
                <a
                  href={CONTACT.phones.primary.tel}
                  aria-label="Telephone"
                  className="hover:text-brand-400 transition inline-block py-1"
                >
                  {CONTACT.phones.primary.display}
                </a>
                <span className="mx-2 text-gray-600">|</span>
                <a
                  href={CONTACT.phones.secondary.tel}
                  aria-label="Telephone"
                  className="hover:text-brand-400 transition inline-block py-1"
                >
                  {CONTACT.phones.secondary.display}
                </a>
              </span>
            </p>

            {/* Tagline */}
            <div className="pt-2">
              <p className="text-gray-400 text-xs">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-400 via-[#3ec3ec] to-brand-400 font-semibold">
                  Your brand deserves better visuals.
                </span>{" "}
                We make brands look serious.
              </p>
            </div>
          </div>

          {/* Nav Links Columns */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
            {footerSections.map((sec) => (
              <div key={sec.title}>
                <h3 className="font-semibold text-white mb-3 text-xs sm:text-sm uppercase tracking-wider text-brand-300">
                  {sec.title}
                </h3>
                <ul className="space-y-2">
                  {sec.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        target={link.isExternal ? "_blank" : undefined}
                        rel={link.isExternal ? "noopener noreferrer" : undefined}
                        className="text-gray-400 hover:text-white transition-colors duration-200 text-xs sm:text-sm block"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
                {sec.title === "Legal" && (
                  <div className="mt-4 pt-3 border-t border-white/10 text-xs">
                    <span className="text-gray-500">Reg No:</span>{" "}
                    <span className="text-gray-400 whitespace-nowrap block sm:inline">
                      {CONTACT.businessRegNo || "PV XXXXXXXX"}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Centered Social Channels Strip */}
        <div ref={containerRef} className="flex justify-center items-center gap-2.5 mb-10 sm:mb-12">
          {/* Divided Channels (Instagram, Facebook, TikTok) */}
          {dividedChannels.map(({ name, Icon, iconClass, digitalUrl, productionsUrl }) => {
            if (isDividedArm) {
              const url = arm === "digital" ? digitalUrl : productionsUrl;
              return (
                <a
                  key={name}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${arm === "digital" ? "Digital" : "Productions"} ${name}`}
                  className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl hover:bg-white/15 hover:border-brand-500/40 transition duration-300 flex items-center justify-center text-gray-300 hover:text-white"
                >
                  <Icon className={iconClass} />
                </a>
              );
            }

            // Parent Collective: Show popover to choose between Digital & Productions
            const isOpen = activePopover === name;
            return (
              <div key={name} className="relative group/social">
                <button
                  type="button"
                  onClick={() => setActivePopover(isOpen ? null : name)}
                  aria-label={`${name} channels`}
                  className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl hover:bg-white/15 hover:border-brand-500/40 transition duration-300 flex items-center justify-center text-gray-300 hover:text-white cursor-pointer"
                >
                  <Icon className={iconClass} />
                </button>

                {/* Popover on hover/click */}
                <div
                  className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 p-1.5 rounded-xl bg-black/95 border border-white/15 shadow-2xl backdrop-blur-md whitespace-nowrap text-xs transition-all duration-200 ${
                    isOpen
                      ? "opacity-100 pointer-events-auto scale-100"
                      : "opacity-0 pointer-events-none scale-95 group-hover/social:opacity-100 group-hover/social:pointer-events-auto group-hover/social:scale-100"
                  }`}
                >
                  <a
                    href={productionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-brand-500 hover:text-white text-gray-300 transition-colors font-medium"
                  >
                    Productions
                  </a>
                  <span className="text-gray-600">|</span>
                  <a
                    href={digitalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-brand-500 hover:text-white text-gray-300 transition-colors font-medium"
                  >
                    Digital
                  </a>
                </div>
              </div>
            );
          })}

          {/* Single Platforms (LinkedIn, YouTube, Mail) */}
          {singleChannels.map(({ name, Icon, iconClass, url }) => (
            <a
              key={name}
              href={url}
              target={url.startsWith("http") ? "_blank" : undefined}
              rel={url.startsWith("http") ? "noopener noreferrer" : undefined}
              aria-label={name}
              className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl hover:bg-white/15 hover:border-brand-500/40 transition duration-300 flex items-center justify-center text-gray-300 hover:text-white"
            >
              <Icon className={iconClass} />
            </a>
          ))}
        </div>

        {/* Bottom Legal & Copyright Bar */}
        <div className="pt-8 border-t border-white/5">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <p className="text-gray-500 text-xs sm:text-sm">
              © {new Date().getFullYear()} Frametoque Digital Productions. All rights reserved.
            </p>
            <div className="flex items-center space-x-6 text-xs sm:text-sm">
              <Link
                href="/privacy"
                className="text-gray-400 hover:text-white transition-colors duration-200"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-gray-400 hover:text-white transition-colors duration-200"
              >
                Terms & Conditions
              </Link>
              <Link
                href="/cookies"
                className="text-gray-400 hover:text-white transition-colors duration-200"
              >
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>

      </motion.div>
    </footer>
  );
}
