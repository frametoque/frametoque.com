"use client";

import { Film, Palette, Music, Video, ArrowRight, Sparkles } from "lucide-react";

const tools = [
  { icon: Film,    name: "Video Analyzer",      desc: "AI cinematography feedback on your footage" },
  { icon: Palette, name: "Color Grader",         desc: "LUT generation from reference stills" },
  { icon: Music,   name: "Audio Sync",           desc: "Beat-matched auto cut detection" },
  { icon: Video,   name: "Script to Shot List",  desc: "Scene breakdown from your script" },
];

export default function StudioPromo() {
  return (
    <section className="py-16 bg-gray-900 text-white overflow-hidden relative">

      {/* Subtle radial glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 50% at 50% 100%, rgba(59,130,246,0.08) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-6">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-blue-400 text-xs font-medium tracking-widest uppercase">
              Free AI Tools
            </span>
          </div>

          <h2 className="text-4xl sm:text-5xl font-bold leading-tight mb-4">
            <span className="bg-gradient-to-b from-blue-400 to-blue-500 bg-clip-text text-transparent">
              Supercharge&nbsp;
            </span>
            <span className="bg-gradient-to-b from-white to-gray-300 bg-clip-text text-transparent">
              Your Content
            </span>
          </h2>

          <p className="text-gray-400 max-w-xl mx-auto text-base">
            FrameToque Studio is our free suite of AI tools built for
            filmmakers and content creators who take their craft seriously.
          </p>
        </div>

        {/* Tool cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {tools.map((tool, idx) => (
            <div
              key={idx}
              className="group bg-white/5 backdrop-blur-md border border-white/8 rounded-xl p-5 hover:bg-blue-500/10 hover:border-blue-500/25 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors duration-300">
                <tool.icon className="w-5 h-5 text-blue-400" strokeWidth={1.5} />
              </div>
              <p className="text-white font-semibold text-sm mb-1">{tool.name}</p>
              <p className="text-gray-400 text-xs leading-relaxed">{tool.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex justify-center">
          <a
            href="https://studio.frametoque.online"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-semibold text-sm px-7 py-3.5 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5"
          >
            Explore FrameToque Studio
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
          </a>
        </div>

      </div>
    </section>
  );
}