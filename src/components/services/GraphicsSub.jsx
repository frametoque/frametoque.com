"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Star } from "lucide-react";
import Link from "next/link";

const graphicscatprices = [

  {
    key: "logo",
    title: "Branding & Identity Design",
    desc: "Crafting logos and visuals that define your brand.",
    price: "7,500",
    plans: [
      {
        name: "Logo Design (Basic)",
        description: "Beginner-friendly clean portfolio",
        price: "7,500",
        mostPopular: false,
        features: [
          "1 logo concept",
          "Brand-focused design",
          "High-resolution files",
          "JPG / PNG formats",
          "2 revisions",
        ],
      },
      {
        name: "Logo Design (Pro)",
        description: "Smooth, aesthetic, upgraded UI",
        price: "12,000",
        mostPopular: true,
        features: [
          "2 logo concepts",
          "Refined brand direction",
          "Scalable vector files",
          "Source file included",
          "4 revisions",
        ],
      },
      {
        name: "Brand Kit",
        description: "Custom UI/UX built from scratch",
        price: "14,000",
        mostPopular: false,
        features: [
          "Logo design",
          "Color palette",
          "Typography selection",
          "Brand consistency setup",
          "Revision support",
        ],
      },
      {
        name: "Full Brand Identity",
        description: "Custom UI/UX built from scratch",
        price: "28,000",
        mostPopular: false,
        features: [
          "Complete visual identity",
          "Logo, colors & typography",
          "Brand usage guidelines",
          "Scalable & editable files",
          "Unlimited revisions",
        ],
      },
    ],
  },

  {
    key: "socialmedia",
    title: "Social Media Design",
    desc: "Eye-catching posts and banners for all platforms.",
    price: "1,500",
    plans: [
      {
        name: "Single Post",
        description: "Professional business layout",
        price: "1,500",
        mostPopular: false,
        features: [
  "1 custom post design",
  "Platform-optimized size",
  "Brand-aligned layout",
  "High-resolution export",
  "2 revisions",
        ],
      },

      {
        name: "8-Post Pack",
        description: "High-end UI with motion + structure",
        price: "8,000",
        mostPopular: true,
        features: [
  "8 branded designs",
  "Consistent visual style",
  "Platform-ready formats",
  "High-resolution delivery",
  "Revision support",
        ],
      },

      {
        name: "15-Post Pack",
        description: "Premium brand-level design",
        price: "14,500",
        mostPopular: false,
        features: [
  "15 cohesive designs",
  "Strong brand consistency",
  "Engagement-focused layouts",
  "Optimized sizing",
  "Revision support",
        ],
      },

      {
        name: "30-Post Pack",
        description: "Professional business layout",
        price: "26,000",
        mostPopular: false,
        features: [
  "30 professional designs",
  "Full content consistency",
  "Multiple layout variations",
  "Social-ready exports",
  "Priority revision support",
        ],
      },
    ],
  },

  {
    key: "promotional",
    title: "Marketing & Promotional",
    desc: "Designs that boost your campaigns and sales.",
    price: "2,500",
    plans: [
       {
        name: "Ad Creative",
        description: "WooCommerce powered shop",
        price: "2,500",
        mostPopular: true,
        features: [
  "Conversion-focused design",
  "Platform-specific sizing",
  "Clean CTA placement",
  "Optimized formats",
  "Revision support",
        ],
      },
      {
        name: "Poster / Flyer",
        description: "Show products without checkout",
        price: "3,000",
        mostPopular: false,
        features: [
  "Single promotional design",
  "Print & digital ready",
  "Strong visual hierarchy",
  "High-resolution files",
  "2 revisions",
        ],
      },
      {
        name: "Event Promo Pack",
        description: "Premium handmade e-commerce",
        price: "7,500",
        mostPopular: false,
        features: [
  "3 event creatives",
  "Consistent campaign look",
  "Print & digital versions",
  "High-quality outputs",
  "Revision support",
        ],
      },
       {
        name: "Campaign Pack",
        description: "Premium handmade e-commerce",
        price: "14,000",
        mostPopular: false,
        features: [
  "6 campaign visuals",
  "Unified design language",
  "Multi-platform use",
  "Premium-quality files",
  "Priority revisions",
        ],
      },
    ],
  },

  {
    key: "stationery",
    title: "Print & Stationery Design",
    desc: "Stylish business cards, flyers, and letterheads.",
    price: "2,000",
    plans: [
      {
        name: "Letterhead",
        description: "For professional academies",
        price: "2,000",
        mostPopular: false,
        features: [
  "Professional layout",
  "Brand-aligned styling",
  "Print-ready format",
  "High-quality output",
  "Revision support",
        ],
      },
      {
        name: "Business Card",
        description: "For small institutes",
        price: "2,500",
        mostPopular: true,
        features: [
  "Front & back design",
  "Print-ready layout",
  "CMYK & bleed setup",
  "High-resolution files",
  "2 revisions",
        ],
      },
      {
        name: "Brochure",
        description: "Full-scale institutional LMS",
        price: "6,500",
        mostPopular: false,
        features: [
  "Structured page layout",
  "Visual consistency",
  "Print-ready PDF",
  "High-resolution images",
  "Revision support",
        ],
      },
      {
        name: "Packaging Design",
        description: "Full-scale institutional LMS",
        price: "10,000",
        mostPopular: false,
        features: [
  "Custom package layout",
  "Product-focused visuals",
  "Print-ready files",
  "Accurate dimensions",
  "Revision support",
        ],
      },
    ],
  },

  {
    key: "webgraphics",
    title: "Digital & Web Graphics",
    desc: "Graphics that make your website and apps pop.",
    price: "2,500",
    plans: [
      {
        name: "Email Creatives",
        description: "Full-scale institutional LMS",
        price: "2,500",
        mostPopular: false,
        features: [
  "Branded email design",
  "Readable layout",
  "Optimized file size",
  "JPG / PNG delivery",
  "Revision support",
        ],
      },
      {
        name: "Website Banner",
        description: "For professional academies",
        price: "3,500",
        mostPopular: true,
        features: [
  "Hero / section design",
  "Web-optimized visuals",
  "Responsive sizing",
  "Fast-loading formats",
  "Revision support",
        ],
      },
      {
        name: "Landing Page Graphics",
        description: "For small institutes",
        price: "6,000",
        mostPopular: false,
        features: [
  "UI-focused visuals",
  "Section-based graphics",
  "Clean spacing & hierarchy",
  "Web-ready formats",
  "Revision support",
        ],
      },
      
      {
        name: "App UI Assests",
        description: "Full-scale institutional LMS",
        price: "8,000",
        mostPopular: false,
        features: [
  "Custom UI graphics",
  "Platform-consistent design",
  "Scalable resolutions",
  "Organized asset delivery",
  "Revision support",
        ],
      },
    ],
  },

  {
    key: "customgraphics",
    title: "Custom Graphic Design",
    desc: "Unique designs tailored just for you.",
    price: "4,000",
    plans: [
      {
        name: "Custom Graphic Design",
        description: "Full-scale institutional LMS",
        price: "4,000",
        mostPopular: true,
        features: [
  "Unique creative concept",
  "Tailored visual direction",
  "Flexible design scope",
  "High-quality final files",
  "Revision support",
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
  const [prices, setPrices] = useState(graphicscatprices);

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
          const converted = await convertPricesToUSD(graphicscatprices);
          setPrices(converted);
          setCurrency("USD");
        } else {
          setPrices(graphicscatprices);
          setCurrency("LKR");
        }
      } catch (error) {
        console.error("Error detecting currency:", error);
        setPrices(graphicscatprices);
        setCurrency("LKR");
      }
    }

    detectCurrency();
  }, []);

  return (
    <>
      <section className="py-2 px-6 relative max-w-7xl mx-auto text-white">
        <h2 className="text-4xl sm:text-4xl font-bold mb-12">Graphics Designing</h2>

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