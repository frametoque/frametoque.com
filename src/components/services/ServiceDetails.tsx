"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Check, Star, ArrowRight, Zap, Shield, Clock, Users,
  Palette, Layers, Video, Music, Globe, Camera, Image as ImageIcon, Sliders, Share2
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import type { ServiceRow, Package } from "@/lib/services";
import { useCart } from "@/context/CartContext";
import { ServiceDemoPopup } from "./ServiceDemoPopup";

const protectImage = (e: React.SyntheticEvent) => e.preventDefault();

const getIconComponent = (iconName: string) => {
  switch (iconName) {
    case "Zap":      return <Zap className="w-6 h-6" />;
    case "Clock":    return <Clock className="w-6 h-6" />;
    case "Shield":   return <Shield className="w-6 h-6" />;
    case "Users":    return <Users className="w-6 h-6" />;
    case "Palette":  return <Palette className="w-6 h-6" />;
    case "Layers":   return <Layers className="w-6 h-6" />;
    case "Video":    return <Video className="w-6 h-6" />;
    case "Music":    return <Music className="w-6 h-6" />;
    case "Globe":    return <Globe className="w-6 h-6" />;
    case "Camera":   return <Camera className="w-6 h-6" />;
    case "Image":    return <ImageIcon className="w-6 h-6" />;
    case "Sliders":  return <Sliders className="w-6 h-6" />;
    case "Share2":   return <Share2 className="w-6 h-6" />;
    default:         return <Zap className="w-6 h-6" />;
  }
};

const parsePrice = (priceString: string | number): number => {
  if (!priceString) return 0;
  return parseFloat(String(priceString).replace(/[^0-9.-]/g, "")) || 0;
};

const formatPrice = (price: string | number, currency: string): string => {
  const cleaned =
    typeof price === "string" ? price.replace(/,/g, "") : price;
  const n = typeof cleaned === "number" ? cleaned : parseFloat(String(cleaned));
  if (isNaN(n)) return "0";
  return currency === "USD"
    ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const convertPricesToUSD = async (packages: Package[]): Promise<Package[]> => {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/LKR");
    if (!res.ok) return packages;
    const rateData = await res.json().catch(() => null);
    if (!rateData?.rates?.USD) return packages;
    const rate: number = rateData.rates.USD;
    return packages.map((pkg) => ({
      ...pkg,
      price: (parsePrice(pkg.price) * rate).toFixed(2),
      ...(pkg.price_yearly && { price_yearly: (parsePrice(pkg.price_yearly) * rate).toFixed(2) })
    }));
  } catch {
    return packages;
  }
};

interface Props {
  serviceType: string;
  categorySlug: string;
}

