import { Handshake, ArrowRight, Percent, Calendar } from 'lucide-react';
import Link from "next/link";
import Image from "next/image";

export default function CollabCompact() {
  return (
    <div className="bg-[#111111] w-full py-16">
      <div className="max-w-6xl mx-auto px-6">
        {/* Banner */}
            <div className="relative mt-6 rounded-2xl overflow-hidden">
              <Link href="/contact" >
                  <Image
                    src="/collab-banner.png"
                    alt="FrameToque Digital Media"
                    width={1920}
                    height={480}
                    quality={100}
                    className="w-full h-auto block"
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                  />
        
                  <div
                    className="absolute inset-0 pointer-events-none overflow-hidden"
                    style={{ borderRadius: "inherit" }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background:
                          "linear-gradient(115deg, transparent 45%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.06) 53%, transparent 58%)",
                        transform: "translateX(-100%)",
                        animation: "shineSweep 4s ease-in-out infinite",
                      }}
                    />
                  </div>
                  </Link>
              </div>

                <style>
                    {`
                    @keyframes shineSweep {
                      0%   { transform: translateX(-100%); }
                      100% { transform: translateX(100%); }
                    }
                  `}
                </style>
        {/* <div className="bg-gradient-to-br from-black/80 to-slate-900/50 border border-slate-700/50 rounded-2xl p-8 shadow-xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-500 to-brand-500 flex items-center justify-center flex-shrink-0">
                <Handshake className="h-7 w-7 text-white" />
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  <span className="bg-gradient-to-r from-brand-400 to-brand-400 bg-clip-text text-transparent">
                    Collaborate With Us
                  </span>
                </h3>
                <p className="text-gray-400 mb-4 max-w-md">
                  Have an event? Get special discounts and premium service when you partner with us for your next occasion.
                </p>
                
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center text-sm">
                    <Percent className="h-4 w-4 text-brand-400 mr-1" />
                    <span className="text-gray-300">Special Rates</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Calendar className="h-4 w-4 text-brand-400 mr-1" />
                    <span className="text-gray-300">Flexible Dates</span>
                  </div>
                </div>
              </div>
            </div>
            
            <Link 
              href="/contact" 
              className="group inline-flex items-center px-6 py-3 bg-gradient-to-r from-brand-600 to-brand-600 text-white font-semibold rounded-lg hover:from-brand-700 hover:to-brand-700 transition-all duration-300 shadow-lg hover:shadow-xl whitespace-nowrap"
            >
              Discuss Your Event
              <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div> */}
      </div>
    </div>
  );
}