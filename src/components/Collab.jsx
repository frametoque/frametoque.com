"use client";

import { Handshake, ArrowRight, Percent, Calendar } from 'lucide-react';
import Link from "next/link";

export default function CollabCompact() {
  return (
    <div className="bg-slate-950 py-2 px-6 relative max-w-7xl mx-auto">
      <div className="max-w-4xl mx-auto px-6">
        <div className="bg-gradient-to-br from-slate-950/50 to-slate-800/50 border border-slate-700/50 rounded-2xl p-8 shadow-xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                <Handshake className="h-7 w-7 text-white" />
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  <span className="bg-gradient-to-r from-blue-400 to-blue-400 bg-clip-text text-transparent">
                    Collaborate With Us
                  </span>
                </h3>
                <p className="text-gray-400 mb-4 max-w-md">
                  Have an event? Get special discounts and premium service when you partner with us for your next occasion.
                </p>
                
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center text-sm">
                    <Percent className="h-4 w-4 text-blue-400 mr-1" />
                    <span className="text-gray-300">Special Rates</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Calendar className="h-4 w-4 text-blue-400 mr-1" />
                    <span className="text-gray-300">Flexible Dates</span>
                  </div>
                </div>
              </div>
            </div>
            
            <Link 
              href="/contact" 
              className="group inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 shadow-lg hover:shadow-xl whitespace-nowrap"
            >
              Discuss Your Event
              <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}