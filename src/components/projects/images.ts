//graphics
export const graphicImages = [
    "/projects/graphic/ncss.png",
    "/projects/graphic/class.png",
    "/projects/graphic/energycup.png",
    "/projects/graphic/photography-services.png",
    "/projects/graphic/smurfs.png",
    "/projects/graphic/wedding.png",
    "/projects/graphic/soyuru-sathkara.png",
];

//video
export interface VideoProject {
    url: string;
}

export const videographyURLs: VideoProject[] = [
    { url: "https://youtu.be/hMGyOVpEZKA", },
    { url: "https://youtu.be/K9PrM7nfYwY", },
    { url: "https://youtu.be/oUmqy1tqxtU", },
    { url: "https://youtu.be/f7g4kJxrG6s", },
    { url: "https://youtu.be/gPCQG8rN-Pg", },
    { url: "https://youtu.be/Jf__954Bm3M", },
];
 
export const videoEditingURLs: VideoProject[] = [
    { url: "https://youtube.com/shorts/0Rvp6OTZl1w?feature=share" },
    { url: "https://youtube.com/shorts/fcm_iurb5dE?feature=share"  },
    { url: "https://youtu.be/X75cDve1Fc8"},
    { url: "https://youtu.be/OIgAfIsFJ_I" },

    { url: "https://www.youtube.com/shorts/J6ASPaVTBvk"  },
    { url: "https://youtube.com/shorts/bhcXWM37P-8?feature=share" },


    { url: "https://youtube.com/shorts/ioEszNrM49o?feature=share" },
    { url: "https://youtube.com/shorts/DSjDmrtzAFE?feature=share" },

    { url: "https://youtu.be/forNDSKndBo" },
    
    { url: "https://youtube.com/shorts/ztSOTGvMqXM?feature=share" },
    { url: "https://youtube.com/shorts/PcI46u91p30?feature=share" }
];
 
// ─── Web Dev 
export interface SiteDetails {
  domain: string;
  title: string;
  description: string;
  techs: string[];
  url: string;
}

export interface WebDevImage {
  image: string;
  domain: string;
}

export const siteDetailsMap: Record<string, SiteDetails> = {
  "mathswithjanidu.lk": {
    domain: "mathswithjanidu.lk",
    title: "Maths with Janidu | Class Landing Page",
    description:
      "Professional landing page for a mathematics tuition class featuring class schedules, student testimonials, course details, and an inquiry form.",
    techs: ["Next.js", "Tailwind CSS"],
    url: "https://mathswithjanidu.lk",
  },
  "itechlk.store": {
    domain: "itechlk.store",
    title: "iTech LK | SaaS Subscription Marketplace",
    description:
      "E-commerce marketplace for SaaS subscriptions with multi-vendor support, subscription management, payment integration, and a modern storefront.",
    techs: ["Next.js", "Tailwind CSS", "PostgreSQL"],
    url: "https://www.itechlk.store",
  },
  "itsnelitha.vercel.app": {
    domain: "itsnelitha.vercel.app",
    title: "Personal Portfolio",
    description:
      "Creative developer portfolio showcasing projects, skills, and experience with smooth animations and a dark-themed aesthetic.",
    techs: ["Next.js", "Tailwind CSS", "Vercel"],
    url: "https://itsnelitha.vercel.app",
  },
  "princeofwales.edu.lk": {
    domain: "princeofwales.edu.lk",
    title: "Prince of Wales' College | School Website",
    description:
      "Official school website with news, events, academic information, gallery, and administrative resources for students and parents.",
    techs: ["PHP", "MySQL", "Bootstrap"],
    url: "https://princeofwales.edu.lk",
  },
    "techrolk.com": {
    domain: "techrolk.com",
    title: "TechRolk | Company Landing Page",
    description:
      "Modern company landing page for TechRolk featuring product showcases, team section, testimonials, and a fully responsive layout optimized for conversions.",
    techs: ["Laravel", "MySQL", "Bootstrap"],
    url: "https://techrolk.com",
  },
  "techrolk.com/shop": {
    domain: "techrolk.com/shop",
    title: "TechRolk Store | E-Commerce Website",
    description:
      "Full-featured e-commerce store with product catalog, cart system, checkout flow, order tracking, and admin inventory management.",
    techs: ["Wordpress", "PHP", "MySQL", "WooCommerce", "Elementor", "PayHere"],
    url: "https://techrolk.com/shop",
  },
    "eventpulse.duckdns.org": {
    domain: "eventpulse.duckdns.org",
    title: "EventPulse | Booking Platform",
    description:
      "Full-stack event booking platform with real-time availability, ticket management, QR-based check-in, and an admin dashboard for organizers.",
    techs: ["React", "Tailwind CSS", "PostgreSQL"],
    url: "https://eventpulse.duckdns.org",
  },
};

export const webDevProjects: WebDevImage[] = [
  { image: "/projects/web/itech.png", domain: "itechlk.store" },
  { image: "/projects/web/cmjr.png", domain: "mathswithjanidu.lk" },
  { image: "/projects/web/itsnelitha.png", domain: "itsnelitha.vercel.app" },
  { image: "/projects/web/pwc.png", domain: "princeofwales.edu.lk" },
  { image: "/projects/web/techrolk.png", domain: "techrolk.com" },
  { image: "/projects/web/techrolk-store.png", domain: "techrolk.com/shop" },
  { image: "/projects/web/eventpulse.png", domain: "eventpulse.duckdns.org" },

];