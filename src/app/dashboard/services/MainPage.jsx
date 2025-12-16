"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Star } from "lucide-react";

import WebSub from "@/components/services/WebSub.jsx";

const pricingCategories = [
  {
    category: "Graphics Designing",
    plans: [
      {
        name: "Basic",
        price: "10",
        description: "Perfect for simple visuals",
        features: [
          "Simple caption style",
          "Correct alignment",
          "Background music",
          "Basic color correction",
          "2 revisions (extra: $0.65)",
        ],
        mostPopular: false,
      },
      {
        name: "Standard",
        price: "15",
        description: "Best for creators",
        features: [
          "Advanced animations",
          "Trendy caption style",
          "Sound effects",
          "Background music",
          "Cinematic color grading",
          "3 revisions (extra: $0.65)",
        ],
        mostPopular: true,
      },
      {
        name: "Premium",
        price: "25",
        description: "Studio-level quality",
        features: [
          "Advanced VFX animations",
          "Masking & animated B-roll",
          "Cinematic color grading",
          "Premium caption animations",
          "5 revisions (extra: $0.65)",
        ],
        mostPopular: false,
      },
    ],
  },
  {
    category: "Video Editing",
    plans: [
      {
        name: "Basic",
        price: "10",
        description: "Personal projects",
        features: [
          "Clean cuts",
          "Background music",
          "Basic color correction",
          "Simple captions",
          "2 revisions",
        ],
        mostPopular: false,
      },
      {
        name: "Standard",
        price: "15",
        description: "Content creators",
        features: [
          "Advanced animations",
          "Sound effects",
          "Cinematic grading",
          "Trendy captions",
          "3 revisions",
        ],
        mostPopular: true,
      },
      {
        name: "Premium",
        price: "25",
        description: "Professional production",
        features: [
          "Advanced VFX",
          "Animated B-roll",
          "High-end grading",
          "Premium captions",
          "5 revisions",
        ],
        mostPopular: false,
      },
    ],
  },
];

export default function ServicesMain() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section>
      <WebSub />

      <div className="max-w-7xl mx-auto space-y-20 mt-16">
        {pricingCategories.map((category) => (
          <div key={category.category}>
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-10">
              {category.category}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {category.plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative bg-slate-900/60 backdrop-blur border rounded-2xl p-8 flex flex-col transition-all ${
                    plan.mostPopular
                      ? "border-green-500 shadow-xl shadow-green-500/20 scale-[1.03]"
                      : "border-slate-800 hover:border-slate-700"
                  }`}
                >
                  {plan.mostPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="flex items-center gap-1 bg-green-500 text-black text-xs font-semibold px-4 py-1 rounded-full">
                        <Star className="w-3 h-3 fill-black" />
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold">{plan.name}</h3>
                    <p className="text-gray-400 mt-2">{plan.description}</p>
                    <p className="text-4xl font-bold text-green-400 mt-4">
                      ${plan.price}
                    </p>
                  </div>

                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-3">
                        <span className="w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-green-400" />
                        </span>
                        <span className="text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/dashboard"
                    className={`mt-auto text-center py-3 rounded-lg font-semibold transition ${
                      plan.mostPopular
                        ? "bg-green-500 text-black hover:bg-green-400"
                        : "border border-white/10 hover:bg-white/10"
                    }`}
                  >
                    Get Started
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ))}

        <p className="text-center text-gray-400 text-lg">
          Need something custom?{" "}
          <Link
            href="/contact"
            className="text-green-500 font-semibold hover:text-green-400"
          >
            Contact us
          </Link>
        </p>
      </div>
    </section>
  );
}
