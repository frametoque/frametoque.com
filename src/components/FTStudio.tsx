import { Sparkles, ArrowRight, Brain } from "lucide-react";
import Link from "next/link";

export default function CollabCompact() {
  return (
    <div className="bg-slate-950 py-2 px-6 relative max-w-7xl mx-auto">
      <div className="max-w-4xl mx-auto px-6">
        <div className="bg-gradient-to-br from-slate-950/50 to-slate-800/50 border border-slate-700/50 rounded-2xl p-8 shadow-xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-500 to-brand-500 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-7 w-7 text-white" />
              </div>

              <div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  <span className="bg-gradient-to-r from-brand-400 to-brand-400 bg-clip-text text-transparent">
                    Supercharge Your Content
                  </span>
                </h3>
                <p className="text-gray-400 mb-4 max-w-md">
                  Frametoque Studio is our free suite of AI tools built for
                  filmmakers and content creators who take their craft
                  seriously.
                </p>

                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center text-sm">
                    <Brain className="h-4 w-4 text-brand-400 mr-1" />
                    <span className="text-gray-300">AI-Powered</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Sparkles className="h-4 w-4 text-brand-400 mr-1" />
                    <span className="text-gray-300">Seamless Integration</span>
                  </div>
                </div>
              </div>
            </div>

            <Link
              href="https://aistudio.frametoque.online"
              target="_blank"
              className="group inline-flex items-center px-6 py-3 bg-gradient-to-r from-brand-600 to-brand-600 text-white font-semibold rounded-lg hover:from-brand-700 hover:to-brand-700 transition-all duration-300 shadow-lg hover:shadow-xl whitespace-nowrap"
            >
              Visit FT Studio
              <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
