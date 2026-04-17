"use client";
import { Facebook, Instagram, Linkedin, Mail, Music2, CheckCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface FounderSpotlightProps {
  name: string;
  role: string;
  expertise: string;
  image: string;
  social: {
    linkedin?: string;
    instagram?: string;
    tiktok?: string;
    facebook?: string;
    email?: string;
  };
}
const protectImage = (e) => e.preventDefault();

const FounderSpotlight = ({ name, role, expertise, image, social }: FounderSpotlightProps) => {
  return (
    <div className="grid md:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-20 items-center">
      {/* Left: Image */}
      <div className="relative group max-w-md mx-auto md:mx-0">
        <div className="relative overflow-hidden rounded-2xl aspect-square sm:aspect-[4/5]">
           <Image
            src={image}
            alt={name}
            width={640}
            height={720}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onContextMenu={protectImage}
            onDragStart={protectImage}
          />
        </div>
        <span className="absolute top-4 left-5 bg-black/80 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded border border-white/10 uppercase tracking-wider">
          {role}
        </span>
      </div>

      {/* Right: Info */}
      <div className="space-y-6">
        <div>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">{name}</h2>
          <p className="text-gray-400 text-base leading-relaxed mt-4 italic">
            "{expertise}"
          </p>
          <p className="text-gray-400 text-sm leading-relaxed mt-4">
            Leading the vision at Frametoque, ensuring every project tells a compelling story through high-quality cinematography and precise editing.
          </p>
        </div>

        <div className="flex gap-3">
          {social.linkedin && (
            <Link
              href={social.linkedin}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-brand-500 transition-all"
            >
              <Linkedin size={18} />
            </Link>
          )}
          {social.instagram && (
            <Link
               href={social.instagram}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-brand-500 transition-all"
            >
              <Instagram size={18} />
            </Link>
          )}
          {social.tiktok && (
             <Link
               href={social.tiktok}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-brand-500 transition-all"
            >
              <Music2 size={18} />
            </Link>
          )}
          {social.email && (
             <Link
               href={`mailto:${social.email}`}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-brand-500 transition-all"
            >
              <Mail size={18} />
            </Link>
          )}
        </div>

        <div className="border-t border-white/10 pt-6">
          <h3 className="text-xl font-semibold text-white mb-4">Core Strengths</h3>
          <p className="text-gray-400 text-sm leading-relaxed mb-4">
            Combining technical mastery with creative intuition to deliver impactful results.
          </p>
          <ul className="space-y-3">
            {[
              "Cinematic storytelling with professional-grade equipment",
              "Advanced post-production and color grading workflows",
              "Creative direction for brand identity through video",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-gray-400">
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FounderSpotlight;
