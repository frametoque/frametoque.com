"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { motion, Variants } from "framer-motion";

const container: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const card: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

const protectImage = (e: React.SyntheticEvent) => e.preventDefault();

type ServiceCard = {
  key: string;
  title: string;
  desc: string;
  price: string;
  img: string;
  link: string;
};

const parsePrice = (price: string | number): number => {
  if (typeof price === "number") return price;
  return Number(String(price).replace(/,/g, ""));
};

const convertPricesToUSD = async (services: ServiceCard[]): Promise<ServiceCard[]> => {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/LKR");
    if (!res.ok) return services;
    const rateData = await res.json().catch(() => null);
    if (!rateData?.rates?.USD) return services;
    const rate: number = rateData.rates.USD;
    return services.map((cat) => ({
      ...cat,
      price: (parsePrice(cat.price) * rate).toFixed(2),
    }));
  } catch {
    return services;
  }
};

const CUSTOM_CARD_COPY: Record<string, { title: string; desc: string; bullets: string[] }> = {
  "web-dev": {
    title: "Need Something Special?",
    desc: "Don't see what you're looking for? We create custom web solutions for unique requirements.",
    bullets: ["Fully custom development", "Advanced integrations"],
  },
  "graphic-design": {
    title: "Need Something Special?",
    desc: "Don't see exactly what you need? We create custom graphic solutions to your specific requirements.",
    bullets: ["Brand identity development", "Custom illustrations & assets"],
  },
  "video-editing": {
    title: "Need Something Special?",
    desc: "Don't see the exact service you need? We create custom videos for your unique requirements.",
    bullets: ["Custom animation sequences", "Special effects & compositing"],
  },
  "photo-video": {
    title: "Need Something Special?",
    desc: "Don't see the exact service you need? We offer custom photography & videography solutions for your unique requirements.",
    bullets: ["Custom photography sessions", "Custom videography shoots"],
  },
};

interface Props {
  categorySlug: string;
}

export default function ServicesSub({ categorySlug }: Props) {
  const [currency, setCurrency] = useState("LKR");
  const [prices, setPrices] = useState<ServiceCard[]>([]);
  const [loading, setLoading] = useState(true);

  const custom = CUSTOM_CARD_COPY[categorySlug] ?? CUSTOM_CARD_COPY["web-dev"];

  // Fetch cards from API route
  useEffect(() => {
    setLoading(true);
    fetch(`/api/services/cards?category=${categorySlug}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data: ServiceCard[]) => {
        setPrices(data);
        setLoading(false);

        // apply saved currency preference after load
        const saved = localStorage.getItem("preferred_currency") || "LKR";
        if (saved === "USD") {
          convertPricesToUSD(data).then((converted) => {
            setPrices(converted);
            setCurrency("USD");
          });
        }
      })
      .catch(() => setLoading(false));
  }, [categorySlug]);

  // Listen for currency toggle events
  useEffect(() => {
    const handler = (e: CustomEvent<{ currency: string }>) => {
      if (e.detail.currency === "USD") {
        fetch(`/api/services/cards?category=${categorySlug}`, { cache: "no-store" })
          .then((r) => r.json())
          .then((data: ServiceCard[]) =>
            convertPricesToUSD(data).then((converted) => {
              setPrices(converted);
              setCurrency("USD");
            })
          );
      } else {
        fetch(`/api/services/cards?category=${categorySlug}`, { cache: "no-store" })
          .then((r) => r.json())
          .then((data: ServiceCard[]) => {
            setPrices(data);
            setCurrency("LKR");
          });
      }
    };

    window.addEventListener("currencyChange", handler as EventListener);
    return () => window.removeEventListener("currencyChange", handler as EventListener);
  }, [categorySlug]);

  if (loading) {
    return (
      <section className="pb-12 px-4 sm:px-6 lg:px-8 relative max-w-7xl mx-auto text-white">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-gray-900/50 border border-slate-800 rounded-2xl overflow-hidden animate-pulse"
            >
              <div className="aspect-[1601/1084] bg-slate-800" />
              <div className="p-6 space-y-3">
                <div className="h-6 bg-slate-800 rounded w-3/4" />
                <div className="h-4 bg-slate-800 rounded w-full" />
                <div className="h-10 bg-slate-800 rounded w-1/2 mt-4" />
                <div className="h-10 bg-slate-800 rounded-3xl w-full mt-4" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="pb-12 px-4 sm:px-6 lg:px-8 relative max-w-7xl mx-auto text-white">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-3"
      >
        {/* Dynamic Cards */}
        {prices.map((cat, i) => (
          <motion.div
            key={cat.key ?? i}
            variants={card}
            className="group bg-gray-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl overflow-hidden hover:border-brand-500 transition-all duration-300 flex flex-col"
          >
            <motion.div className="relative aspect-[1601/1084] overflow-hidden">
              <Image
                src={cat.img || "/services/eventpulse.png"}
                alt={cat.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                onContextMenu={protectImage}
                onDragStart={protectImage}
              />
            </motion.div>

            <div className="p-6 flex flex-col flex-grow">
              <h3 className="text-2xl font-bold mb-2">{cat.title}</h3>
              <p className="text-gray-400 text-sm mb-4 line-clamp-2 flex-grow">{cat.desc}</p>

              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold bg-gradient-to-r from-brand-400 to-brand-500 bg-clip-text text-transparent">
                    {cat.price}
                  </span>
                  <span className="text-2xl font-semibold text-gray-300">{currency}</span>
                  <span className="text-sm text-gray-500 self-end">onwards</span>
                </div>
              </div>

              <Link
                href={cat.link}
                className="mt-auto w-full py-3 px-4 rounded-3xl bg-gradient-to-r from-brand-500/10 to-brand-600/10 border border-brand-500/20 hover:from-brand-500/20 hover:to-brand-600/20 hover:border-brand-500/30 transition-all duration-300 flex items-center justify-center group/btn"
              >
                <span className="font-medium">View Packages</span>
                <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>
        ))}

        {/* Custom Card */}
        <motion.div
          variants={card}
          className="group bg-gray-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl overflow-hidden hover:border-brand-500 transition-all duration-300 flex flex-col"
        >
          <div className="relative aspect-[1601/1084] overflow-hidden bg-gradient-to-br from-brand-500/10 to-purple-500/10">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-8">
                <div className="text-5xl mb-4">✨</div>
                <h3 className="text-xl font-bold mb-2">Custom Solution</h3>
                <p className="text-gray-400">Tailored to your unique needs</p>
              </div>
            </div>
          </div>

          <div className="p-6 flex flex-col flex-grow">
            <h3 className="text-xl font-bold mb-2">{custom.title}</h3>
            <p className="text-gray-400 text-sm mb-4 flex-grow">{custom.desc}</p>

            <div className="mb-6 space-y-3">
              {custom.bullets.map((b, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-brand-500" />
                  <span className="text-sm text-gray-300">{b}</span>
                </div>
              ))}
            </div>

            <Link
              href="/contact"
              className="mt-auto w-full py-3 px-4 rounded-3xl bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 transition-all duration-300 flex items-center justify-center group/btn"
            >
              <span className="font-medium">Get Custom Quote</span>
              <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}