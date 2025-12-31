"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Star } from "lucide-react";
import Link from "next/link";

const vidcatprices = [
  {
    key: "short-form",
    title: "Short-Form Video Editing",
    desc: "High-impact vertical videos made to grab attention on Reels, Shorts, and TikTok.",
    price: "2,500",
    plans: [
      {
        name: "Single Short Video",
        description: "Best for quick social posts and one-off content.",
        price: "2,500",
        mostPopular: false,
        features: [
          "Clean cuts & smooth pacing",
          "Text & basic captions",
          "Music sync",
          "Color correction",
          "Platform-ready export",
        ],
      },
      {
        name: "5-Video Pack",
        description: "Ideal for consistent posting and content batches.",
        price: "11,500",
        mostPopular: true,
        features: [
          "5 short-form videos",
          "Consistent editing style",
          "Caption & text overlays",
          "Optimized aspect ratios",
          "Revision support",
        ],
      },
      {
        name: "10-Video Pack",
        description: "Perfect for creators building serious momentum.",
        price: "22,000",
        mostPopular: false,
        features: [
          "10 engaging short videos",
          "Strong hooks & pacing",
          "Brand-aligned editing style",
          "Social-ready exports",
          "Priority revisions",
        ],
      },
    ],
  },

  {
    key: "long-form",
    title: "Long-Form Video Editing",
    desc: "Clean and professional edits for YouTube videos, podcasts, and long content.",
    price: "4,500",
    plans: [
      {
        name: "Basic Edit",
        description: "Simple and clean edits for videos up to 10 minutes.",
        price: "4,500",
        mostPopular: false,
        features: [
          "Clean cuts",
          "Audio balancing",
          "Color correction",
          "Intro & outro placement",
          "HD export",
        ],
      },
      {
        name: "Standard Edit",
        description: "Structured edits with smooth flow for mid-length videos.",
        price: "7,500",
        mostPopular: true,
        features: [
          "Structured timeline",
          "Smooth transitions",
          "Audio cleanup",
          "Basic graphics & text",
          "Full-HD export",
        ],
      },
      {
        name: "Premium Edit",
        description: "Advanced editing for high-quality long-form content.",
        price: "15,000",
        mostPopular: false,
        features: [
          "Advanced pacing",
          "Effects & transitions",
          "Branded graphics",
          "Sound design",
          "Priority revisions",
        ],
      },
    ],
  },

  {
    key: "social-media",
    title: "Social Media Video Editing",
    desc: "Scroll-stopping promo and ad videos optimized for every platform.",
    price: "3,500",
    plans: [
      {
        name: "Single Promo Video",
        description: "Perfect for ads, announcements, and promotions.",
        price: "3,500",
        mostPopular: false,
        features: [
          "High-impact editing",
          "Text & CTA overlays",
          "Music & sound effects",
          "Platform-specific sizing",
          "Optimized export",
        ],
      },
      {
        name: "5-Video Promo Pack",
        description: "Best for campaigns and consistent promotions.",
        price: "16,000",
        mostPopular: true,
        features: [
          "5 campaign-style videos",
          "Consistent visual style",
          "Multi-platform formats",
          "High-quality output",
          "Revision support",
        ],
      },
    ],
  },

  {
    key: "motion-graphics",
    title: "Motion Graphics (Basic)",
    desc: "Simple yet powerful motion graphics to boost brand presence.",
    price: "6,500",
    plans: [
      {
        name: "Basic Motion Video",
        description: "Short motion graphics for logos, text, or intros.",
        price: "6,500",
        mostPopular: false,
        features: [
          "Text or logo animation",
          "Smooth transitions",
          "Brand-aligned motion",
          "Full-HD export",
          "2 revisions",
        ],
      },
      {
        name: "Motion Pack (3 Videos)",
        description: "Consistent motion graphics for brand use.",
        price: "17,500",
        mostPopular: true,
        features: [
          "3 motion graphic videos",
          "Consistent animation style",
          "HD delivery",
          "Optimized formats",
          "Revision support",
        ],
      },
    ],
  },

  {
    key: "corporate",
    title: "Corporate & Business Videos",
    desc: "Professional video edits for businesses, brands, and companies.",
    price: "10,000",
    plans: [
      {
        name: "Corporate Edit",
        description: "Clean and professional edits for corporate use.",
        price: "10,000",
        mostPopular: true,
        features: [
          "Professional pacing",
          "Logo & brand elements",
          "Clean transitions",
          "Audio balancing",
          "High-quality export",
        ],
      },
    ],
  },

  {
    key: "creator",
    title: "Content Creator Editing",
    desc: "Energetic edits made for streamers, YouTubers, and online creators.",
    price: "4,500",
    plans: [
      {
        name: "Creator Highlight Video",
        description: "Highlight-style edits that keep viewers hooked.",
        price: "4,500",
        mostPopular: true,
        features: [
          "Engaging cuts & zooms",
          "Sound effects & music",
          "Basic subtitle styling",
          "Platform-ready format",
          "Revision support",
        ],
      },
    ],
  },

  {
    key: "custom",
    title: "Custom Video Editing",
    desc: "Tailored video editing solutions based on your idea and vision.",
    price: "5,000",
    plans: [
      {
        name: "Custom Project",
        description: "Flexible editing built exactly for your needs.",
        price: "5,000",
        mostPopular: false,
        features: [
          "Concept-based editing",
          "Flexible scope",
          "Custom visual style",
          "High-quality output",
          "Custom revisions",
        ],
      },
    ],
  },
];


const parsePrice = (price) => {
  if (typeof price === 'number') return price;
  return Number(String(price).replace(/,/g, ''));
};

