"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const protectImage = (e) => e.preventDefault();

const webcatprices = [
  {
    key: "portfolio-websites",
    title: "Personal Portfolio Website",
    desc: "Clean digital identity for creators and professionals.",
    price: "20,000",
    img: "/services/eventpulse.png",
    link: "/services/portfolio-websites",

  },
  {
    key: "business-websites",
    title: "Startup / Company Website",
    desc: "Sleek online presence for businesses.",
    price: "40,000",
    img: "/services/eventpulse.png",
    link: "/services/business-websites",
  },
  {
    key: "ecommerce-websites",
    title: "E-Commerce Online Store",
    desc: "Stylish platform to sell your products.",
    price: "75,000",
    img: "/services/eventpulse.png",
    link: "/services/ecommerce-websites",
  },
  {
    key: "learning-platforms",
    title: "E-Learning Platform",
    desc: "Modern LMS for academics and tutors.",
    price: "95,000",
    img: "/services/eventpulse.png",
    link: "/services/learning-platforms",
  },
  {
    key: "media-websites",
    title: "Blog / News & Media Website",
    desc: "Ideal for journalists, bloggers, and local news.",
    price: "60,000",
    img: "/services/eventpulse.png",
    link: "/services/media-websites",
  },
  {
    key: "booking-systems",
    title: "Booking / Ticketing System",
    desc: "Reservation systems for salons, events, and rentals.",
    price: "60,000",
    img: "/services/eventpulse.png",
    link: "/services/booking-systems"
  },
  {
    key: "education-websites",
    title: "School / Institute Website",
    desc: "Digital presence for schools, and tuition centers.",
    price: "50,000",
    img: "/services/eventpulse.png",
    link: "/services/education-websites",
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
        price: usdCatPrice.toFixed(2)
      };
    });
  } catch (error) {
    console.error("Error converting to USD:", error);
    return services;
  }
};

export default function WebPackages() {
  const [scrolled, setScrolled] = useState(false);
  const [currency, setCurrency] = useState("LKR");
  const [prices, setPrices] = useState(webcatprices);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 50);
    }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
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
    <section className="py-12 px-4 sm:px-6 lg:px-8 relative max-w-7xl mx-auto text-white">
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold mb-4">
          <span className="text-blue-400">Web </span>Development
        </h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Choose from our specialized web development services
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-3">
        {prices.map((cat, i) => (
          <div
            key={i}
            className="group bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl overflow-hidden hover:border-blue-500 transition-all duration-300 hover:scale-[1.02] flex flex-col"
          >
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image
                src={cat.img || "/images/services/default.jpg"}
                alt={cat.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                onContextMenu={protectImage}
                onDragStart={protectImage}
              />
            </div>

            <div className="p-6 flex flex-col flex-grow">
              <h3 className="text-2xl font-bold mb-2">{cat.title}</h3>
              <p className="text-gray-400 text-sm mb-4 line-clamp-2 flex-grow">
                {cat.desc}
              </p>
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent">
                    {cat.price}
                  </span>
                  <span className="text-2xl font-semibold text-gray-300">{currency}</span>
                  <span className="text-sm text-gray-500 self-end">onwards</span>
                </div>
              </div>
              <Link
                href={cat.link}
                className="mt-auto w-full py-3 px-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-blue-600/10 border border-blue-500/20 hover:from-blue-500/20 hover:to-blue-600/20 hover:border-blue-500/30 transition-all duration-300 flex items-center justify-center group/btn"
              >
                <span className="font-medium">View Packages</span>
                <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        ))}

        <div className="group bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl overflow-hidden hover:border-blue-500 transition-all duration-300 hover:scale-[1.02] flex flex-col">
          <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-blue-500/10 to-purple-500/10">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-8">
                <div className="text-5xl mb-4">✨</div>
                <h3 className="text-xl font-bold mb-2">Custom Solution</h3>
                <p className="text-gray-400">Tailored to your unique needs</p>
              </div>
            </div>
          </div>

          <div className="p-6 flex flex-col flex-grow">
            <h3 className="text-xl font-bold mb-2">Need Something Special?</h3>
            <p className="text-gray-400 text-sm mb-4 flex-grow">
              Don't see what you're looking for? We create custom web solutions for unique requirements.
            </p>

            <div className="mb-6 space-y-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-sm text-gray-300">Fully custom development</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-sm text-gray-300">Advanced integrations</span>
              </div>

            </div>

            <Link
              href="/contact"
              className="mt-auto w-full py-3 px-4 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-all duration-300 flex items-center justify-center group/btn"
            >
              <span className="font-medium">Get Custom Quote</span>
              <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

      </div>


    </section>
  );
}