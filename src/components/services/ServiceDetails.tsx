"use client";

import { useState, useEffect, useMemo } from "react";
import { Check, Star, ArrowRight, Zap, Shield, Clock, Users, Palette, Layers, Repeat, TrendingUp, Video, Film, Volume2, Share2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import servicesData from "@/components/services/data/servicesData";

const protectImage = (e) => e.preventDefault();

const getIconComponent = (iconName) => {
    switch (iconName) {
        case 'Zap': return <Zap className="w-6 h-6" />;
        case 'Clock': return <Clock className="w-6 h-6" />;
        case 'Shield': return <Shield className="w-6 h-6" />;
        case 'Users': return <Users className="w-6 h-6" />;
        case 'Palette': return <Palette className="w-6 h-6" />;
        case 'Layers': return <Layers className="w-6 h-6" />;
        case 'Repeat': return <Repeat className="w-6 h-6" />;
        case 'TrendingUp': return <TrendingUp className="w-6 h-6" />;
        case 'Video': return <Video className="w-6 h-6" />;
        case 'Film': return <Film className="w-6 h-6" />;
        case 'Volume2': return <Volume2 className="w-6 h-6" />;
        case 'Share2': return <Share2 className="w-6 h-6" />;
        default: return <Zap className="w-6 h-6" />;
    }
};



export default function ServiceDataPage({ serviceType = "portfolio-websites" }) {
    const [scrolled, setScrolled] = useState(false);
    const [currency, setCurrency] = useState("LKR");
    const [convertedPackages, setConvertedPackages] = useState([]);

    // Find the service by ID from the webData array
    const data = useMemo(() => {
        if (!servicesData || !Array.isArray(servicesData)) {
            console.error("servicesData is not an array:", servicesData);
            console.log("serviceType passed:", serviceType);
            console.log("Available services:", servicesData?.map(s => s.id));
            return null;
        }
        return servicesData.find(service => service.id === serviceType);
    }, [serviceType]);

    const originalPackages = useMemo(() => {
        return data?.packages || [];
    }, [data]);

    useEffect(() => {
        function handleScroll() {
            setScrolled(window.scrollY > 50);
        }

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);


    const parsePrice = (priceString) => {
        if (!priceString) return 0;
        const numericString = priceString.toString().replace(/[^0-9.-]/g, '');
        return parseFloat(numericString) || 0;
    };

    const formatPrice = (price, currency) => {
        const priceNumber = typeof price === 'number' ? price : parseFloat(price);

        if (isNaN(priceNumber)) return '0';

        if (currency === "USD") {
            return priceNumber.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        } else {
            return priceNumber.toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            });
        }
    };


const convertPricesToUSD = async (packages) => {
    try {
        const res = await fetch("https://open.er-api.com/v6/latest/LKR");
        const rateData = await res.json();
        const rate = rateData.rates.USD;

        console.log("Exchange rate used:", rate);

        return packages.map(pkg => {
            const priceInLKR = parseFloat(pkg.numericPrice) || parsePrice(pkg.price) || 0;
            const priceInUSD = priceInLKR * rate;

            return {
                ...pkg,
                price: priceInUSD.toFixed(2),
                convertedPrice: priceInUSD.toFixed(2),
                originalPrice: priceInLKR,
                isUSD: true
            };
        });
    } catch (error) {
        console.error("Error converting to USD:", error);
        return packages;
    }
};

// currency detection
function detectCurrency() {
    const saved = localStorage.getItem('preferred_currency') || 'LKR';

    if (saved === 'USD') {
        convertPricesToUSD(originalPackages).then((converted) => {
            setConvertedPackages(converted);
            setCurrency('USD');
        });
    } else {
        setConvertedPackages(originalPackages);
        setCurrency('LKR');
    }
}

useEffect(() => {
    if (originalPackages.length === 0) return;

    detectCurrency();

    const handler = (e) => {
        const { currency } = e.detail;
        if (currency === 'USD') {
            convertPricesToUSD(originalPackages).then((converted) => {
                setConvertedPackages(converted);
                setCurrency('USD');
            });
        } else {
            setConvertedPackages(originalPackages);
            setCurrency('LKR');
        }
    };

    window.addEventListener('currencyChange', handler);
    return () => window.removeEventListener('currencyChange', handler);

}, [originalPackages]);
// currency detection end

const displayPackages = convertedPackages.length > 0 ? convertedPackages : originalPackages;

    if (!data) {
        return (
            <main className="min-h-screen bg-slate-950 text-white overflow-hidden">
                <Navbar scrolled={scrolled} />
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <h1 className="text-4xl font-bold mb-4">Service Not Found</h1>
                        <p className="text-gray-400 mb-8">
                            The requested service "{serviceType}" could not be found.
                            <br />
                            Available services: {servicesData?.map(s => s.id).join(", ")}
                        </p>
                        <Link
                            href="/services"
                            className="inline-flex items-center px-6 py-3 rounded-lg bg-brand-500 hover:bg-brand-600 transition-colors"
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
        <main className="min-h-screen bg-slate-950 text-white overflow-hidden">
            <Navbar scrolled={scrolled} />

            {/* Pulse Effects removed */}

            <div>
                <section className="relative overflow-hidden pt-24 pb-16 px-4 sm:px-6 lg:px-8">
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 via-transparent to-transparent" />
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

                                <div className="space-y-6">
                                    <p className="text-lg text-brand-300">
                                        {data.overview}
                                    </p>

                                    <div className="flex flex-wrap gap-4">
                                        <Link
                                            href="/contact"
                                            className="inline-flex items-center px-8 py-4 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 transition-all duration-300 font-semibold text-lg group"
                                        >
                                            Custom Quote
                                            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </Link>

                                        <Link
                                            href="#packages"
                                            className="inline-flex items-center px-8 py-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 font-semibold text-lg"
                                        >
                                            View Packages
                                        </Link>
                                    </div>
                                </div>
                            </div>

                            <div className="relative">
                                <div className="hidden sm:block h-20" />
                                <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-1 sm:p-1 lg:p-1">
                                    <div className="absolute -top-4 -right-4 w-24 h-24 bg-brand-500/20 rounded-full blur-xl" />
                                    <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-brand-500/20 rounded-full blur-xl" />
                                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
                                        <Image
                                            src={data.heroImage || "/services/eventpulse.png"}
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

                <section id="packages" className="py-16 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                                Tailored <span className="text-brand-400">Packages</span>
                            </h2>
                            <p className="text-gray-400 max-w-2xl mx-auto">
                                Choose the perfect package for your business needs. All packages include our premium design and development standards.
                            </p>
                        </div>

                       
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {displayPackages.map((pkg, index) => (
                                    <div
                                        key={index}
                                        className={`relative bg-slate-900/50 backdrop-blur-sm border rounded-2xl p-8 transition-all duration-300 hover:scale-[1.02] flex flex-col h-full ${pkg.popular
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
                                                    {pkg.price}
                                                </span>
                                                <span className="text-gray-400">{currency}</span>
                                            </div>
                                            <div className="text-sm text-gray-500">{pkg.duration}</div>
                                        </div>

                                        <ul className="space-y-3 mb-8 flex-grow">
                                            {pkg.features && pkg.features.map((feature, idx) => (
                                                <li key={idx} className="flex items-start space-x-3">
                                                    <Check className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
                                                    <span className="text-gray-300">{feature}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        <Link
                                            href="/contact"
                                            className={`text-center w-full py-3 px-6 rounded-lg font-semibold transition-all duration-300 mt-auto ${pkg.popular
                                                ? "bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700"
                                                : "bg-white/5 border border-white/10 hover:bg-white/10"
                                                }`}
                                        >
                                            {pkg.cta || "Get Started"}
                                        </Link>
                                    </div>
                                ))}
                            </div>
                       
                    </div>
                </section>

                <section className="py-16 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {data.features && data.features.map((feature, index) => (
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
                            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-0.5 bg-gradient-to-b from-brand-500/30 via-brand-500/20 to-transparent hidden lg:block" />

                            <div className="space-y-12 lg:space-y-0">
                                {data.process && data.process.map((step, index) => (
                                    <div
                                        key={index}
                                        className={`relative lg:flex lg:items-center lg:justify-between ${index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
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
                            {data.technologies && data.technologies.map((tech, index) => (
                                <div
                                    key={index}
                                    className="px-6 py-3 rounded-full bg-slate-900/50 border border-slate-800 hover:border-brand-500/50 hover:bg-brand-500/10 transition-all duration-300"
                                >
                                    <span className="text-gray-300 font-medium">{tech}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

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
                            <div className="bg-gradient-to-br from-slate-900/50 to-brand-900/20 border border-slate-800 rounded-2xl p-8">
                                <div className="flex items-center mb-6">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-600/20 border border-brand-500/30 flex items-center justify-center mr-4">
                                        <span className="text-2xl">🎯</span>
                                    </div>
                                    <h3 className="text-2xl font-bold">Strategic Approach</h3>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-start space-x-3">
                                        <Check className="w-5 h-5 text-brand-400 flex-shrink-0 mt-1" />
                                        <div>
                                            <h4 className="font-semibold mb-1">Goal-Oriented Planning</h4>
                                            <p className="text-gray-400 text-sm">Every project starts with clear business objectives and measurable KPIs</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start space-x-3">
                                        <Check className="w-5 h-5 text-brand-400 flex-shrink-0 mt-1" />
                                        <div>
                                            <h4 className="font-semibold mb-1">Market Analysis</h4>
                                            <p className="text-gray-400 text-sm">Understanding your competitive landscape and target audience</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start space-x-3">
                                        <Check className="w-5 h-5 text-brand-400 flex-shrink-0 mt-1" />
                                        <div>
                                            <h4 className="font-semibold mb-1">ROI-Focused Solutions</h4>
                                            <p className="text-gray-400 text-sm">Solutions designed to maximize return on your investment</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-slate-900/50 to-purple-900/20 border border-slate-800 rounded-2xl p-8">
                                <div className="flex items-center mb-6">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 flex items-center justify-center mr-4">
                                        <span className="text-2xl">🤝</span>
                                    </div>
                                    <h3 className="text-2xl font-bold">Collaborative Partnership</h3>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-start space-x-3">
                                        <Check className="w-5 h-5 text-purple-400 flex-shrink-0 mt-1" />
                                        <div>
                                            <h4 className="font-semibold mb-1">Transparent Communication</h4>
                                            <p className="text-gray-400 text-sm">Regular updates, clear milestones, and open feedback loops</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start space-x-3">
                                        <Check className="w-5 h-5 text-purple-400 flex-shrink-0 mt-1" />
                                        <div>
                                            <h4 className="font-semibold mb-1">Your Vision, Our Expertise</h4>
                                            <p className="text-gray-400 text-sm">We blend your business insights with our technical expertise</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start space-x-3">
                                        <Check className="w-5 h-5 text-purple-400 flex-shrink-0 mt-1" />
                                        <div>
                                            <h4 className="font-semibold mb-1">Flexible Collaboration</h4>
                                            <p className="text-gray-400 text-sm">Adapt to your preferred communication and decision-making style</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 text-center">
                                <div className="text-3xl font-bold bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent mb-2">
                                    95%
                                </div>
                                <p className="text-gray-400 text-sm">Client Satisfaction Rate</p>
                            </div>
                            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 text-center">
                                <div className="text-3xl font-bold bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent mb-2">
                                    40%+
                                </div>
                                <p className="text-gray-400 text-sm">Average Performance Improvement</p>
                            </div>
                            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 text-center">
                                <div className="text-3xl font-bold bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent mb-2">
                                    100%
                                </div>
                                <p className="text-gray-400 text-sm">On-Time Delivery</p>
                            </div>
                            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 text-center">
                                <div className="text-3xl font-bold bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent mb-2">
                                    24/7
                                </div>
                                <p className="text-gray-400 text-sm">Post-Launch Support</p>
                            </div>
                        </div>

                        <div className="mt-12 bg-gradient-to-br from-slate-900/50 to-slate-800/20 border border-slate-800 rounded-2xl p-8">
                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-bold mb-4">Why Clients Trust Us</h3>
                                <p className="text-gray-400 max-w-2xl mx-auto">
                                    Beyond technical skills, we build relationships based on trust, reliability, and shared success.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="text-center p-4">
                                    <div className="w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mx-auto mb-4">
                                        <Shield className="w-8 h-8 text-brand-400" />
                                    </div>
                                    <h4 className="font-semibold mb-2">Commitment to Quality</h4>
                                    <p className="text-gray-400 text-sm">Rigorous quality assurance at every project stage</p>
                                </div>
                                <div className="text-center p-4">
                                    <div className="w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mx-auto mb-4">
                                        <Clock className="w-8 h-8 text-brand-400" />
                                    </div>
                                    <h4 className="font-semibold mb-2">Timely Delivery</h4>
                                    <p className="text-gray-400 text-sm">Respect for deadlines without compromising quality</p>
                                </div>
                                <div className="text-center p-4">
                                    <div className="w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mx-auto mb-4">
                                        <Users className="w-8 h-8 text-brand-400" />
                                    </div>
                                    <h4 className="font-semibold mb-2">Long-term Partnership</h4>
                                    <p className="text-gray-400 text-sm">Ongoing support and guidance beyond project completion</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

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
        </main>
    );
}