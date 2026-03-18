import Link from "next/link";
import { Laptop, PenTool, Video, Camera, Film, Megaphone } from "lucide-react";

const features = [
  {
    title: "Web Development",
    description:
      "Your website is more than pages, it’s how people feel about your brand. We create spaces that inspire trust and leave a lasting impression.",
    icon: Laptop,
    imagePosition: "left",
    link: "/services#web",
  },
  {
    title: "Graphic Design",
    description:
      "Design isn’t just visuals, it’s memory you leave behind. Every piece we craft tells your story and makes your brand unforgettable.",
    icon: PenTool,
    imagePosition: "left",
    link: "/services#graphic",

  },
  {
    title: "Video Editing",
    description:
      "Stories don’t just play, they connect deeply. We turn ideas into videos that spark emotion and stay in people’s minds forever.",
    icon: Film,
    imagePosition: "left",
    link: "/services#video",

  },
  {
    title: "Photography",
    description:
      "A photo isn’t just a moment, it’s a feeling. We capture the essence of your brand in images that resonate and leave a lasting impression.",
    icon: Camera,
    imagePosition: "left",
    link: "/services#photo",

  },

  {
    title: "Videography",
    description:
      "Videos aren’t just watched, they’re experienced. We create cinematic stories that captivate your audience and make your brand unforgettable.",
    icon: Video,
    imagePosition: "left",
    link: "/services#photo",

  },

  {
    title: "Digital Marketing",
    description:
      "Marketing isn’t just promotion, it’s connection. We craft strategies that resonate with your audience and make your brand unforgettable.",
    icon: Megaphone,
    imagePosition: "left",
    link: "/services#photo",

  },
];

export default function Features() {
  return (
    <section id="features" className="py-16 sm:py-20 px-6 sm:px-10 lg:px-16 relative">

      {/* Pulse */}
      <div className="absolute top-20 left-4 sm:left-10 w-48 sm:w-72 h-48 sm:h-72 bg-brand-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-4 sm:right-10 w-64 sm:w-96 h-64 sm:h-96 bg-[#3B82F6]-500/10 rounded-full blur-3xl animate-pulse delay-1000" />

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
        </div>

        <div className="grid gap-4 sm:gap-4 lg:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, key) => {
            const Icon = feature.icon;

            return (
              <div
                key={key}
                className="group relative bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 transition-all duration-300 hover:border-brand-600/50 hover:-translate-y-2 hover:shadow-xl hover:shadow-brand-600/10"
              >
                {/* Icon */}
                <div className="mb-6 flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-500/20 to-purple-500/20 rounded-xl blur-xl opacity-70 group-hover:opacity-100 transition duration-500" />
                    <div className="relative bg-gray-800/70 border border-gray-700 rounded-xl p-6">
                      <Icon className="w-12 h-12 text-brand-400" />
                    </div>
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-2xl font-bold text-white mb-4 text-center">
                  {feature.title}
                </h3>

                <p className="text-gray-300 text-base leading-relaxed mb-6 text-center">
                  {feature.description}
                </p>

                {/* Button */}
                {feature.link && (
                  <div className="flex justify-center">
                    <Link
                      href={feature.link}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-500 to-brand-600 text-white font-semibold rounded-lg hover:from-brand-600 hover:to-brand-700 transition-all duration-300 hover:shadow-lg hover:shadow-brand-600/20"
                    >
                      <span>View Packages</span>
                      <svg
                        className="w-4 h-4"
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
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