export default function ServiceDataPage({ serviceType, categorySlug }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [currency, setCurrency] = useState("LKR");
  const [data, setData] = useState<ServiceRow | null>(null);
  const [convertedPackages, setConvertedPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const [addedIndexes, setAddedIndexes] = useState<Record<number, boolean>>({});
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [isYearly, setIsYearly] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 50);
    }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const safeArray = (val: any): Package[] => {
    if (Array.isArray(val)) return val;
    if (typeof val === "string") {
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  // Fetch service data from API
  useEffect(() => {
    setLoading(true);
    fetch(`/api/services/detail?category=${categorySlug}&service=${serviceType}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((row: ServiceRow) => {
        setData(row);
        const pkgs = safeArray(row?.packages);
        setConvertedPackages(pkgs);
        setLoading(false);

        const saved = localStorage.getItem("preferred_currency") || "LKR";
        if (saved === "USD") {
          convertPricesToUSD(pkgs).then((converted) => {
            setConvertedPackages(converted);
            setCurrency("USD");
          });
        }
      })
      .catch(() => setLoading(false));
  }, [serviceType, categorySlug]);

  const originalPackages = useMemo(() => safeArray(data?.packages), [data]);

  useEffect(() => {
    if (originalPackages.length === 0) return;

    const handler = (e: CustomEvent<{ currency: string }>) => {
      if (e.detail.currency === "USD") {
        convertPricesToUSD(originalPackages).then((converted) => {
          setConvertedPackages(converted);
          setCurrency("USD");
        });
      } else {
        setConvertedPackages(originalPackages);
        setCurrency("LKR");
      }
    };

    window.addEventListener("currencyChange", handler as EventListener);
    return () => window.removeEventListener("currencyChange", handler as EventListener);
  }, [originalPackages]);

  const handleAddToCart = (pkg: Package, idx: number) => {
    const origPkg = originalPackages[idx] || pkg;
    const itemId = `${categorySlug}-${serviceType}-${pkg.tier.toLowerCase().replace(/\s+/g, "-")}`;
    addToCart({
      id: itemId,
      serviceId: serviceType,
      serviceTitle: data?.title || "",
      categorySlug: categorySlug,
      categoryName: data?.category || "",
      tier: pkg.tier,
      price: isYearly && origPkg.price_yearly ? origPkg.price_yearly : origPkg.price,
      duration: isYearly && origPkg.price_yearly ? "/yr" : pkg.duration,
    });
    setAddedIndexes((prev) => ({ ...prev, [idx]: true }));
    setTimeout(() => {
      setAddedIndexes((prev) => ({ ...prev, [idx]: false }));
    }, 2000);
  };

  const safeConverted = useMemo(() => safeArray(convertedPackages), [convertedPackages]);
  const displayPackages = safeConverted.length > 0 ? safeConverted : originalPackages;
  const hasYearlyPackages = Array.isArray(displayPackages) && displayPackages.some((p) => Boolean(p?.price_yearly));

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white overflow-hidden">
        <Navbar scrolled={scrolled} />
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <Footer />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-slate-950 text-white overflow-hidden">
        <Navbar scrolled={scrolled} />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Service Not Found</h1>
            <p className="text-gray-400 mb-8">
              The requested service could not be found.
            </p>
            <Link
              href="/services"
              className="inline-flex items-center px-6 py-3 rounded-3xl bg-brand-500 hover:bg-brand-600 transition-colors"
            >
              View All Services
            </Link>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white overflow-hidden">
      <Navbar scrolled={scrolled} />

      <div>
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-24 pb-16 px-4 sm:px-6 lg:px-8">
          {/* Ambient Glow Background */}
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] sm:w-[900px] h-[400px] bg-brand-500/15 blur-[120px] rounded-full" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(22,159,228,0.2),rgba(0,0,0,0))]" />
          </div>
          <div className="relative max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <div>
                  <span className="inline-block px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-sm font-medium mb-4">
                    {data.category}
                  </span>
                  <h1 className="text-5xl sm:text-5xl lg:text-5xl font-bold leading-tight">
                    {data.title}
                  </h1>
                </div>

                <p className="text-xl text-gray-300 leading-relaxed">
                  {data.description}
                </p>

                <div className="space-y-4">
                  <p className="text-lg text-brand-300">{data.overview}</p>



                  <div className="flex flex-wrap gap-3 pt-2">
                    {data.demo_url ? (
                      <button
                        onClick={() => setIsDemoOpen(true)}
                        className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 transition-all duration-300 font-semibold text-sm group cursor-pointer"
                      >
                        View Demo
                        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </button>
                    ) : (
                      <Link
                        href="/contact"
                        className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 transition-all duration-300 font-semibold text-sm group"
                      >
                        Custom Quote
                        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    )}

                    {displayPackages.length > 0 && (
                      <Link
                        href="#packages"
                        className="inline-flex items-center px-6 py-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 font-semibold text-sm"
                      >
                        View Packages
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="hidden sm:block h-20" />
                <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-1">
                  <div className="absolute -top-4 -right-4 w-24 h-24 bg-brand-500/20 rounded-full blur-xl" />
                  <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-brand-500/20 rounded-full blur-xl" />
                  <div className="relative aspect-[1601/1084] rounded-xl overflow-hidden">
                    <Image
                      src={data.hero_image || "/services/eventpulse.png"}
                      alt={data.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      priority
                      onContextMenu={protectImage}
                      onDragStart={protectImage}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Packages */}
        <section id="packages" className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Tailored <span className="text-brand-400">Packages</span>
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto mb-8">
                Choose the perfect package for your business needs. All packages include our premium design and development standards.
              </p>

              {hasYearlyPackages && (
                <div className="flex justify-center">
                  <div className="bg-gray-900/80 p-1.5 rounded-full inline-flex border border-slate-800">
                    <button
                      onClick={() => setIsYearly(false)}
                      className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
                        !isYearly ? "bg-brand-500 text-white shadow-lg" : "text-gray-400 hover:text-white"
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      onClick={() => setIsYearly(true)}
                      className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
                        isYearly ? "bg-brand-500 text-white shadow-lg" : "text-gray-400 hover:text-white"
                      }`}
                    >
                      Yearly <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full">Free setup</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="max-w-6xl mx-auto">
              <div className="flex flex-wrap justify-center items-stretch gap-8">
                {displayPackages.map((pkg, index) => (
                  <div
                    key={index}
                    className={`w-full sm:w-[320px] self-stretch relative bg-gray-900/50 backdrop-blur-sm border rounded-2xl p-8 transition-all duration-300 hover:scale-[1.02] flex flex-col ${
                      pkg.popular
                        ? "border-brand-500 shadow-2xl shadow-brand-500/20"
                        : "border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    {pkg.popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                        <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-brand-500 to-brand-600 rounded-full text-sm font-semibold">
                          <Star className="w-4 h-4 fill-white" />
                          <span>Most Popular</span>
                        </div>
                      </div>
                    )}

                    <div className="text-center mb-8">
                      <h3 className="text-2xl font-bold mb-2">{pkg.tier}</h3>
                      <p className="text-gray-400 mb-4">{pkg.description}</p>

                      <div className="flex items-baseline justify-center gap-2 mb-2">
                        <span className="text-5xl font-bold bg-gradient-to-r from-brand-400 to-brand-500 bg-clip-text text-transparent">
                          {isYearly && pkg.price_yearly ? formatPrice(pkg.price_yearly, currency) : formatPrice(pkg.price, currency)}
                        </span>
                        <span className="text-gray-400">{currency}</span>
                      </div>
                      <div className="text-sm text-gray-400">
                        {isYearly && pkg.price_yearly ? "/yr" : pkg.duration}
                      </div>
                    </div>

                    <ul className="space-y-3 mb-8 flex-grow">
                      {pkg.features?.map((feature, idx) => (
                        <li key={idx} className="flex items-start space-x-3">
                          <Check className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-300">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => handleAddToCart(pkg, index)}
                      className={`text-center w-full py-3 px-6 rounded-3xl font-semibold transition-all duration-300 mt-auto flex items-center justify-center gap-2 ${
                        addedIndexes[index]
                          ? "bg-green-600 border border-green-600 text-white scale-[1.02]"
                          : pkg.popular
                          ? "bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white"
                          : "bg-white/5 border border-white/10 hover:bg-white/10 text-white"
                      }`}
                    >
                      {addedIndexes[index] ? (
                        <>
                          <Check className="w-5 h-5 animate-scaleUp" /> Added to Cart
                        </>
                      ) : (
                        "Add to Cart"
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        {data.features && data.features.length > 0 && (
          <section className="py-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {data.features.map((feature, index) => (
                  <div
                    key={index}
                    className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 hover:border-brand-500/50 transition-all duration-300"
                  >
                    <div className="inline-flex p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 mb-4">
                      {getIconComponent(feature.icon)}
                    </div>
                    <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                    <p className="text-gray-400">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Process */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Our <span className="text-brand-400">Process</span>
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                A structured workflow that keeps decisions clear, the build efficient, and outcomes measurable.
              </p>
            </div>

            <div className="relative">
              <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-0.5 bg-gradient-to-b from-slate-500/30 via-slate-500/20 to-transparent hidden lg:block" />

              <div className="space-y-12 lg:space-y-0">
                {data.process?.map((step, index) => (
                  <div
                    key={index}
                    className={`relative lg:flex lg:items-center lg:justify-between ${
                      index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
                    }`}
                  >
                    <div className="lg:w-5/12 mb-6 lg:mb-0">
                      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 hover:border-brand-500/50 transition-all duration-300">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xl font-bold mb-4">
                          {step.step}
                        </div>
                        <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                        <p className="text-gray-400">{step.description}</p>
                      </div>
                    </div>

                    <div className="absolute left-1/2 transform -translate-x-1/2 lg:relative lg:left-auto lg:transform-none">
                      <div className="w-8 h-8 rounded-full bg-brand-500 border-4 border-slate-900 flex items-center justify-center z-10 relative">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    </div>

                    <div className="lg:w-5/12" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Tech Stack */}
        {categorySlug !== "saas-products" && (
          <section className="py-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                  Our <span className="text-brand-400">Tech Stack</span>
                </h2>
                <p className="text-gray-400 max-w-2xl mx-auto">
                  We use modern, reliable technologies to build fast, scalable, and secure web solutions.
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                {data.technologies?.map((tech, index) => (
                  <div
                    key={index}
                    className="px-6 py-3 rounded-full bg-gray-900/50 border border-slate-800 hover:border-brand-500/50 hover:bg-gray-500/10 transition-all duration-300"
                  >
                    <span className="text-gray-300 font-medium">{tech}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Success Framework */}
        {categorySlug !== "saas-products" && (
          <section className="py-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                  Our <span className="text-brand-400">Success Framework</span>
                </h2>
                <p className="text-gray-400 max-w-2xl mx-auto">
                  A proven methodology that ensures your project delivers real business value and measurable results.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                <div className="bg-gradient-to-br from-gray-900/50 to-gray-900/20 border border-slate-800 rounded-2xl p-8">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-600/20 border border-brand-500/30 flex items-center justify-center mr-4">
                      <span className="text-2xl">🎯</span>
                    </div>
                    <h3 className="text-2xl font-bold">Strategic Approach</h3>
                  </div>
                  <div className="space-y-4">
                    {[
                      { title: "Goal-Oriented Planning", desc: "Every project starts with clear business objectives and measurable KPIs" },
                      { title: "Market Analysis", desc: "Understanding your competitive landscape and target audience" },
                      { title: "ROI-Focused Solutions", desc: "Solutions designed to maximize return on your investment" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start space-x-3">
                        <Check className="w-5 h-5 text-brand-400 flex-shrink-0 mt-1" />
                        <div>
                          <h4 className="font-semibold mb-1">{item.title}</h4>
                          <p className="text-gray-400 text-sm">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-slate-900/50 to-brand-900/20 border border-slate-800 rounded-2xl p-8">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-600/20 border border-brand-500/30 flex items-center justify-center mr-4">
                      <span className="text-2xl">🤝</span>
                    </div>
                    <h3 className="text-2xl font-bold">Collaborative Partnership</h3>
                  </div>
                  <div className="space-y-4">
                    {[
                      { title: "Transparent Communication", desc: "Regular updates, clear milestones, and open feedback loops" },
                      { title: "Your Vision, Our Expertise", desc: "We blend your business insights with our technical expertise" },
                      { title: "Flexible Collaboration", desc: "Adapt to your preferred communication and decision-making style" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start space-x-3">
                        <Check className="w-5 h-5 text-brand-400 flex-shrink-0 mt-1" />
                        <div>
                          <h4 className="font-semibold mb-1">{item.title}</h4>
                          <p className="text-gray-400 text-sm">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { value: "95%", label: "Client Satisfaction Rate" },
                  { value: "40%+", label: "Average Performance Improvement" },
                  { value: "100%", label: "On-Time Delivery" },
                  { value: "24/7", label: "Post-Launch Support" },
                ].map((stat, i) => (
                  <div key={i} className="bg-gray-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 text-center">
                    <div className="text-3xl font-bold bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent mb-2">
                      {stat.value}
                    </div>
                    <p className="text-gray-400 text-sm">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-12 bg-gradient-to-br from-gray-900/50 to-gray-800/20 border border-slate-800 rounded-2xl p-8">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-4">Why Clients Trust Us</h3>
                  <p className="text-gray-400 max-w-2xl mx-auto">
                    Beyond technical skills, we build relationships based on trust, reliability, and shared success.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { icon: <Shield className="w-8 h-8 text-brand-400" />, title: "Commitment to Quality", desc: "Rigorous quality assurance at every project stage" },
                    { icon: <Clock className="w-8 h-8 text-brand-400" />, title: "Timely Delivery", desc: "Respect for deadlines without compromising quality" },
                    { icon: <Users className="w-8 h-8 text-brand-400" />, title: "Long-term Partnership", desc: "Ongoing support and guidance beyond project completion" },
                  ].map((item, i) => (
                    <div key={i} className="text-center p-4">
                      <div className="w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mx-auto mb-4">
                        {item.icon}
                      </div>
                      <h4 className="font-semibold mb-2">{item.title}</h4>
                      <p className="text-gray-400 text-sm">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="py-16 bg-gray-900 text-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl sm:text-5xl font-bold text-center mb-8 leading-tight">
              <span className="bg-gradient-to-b from-brand-400 to-brand-500 bg-clip-text text-transparent">
                Ready&nbsp;
              </span>
              <span className="bg-gradient-to-b from-white to-gray-300 bg-clip-text text-transparent">
                to Transform Your Digital Presence?
              </span>
            </h2>
            <p className="text-center text-gray-400 mb-12 max-w-2xl mx-auto">
              Because simple ideas, done right, stand out forever. Let's discuss your project and create something exceptional together.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 transition-all duration-300 font-semibold text-lg"
              >
                Start Your Project
              </Link>

              <Link
                href="/services"
                className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 font-semibold text-lg"
              >
                View All Services
              </Link>
            </div>
          </div>
        </section>
      </div>

      <Footer />

      {isDemoOpen && (
        <ServiceDemoPopup
          site={{
            title: data.title,
            description: data.description || data.overview || "",
            techs: data.technologies || [],
            url: data.demo_url || "",
            domain: "",
          }}
          onClose={() => setIsDemoOpen(false)}
        />
      )}
    </main>
  );
}