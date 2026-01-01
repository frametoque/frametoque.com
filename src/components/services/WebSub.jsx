"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Star } from "lucide-react";
import Link from "next/link";

const webcatprices = [

  {
    key: "personal",
    title: "Personal Portfolio Website",
    desc: "Clean digital identity for creators and professionals.",
    price: "20,000",
    plans: [
      {
        name: "Standard",
        description: "Beginner-friendly clean portfolio",
        price: "20,000",
        mostPopular: false,
        features: [
          "Up to 5 Pages",
          "Responsive Design",
          "Basic Animations",
          "Contact Form",
          "Social Media Links",
          "Basic SEO",
          "2 Revisions",
        ],
      },
      {
        name: "Modern UI",
        description: "Smooth, aesthetic, upgraded UI",
        price: "50,000",
        mostPopular: true,
        features: [
          "Everything in Standard",
          "Modern Animations",
          "Admin Dashboard",
          "Light/Dark Mode",
          "Enhanced Portfolio Grid",
          "SEO Meta Structure",
          "3 Revisions",
        ],
      },
      {
        name: "Fully Custom",
        description: "Custom UI/UX built from scratch",
        price: "99,000",
        mostPopular: false,
        features: [
          "Fully Original Layout",
          "Unlimited Pages",
          "Custom Components",
          "Optional Backend",
          "Blog/Gallery Integration",
          "Priority Support",
          "Unlimited Revisions",
        ],
      },
    ],
  },

  {
    key: "business",
    title: "Startup / Company Website",
    desc: "Sleek online presence for businesses.",
    price: "40,000",
    plans: [
      {
        name: "Standard Corporate",
        description: "Professional business layout",
        price: "40,000",
        mostPopular: false,
        features: [
          "Up to 8 Pages",
          "Responsive UI",
          "Team & Services Pages",
          "Contact + Inquiry Forms",
          "Google Maps",
          "Basic SEO",
          "2 Revisions",
        ],
      },

      {
        name: "Modern Business UI",
        description: "High-end UI with motion + structure",
        price: "125,000",
        mostPopular: true,
        features: [
          "Everything in Standard Corporate",
          "Custom Hero Sections",
          "Card Layouts",
          "Smooth Animations",
          "Integrated Blog",
          "Analytics Setup",
          "SEO Structured Data",
          "3 Revisions",
        ],
      },

      {
        name: "Fully Custom Enterprise",
        description: "Premium brand-level design",
        price: "320,000",
        mostPopular: false,
        features: [
          "Full Brand-Based Custom Design",
          "CRM / Backend Integration",
          "Employee Dashboard (Optional)",
          "Blog + News System",
          "Complete SEO Optimization",
          "Advanced Motion Effects",
          "Unlimited Revisions",
        ],
      },
    ],
  },

  {
    key: "ecommerce",
    title: "E-Commerce Online Store",
    desc: "Stylish platform to sell your products.",
    price: "75,000",
    plans: [
      {
        name: "Catalogue Only",
        description: "Show products without checkout",
        price: "75,000",
        mostPopular: false,
        features: [
          "Product Gallery & Grid",
          "Advanced Categories",
          "Product Detail Pages",
          "WhatsApp Inquiry Button",
          "Up to 50 Products",
          "Basic SEO",
          "2 Revisions",
        ],
      },
      {
        name: "WooCommerce Store",
        description: "Full checkout-ready shop",
        price: "150,000",
        mostPopular: true,
        features: [
          "Everything in Catalogue",
          "Cart & Checkout System",
          "Payment Gateway",
          "Coupon & Discount System",
          "Shipping & Tax Rules",
          "Inventory Management",
          "100+ Products",
          "3 Revisions",
        ],
      },
      {
        name: "Custom-Coded Store",
        description: "High-performance bespoke store",
        price: "450,000",
        mostPopular: false,
        features: [
          "Next.js / Headless Frontend",
          "Custom Admin Dashboard",
          "Advanced Search & Filters",
          "Order Tracking System",
          "Email & SMS Notifications",
          "Multi-Currency Support",
          "Full SEO Domination",
          "Priority Support",
          "Unlimited Revisions",
        ],
      },
    ],
  },

  {
    key: "lms",
    title: "E-Learning Platform",
    desc: "Modern LMS for academics and tutors.",
    price: "95,000",
    plans: [
      {
        name: "Basic LMS",
        description: "Perfect for individual tutors",
        price: "95,000",
        mostPopular: false,
        features: [
          "Course Listing & Detail",
          "Student Registration",
          "Video Embedding (YouTube/Vimeo)",
          "Simple Assignment Uploads",
          "WhatsApp Support Button",
          "Basic Student Profile",
          "2 Revisions",
        ],
      },
      {
        name: "Advanced LMS",
        description: "For professional academies",
        price: "220,000",
        mostPopular: true,
        features: [
          "Everything in Basic LMS",
          "Secure Video Hosting (HLS)",
          "Live Zoom/Meet Integration",
          "Online MCQ Exams",
          "Automated PDF Certificates",
          "Payment Gateway (PayHere)",
          "Instructor Dashboard",
          "4 Revisions",
        ],
      },
      {
        name: "Custom LMS",
        description: "Full-scale institutional platform",
        price: "550,000",
        mostPopular: false,
        features: [
          "Bespoke UI/UX Design",
          "Mobile App (Optional / PWA)",
          "Advanced Analytics & ROI",
          "Interactive H5P Content",
          "Anti-Cheat Exam System",
          "Multi-Campus Management",
          "Priority Technical Support",
          "Unlimited Revisions",
        ],
      },
    ],
  },

  {
    key: "news",
    title: "Blog / News & Media Website",
    desc: "Ideal for journalists, bloggers, and local news.",
    price: "60,000",
    plans: [
      {
        name: "Standard Blog",
        description: "Clean layout for personal storytelling",
        price: "60,000",
        mostPopular: false,
        features: [
          "WordPress/Ghost Setup",
          "Up to 5 Categories",
          "AdSense Ready",
          "Newsletter Signup",
          "Mobile Optimized",
          "Basic SEO",
          "2 Revisions",
        ],
      },

      {
        name: "Pro News Portal",
        description: "High-traffic ready news engine",
        price: "135,000",
        mostPopular: true,
        features: [
          "Everything in Standard",
          "Custom News Layouts",
          "Breaking News Ticker",
          "Multi-Author Dashboard",
          "Speed Optimization",
          "RSS Feeds",
          "3 Revisions",
        ],
      },

      {
        name: "Media Enterprise",
        description: "Full-scale digital media house",
        price: "350,000",
        mostPopular: false,
        features: [
          "Custom Headless CMS",
          "Next.js / High-Speed UI",
          "Video/Podcast Integration",
          "RSS Feeds",
          "CDN Setup for Traffic Spikes",
          "Priority Support",
          "Unlimited Revisions",
        ],
      },
    ],
  },

  {
    key: "booking",
    title: "Booking / Ticketing System",
    desc: "Reservation systems for salons, events, and rentals.",
    price: "60,000",
    plans: [
      {
        name: "Standard Booking",
        description: "Simple appointment scheduling",
        price: "60,000",
        mostPopular: false,
        features: [
          "Appointment Calendar",
          "Service Categories",
          "Email Confirmations",
          "Business Hours Setup",
          "WhatsApp Integration",
          "Mobile Responsive UI",
          "2 Revisions",
        ],
      },
      {
        name: "Pro Ticketing Hub",
        description: "Advanced event & payment system",
        price: "135,000",
        mostPopular: true,
        features: [
          "Everything in Standard",
          "Payment Gateway (PayHere)",
          "QR Code Ticket Generation",
          "SMS Reminders",
          "User Booking History",
          "Cancellation/Refund Logic",
          "Admin Booking Dashboard",
          "3 Revisions",
        ],
      },
      {
        name: "Enterprise Engine",
        description: "Full-scale custom reservation platform",
        price: "380,000",
        mostPopular: false,
        features: [
          "Custom Multi-Vendor System",
          "Real-time Seat Mapping",
          "Dynamic Pricing Logic",
          "Staff/Resource Management",
          "Mobile Check-in App (Scan QR)",
          "Deep Analytics & Reporting",
          "Priority Support",
          "Unlimited Revisions",
        ],
      },
    ],
  },

  {
    key: "institute",
    title: "School / Institute Website",
    desc: "Digital presence for schools, and tuition centers.",
    price: "50,000",
    plans: [
      {
        name: "Academic Basic",
        description: "Informational site for schools",
        price: "50,000",
        mostPopular: false,
        features: [
          "About & Gallery Pages",
          "Notice Board System",
          "Staff Directory",
          "Downloadable Forms (PDF)",
          "Google Maps Integration",
          "Basic SEO",
          "2 Revisions",
        ],
      },
      
      {
        name: "Interactive Campus",
        description: "Dynamic portal for student engagement",
        price: "120,000",
        mostPopular: true,
        features: [
          "Everything in Academic Basic",
          "Online Admission Forms",
          "Student/Result Portal",
          "Events Calendar",
          "Blog & News Section",
          "Social Media Feed",
          "3 Revisions",
        ],
      },

      {
        name: "Full LMS Enterprise",
        description: "Complete e-learning & management system",
        price: "450,000",
        mostPopular: false,
        features: [
          "Course Management (LMS)",
          "Online Fee Payments",
          "Live Class Integration",
          "Attendance/Grade Tracking",
          "Mobile App (Web-view)",
          "Advanced Security",
          "Unlimited Revisions",
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
  const [prices, setPrices] = useState(webcatprices);

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
          const converted = await convertPricesToUSD(webcatprices);
          setPrices(converted);
          setCurrency("USD");
        } else {
          setPrices(webcatprices);
          setCurrency("LKR");
        }
      } catch (error) {
        console.error("Error detecting currency:", error);
        setPrices(webcatprices);
        setCurrency("LKR");
      }
    }

    detectCurrency();
  }, []);

  return (
    <>
      <section className="py-2 px-6 relative max-w-7xl mx-auto text-white">
        <h2 className="text-3xl font-bold mb-8 pb-4 border-b border-white/10 flex items-center gap-3">
            <span className="bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent">
                Web Development
            </span>
        </h2>
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