const convertPricesToUSD = async (services) => {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/LKR");
    const rateData = await res.json();
    const rate = rateData.rates.USD;

    console.log("Exchange rate used:", rate);

    return services.map((cat) => {
      const catPrice = parsePrice(cat.price);
      const usdCatPrice = catPrice * rate;

      return {
        ...cat,
        price: usdCatPrice.toFixed(2),
        plans: cat.plans.map((plan) => {
          const planPrice = parsePrice(plan.price);
          const usdPlanPrice = planPrice * rate;

          return {
            ...plan,
            price: usdPlanPrice.toFixed(2),
          };
        }),
      };
    });
  } catch (error) {
    console.error("Error converting to USD:", error);
    return services;
  }
};

export default function WebPackages() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const popupRef = useRef(null);

  const [currency, setCurrency] = useState("LKR");
  const [prices, setPrices] = useState(vidcatprices);

 const selectedCategory = prices.find((c) => c.key === activeCategory) || null;

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 50);
    }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleEsc(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  useEffect(() => {
    async function detectCurrency() {
      try {
        const res = await fetch("/api/getCurrency");
        const data = await res.json();

        if (data.showUSD) {
          const converted = await convertPricesToUSD(vidcatprices);
          setPrices(converted);
          setCurrency("USD");
        } else {
          setPrices(vidcatprices);
          setCurrency("LKR");
        }
      } catch (error) {
        console.error("Error detecting currency:", error);
        setPrices(vidcatprices);
        setCurrency("LKR");
      }
    }

    detectCurrency();
  }, []);

  return (
    <>
      <section className="py-2 px-6 relative max-w-7xl mx-auto text-white">
        <h2 className="text-4xl sm:text-4xl font-bold mb-12">Video Editing</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {prices.map((cat, i) => (
            <div
              key={i}
              className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 hover:border-blue-500 transition-all duration-300 flex flex-col"
            >
              <h3 className="text-2xl font-bold">{cat.title}</h3>
              <p className="text-gray-400 text-sm mt-2 mb-6">{cat.desc}</p>

              <div className="text-center mb-6">
                <span className="text-4xl font-bold text-blue-400">
                  {cat.price} {currency}
                </span>
                <div className="text-gray-400 text-sm">onwards</div>
              </div>

              <button
                onClick={() => {
                  setActiveCategory(cat.key);
                  setOpen(true);
                }}
                className="mt-auto py-3 px-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
              >
                View Packages
              </button>
            </div>
          ))}

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 hover:border-blue-500 transition-all duration-300 flex flex-col">
            <h3 className="text-2xl font-bold">Is Your Category Not Listed?</h3>
            <p className="text-gray-400 text-sm mt-2 mb-6">
              Don't worry. connect with us for a custom quote.
            </p>

            <Link
              href="/contact"
              className="mt-auto py-3 px-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-center"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      {/* Popup */}
      {open && selectedCategory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div
            ref={popupRef}
            className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-6xl relative max-h-[90vh] overflow-y-auto"
          >
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-white"
              onClick={() => setOpen(false)}
            >
              ✕
            </button>

            <h2 className="text-4xl font-bold mb-2">
              {selectedCategory.title}
            </h2>
            <p className="text-gray-400 mb-10">{selectedCategory.desc}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-6">
              {selectedCategory.plans.map((plan, key) => (
                <div
                  key={key}
                  className={`relative bg-slate-900/50 backdrop-blur-sm border rounded-xl sm:rounded-2xl p-6 sm:p-8 transition-all duration-300 overflow-visible group flex flex-col h-full ${
                    plan.mostPopular
                      ? "border-blue-500 shadow-2xl shadow-blue-500/20 lg:scale-105"
                      : "border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform -translate-x-full -translate-y-full group-hover:translate-x-0 group-hover:translate-y-0 pointer-events-none rounded-lg" />

                  {plan.mostPopular && (
                    <div className="absolute -top-2 sm:-top-3 left-1/2 transform -translate-x-1/2 z-10">
                      <div className="flex items-center space-x-1 px-3 sm:px-4 py-1 sm:py-1.5 bg-gradient-to-b from-blue-500 to-blue-500 rounded-full text-xs sm:text-sm font-semibold shadow-lg">
                        <Star className="w-3 h-3 sm:w-3 sm:h-3 fill-white" />
                        <span>Most Popular</span>
                      </div>
                    </div>
                  )}

                  <div className="text-center mb-6 sm:mb-8">
                    <h3 className="text-xl sm:text-2xl font-bold mb-2">
                      {plan.name}
                    </h3>
                    <p className="text-gray-400 text-xs sm:text-sm mb-3 sm:mb-4">
                      {plan.description}
                    </p>
                    <div className="flex items-baseline justify-center">
                      <span className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-400 to-blue-400 bg-clip-text text-transparent">
                        {plan.price} {currency}
                      </span>
                    </div>
                  </div>

                  <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8 flex-row">
                    {plan.features.map((feature, featureKey) => (
                      <li
                        key={featureKey}
                        className="flex items-start space-x-2 sm:space-x-3"
                      >
                        <div className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5">
                          <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-400" />
                        </div>
                        <span className="text-gray-300 text-sm sm:text-base">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/dashboard"
                    className={`text-center w-full py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-semibold transition-all duration-300 mt-auto hover:scale-[1.02] cursor-pointer text-sm sm:text-base ${
                      plan.mostPopular
                        ? "bg-gradient-to-b from-blue-500 to-blue-500"
                        : "bg-white/5 border border-white/10 hover:bg-white/10"
                    }`}
                  >
                    Get Started
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}