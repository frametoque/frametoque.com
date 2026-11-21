import Link from "next/link";
import { Laptop, PenTool, Video, Camera, Film, Megaphone } from "lucide-react";

const features = [
  {
    title: "Web Development",
    description:
      "We create spaces that inspire trust and leave a lasting impression.",
    icon: Laptop,
    imagePosition: "left",
    link: "/services/web-dev",
  },
  {
    title: "Graphic Design",
    description:
      "Every piece we craft tells your story and makes your brand unforgettable.",
    icon: PenTool,
    imagePosition: "left",
    link: "/services/graphic-design",

  },
  {
    title: "Video Editing",
    description:
      "We turn ideas into videos that spark emotion and stay in people’s minds forever.",
    icon: Film,
    imagePosition: "left",
    link: "/services/video-editing",

  },
  {
    title: "Photography",
    description:
      "We capture the essence of your brand in images that resonate and leave a lasting impression.",
    icon: Camera,
    imagePosition: "left",
    link: "/services/photo-video",

  },

  {
    title: "Videography",
    description:
      "We create cinematic stories that captivate your audience and make your brand unforgettable.",
    icon: Video,
    imagePosition: "left",
    link: "/services/photo-video",

  },

  {
    title: "Digital Marketing",
    description:
      "We craft strategies that resonate with your audience and make your brand unforgettable.",
    icon: Megaphone,
    imagePosition: "left",
    link: "/services",

  },
];

export default function Features() {
  return (
    <section id="features" className="py-16 sm:py-20 px-6 sm:px-10 lg:px-16 relative bg-[#111111]">

      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12 sm:mb-16 lg:mb-20">
          <h2 className="text-5xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6">
            <span className="bg-gradient-to-b from-white to-gray-300 bg-clip-text text-transparent">
              What We&nbsp;
            </span>
            <span className="bg-gradient-to-b from-brand-400 to-brand-400 bg-clip-text text-transparent">
              Do
            </span>
          </h2>
          <p className="text-gray-400 text-base sm:text-lg max-w-3xl mx-auto leading-relaxed">
            A comprehensive suite of digital services crafted to elevate your brand and tell your story.
          </p>
        </div>

        <div className="grid gap-4 sm:gap-6 lg:gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, key) => {
            const Icon = feature.icon;

            return (
              <div
                key={key}
                className="group relative flex flex-col justify-start overflow-hidden rounded-2xl bg-[#0a0a0a] bg-opacity-80 backdrop-blur-md border border-white/5 p-8 transition-all duration-500 hover:-translate-y-1 hover:border-white/10"
              >
                {/* Top part / Icon */}
                <div className="mb-6 flex items-center justify-between">
                  <Icon className="h-10 w-10 text-brand-500 border-none transition-colors duration-500 group-hover:text-brand-400" />
                  
                  <div className="opacity-0 -translate-x-4 transition-all duration-500 group-hover:translate-x-0 group-hover:opacity-100">
                    <svg
                      className="w-6 h-6 text-brand-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </div>
                </div>

                {/* Content */}
                <div>
                  <h3 className="mb-3 text-xl font-bold tracking-tight text-white/90 transition-colors group-hover:text-white">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-400 transition-colors group-hover:text-gray-300">
                    {feature.description}
                  </p>
                </div>

                {/* Link over whole card */}
                {feature.link && (
                  <Link href={feature.link} className="absolute inset-0 z-10 block">
                    <span className="sr-only">View {feature.title} details</span>
                  </Link>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
