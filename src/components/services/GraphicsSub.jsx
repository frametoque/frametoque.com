"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const protectImage = (e) => e.preventDefault();

const graphiccatprices = [

  {
    key: "logo-design",
    title: "Branding & Identity Design",
    desc: "Crafting logos and visuals that define your brand.",
    price: "7,500",
    img: "/services/eventpulse.png",
    link: "/services/logo-design",
  },

  {
    key: "socialmedia-post-design",
    title: "Social Media Design",
    desc: "Eye-catching posts and banners for all platforms.",
    price: "1,500",
    img: "/services/eventpulse.png",
    link: "/services/socialmedia-post-design",
  },

  {
    key: "promotional-design",
    title: "Marketing & Promotional",
    desc: "Designs that boost your campaigns and sales.",
    price: "2,500",
    img: "/services/eventpulse.png",
    link: "/services/promotional-design",
  },

  {
    key: "stationery-design",
    title: "Print & Stationery Design",
    desc: "Stylish business cards, flyers, and letterheads.",
    price: "2,000",
    img: "/services/eventpulse.png",
    link: "/services/stationery-design",
  },

  {
    key: "webgraphic",
    title: "Digital & Web Graphics",
    desc: "Graphics that make your website and apps pop.",
    price: "2,500",
    img: "/services/eventpulse.png",
    link: "/services/webgraphic",
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
  const [prices, setPrices] = useState(graphiccatprices);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 50);
    }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  //currency detection
    function detectCurrency() {
          const saved = localStorage.getItem('preferred_currency') || 'LKR';
  
          if (saved === 'USD') {
            convertPricesToUSD(graphiccatprices).then((converted) => {
              setPrices(converted);
              setCurrency('USD');
            });
          } else {
            setPrices(graphiccatprices);
            setCurrency('LKR');
          }
      }

    useEffect(() => {
    
      detectCurrency();
  
      const handler = (e) => {
      const { currency } = e.detail;
      if (currency === 'USD') {
        convertPricesToUSD(graphiccatprices).then((converted) => {
          setPrices(converted);
          setCurrency('USD');
        });
      } else {
        setPrices(graphiccatprices);
        setCurrency('LKR');
      }
    };
  
      window.addEventListener('currencyChange', handler);
      return () => window.removeEventListener('currencyChange', handler);
  
    }, []);
  //currency detection end

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 relative max-w-7xl mx-auto text-white">
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold mb-4">
          <span className="text-blue-400">Graphic </span>Design
        </h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Choose from our creative graphic design solutions
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
                <h3 className="text-xl font-bold mb-2">Custom Design</h3>
                <p className="text-gray-400">Tailored to your brand vision</p>
              </div>
            </div>
          </div>

          <div className="p-6 flex flex-col flex-grow">
            <h3 className="text-xl font-bold mb-2">Need Something Special?</h3>
            <p className="text-gray-400 text-sm mb-4 flex-grow">
              Don't see exactly what you need? We create custom graphic solutions to your specific requirements.
            </p>

            <div className="mb-6 space-y-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-sm text-gray-300">Brand identity development</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-sm text-gray-300">Custom illustrations & assets</span>
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