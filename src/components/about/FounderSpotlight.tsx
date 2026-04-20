"use client";

import { Facebook, Instagram, Linkedin, Mail, Music2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface Founder {
  name: string;
  role: string;
  expertise: string;
  description: string;
  social: {
    linkedin?: string;
    instagram?: string;
    tiktok?: string;
    facebook?: string;
    email?: string;
  };
}

const founders: Founder[] = [
  {
    name: "Kavinu Pasandul",
    role: "Founder & Owner",
    expertise: "Founder & Owner",
    description: "Leading the vision at Frametoque, ensuring every project tells a compelling story through high-quality cinematography.",
    social: {
      linkedin: "#",
      instagram: "#",
      email: "kavinu@frametoque.online",
    },
  },
  {
    name: "Tharul Bandara",
    role: "Founder & Owner",
    expertise: "Founder & Owner",
    description: "Focusing on brand identity and UI/UX design, ensures that Frametoque's visual storytelling is both impactful and memorable.",
    social: {
      linkedin: "#",
      instagram: "#",
      email: "tharul@frametoque.online",
    },
  },
];

const protectImage = (e: React.SyntheticEvent) => e.preventDefault();

const FounderSpotlight = () => {
  // Shared Image for both founders
  const sharedImage = "/images/team/founders.jpg"; 

  const renderSocials = (social: Founder["social"]) => (
    <div className="flex gap-3">
      {social.linkedin && (
        <Link href={social.linkedin} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-brand-500 transition-all">
          <Linkedin size={18} />
        </Link>
      )}
      {social.instagram && (
        <Link href={social.instagram} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-brand-500 transition-all">
          <Instagram size={18} />
        </Link>
      )}
      {social.tiktok && (
        <Link href={social.tiktok} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-brand-500 transition-all">
          <Music2 size={18} />
        </Link>
      )}
      {social.facebook && (
        <Link href={social.facebook} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-brand-500 transition-all">
          <Facebook size={18} />
        </Link>
      )}
      {social.email && (
        <Link href={`mailto:${social.email}`} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-brand-500 transition-all">
          <Mail size={18} />
        </Link>
      )}
    </div>
  );

  return (
    <div className="grid md:grid-cols-3 gap-8 lg:gap-12 items-center">
     <div className="space-y-6 text-right">
  <div>
    <h2 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
      {founders[0].name}
    </h2>
    <p className="text-gray-400 text-base leading-relaxed mt-4 italic">
      {founders[0].expertise}
    </p>
    <p className="text-gray-400 text-sm leading-relaxed mt-4">
      {founders[0].description}
    </p>
  </div>
  <div className="flex justify-end">
    {renderSocials(founders[0].social)}
  </div>
</div>

      <div className="relative group max-w-md mx-auto md:mx-0">
        <div className="relative overflow-hidden rounded-2xl aspect-square sm:aspect-[4/5]">
           <Image
            src={sharedImage}
            alt="'Founders Spotlight'"
            width={640}
            height={720}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onContextMenu={protectImage}
            onDragStart={protectImage}
          />
        </div>
 
      </div>
      {/* Right Side: Founder 2 */}
      <div className="space-y-6">
        <div>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            {founders[1].name}
          </h2>
          <p className="text-gray-400 text-base leading-relaxed mt-4 italic">
            {founders[1].expertise}
          </p>
          <p className="text-gray-400 text-sm leading-relaxed mt-4">
            {founders[1].description}
          </p>
        </div>
        {renderSocials(founders[1].social)}
      </div>
    </div>
  );
};

export default FounderSpotlight;