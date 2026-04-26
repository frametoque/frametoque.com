"use client";
import { Linkedin, Facebook, Github, Mail, Instagram, Youtube, Music2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface TeamMemberCardProps {
  image?: string;
  name: string;
  role: string;
  expertise: string;
  social: Record<string, string>;
  accentColor?: "brand-400" | "brand-500" | "none";
}
const protectImage = (e) => e.preventDefault();
const TeamMemberCard = ({ image, name, role, expertise, social, accentColor = "brand-500" }: TeamMemberCardProps) => {
  const accentClasses = {
    "brand-400": "bg-brand-400",
    "brand-500": "bg-brand-500",
    none: "bg-gray-700",
  };

  return (
    <div className="bg-[#0a0a0a] rounded-xl overflow-hidden border border-white/5 transition-all duration-300 group hover:-translate-y-2 flex flex-col h-full justify-center">
      <div className="relative">
        <div className="relative aspect-[4/5] overflow-hidden">
          {image ? (
            <Image
              src={image}
              alt={name}
              width={400}
              height={500}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              onContextMenu={protectImage}
              onDragStart={protectImage}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
              <span className="text-4xl font-bold text-gray-700">
                {name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
          )}
          <span className="absolute top-3 left-3 bg-black/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded border border-white/10 uppercase tracking-tighter">
            {role}
          </span>
        </div>
      </div>
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="text-lg font-bold text-white mb-1 group-hover:text-brand-400 transition-colors tracking-tight">{name}</h3>
        <p className="text-gray-400 text-xs mb-4 line-clamp-2 italic h-8">"{expertise}"</p>
        
        <div className="mt-auto flex flex-wrap gap-2">
            {social?.linkedin && (
                <Link
                href={social.linkedin}
                target="_blank"
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand-500 hover:text-white transition-all"
                aria-label={`${name} on LinkedIn`}
                >
                <Linkedin size={14} />
                </Link>
            )}
            {social?.facebook && (
                <Link
                href={social.facebook}
                target="_blank"
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand-500 hover:text-white transition-all"
                aria-label={`${name} on Facebook`}
                >
                <Facebook size={14} />
                </Link>
            )}
            {social?.instagram && (
                <Link
                href={social.instagram}
                target="_blank"
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand-500 hover:text-white transition-all"
                aria-label={`${name} on Instagram`}
                >
                <Instagram size={14} />
                </Link>
            )}
             {social?.github && (
                <Link
                href={social.github}
                target="_blank"
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand-500 hover:text-white transition-all"
                aria-label={`${name} on GitHub`}
                >
                <Github size={14} />
                </Link>
            )}
            {social?.tiktok && (
                <Link
                href={social.tiktok}
                target="_blank"
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand-500 hover:text-white transition-all"
                aria-label={`${name} on TikTok`}
                >
                <Music2 size={14} />
                </Link>
            )}
            {social?.email && (
                <Link
                href={`mailto:${social.email}`}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand-500 hover:text-white transition-all"
                aria-label={`Email ${name}`}
                >
                <Mail size={14} />
                </Link>
            )}
        </div>
      </div>
    </div>
  );
};

export default TeamMemberCard;
