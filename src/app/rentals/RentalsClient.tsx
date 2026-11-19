"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Search, 
  Camera, 
  MessageCircle, 
  X, 
  ChevronDown, 
  Grid3X3, 
  Images as ImagesIcon,
  ArrowRight
} from "lucide-react";
import type { PublicRentalProduct } from "../actions/rentals-public";
import { normalizeRentalCategory } from "@/lib/categories";

const formatLKR = (amount: number) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(amount || 0);

interface RentalsClientProps {
  initialProducts: PublicRentalProduct[];
  categories: { category: string; count: number }[];
  initialCategory?: string;
}

export default function RentalsClient({ initialProducts, categories, initialCategory }: RentalsClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || "All");
  const [sortBy, setSortBy] = useState<"price-asc" | "price-desc">("price-asc");
  const catalogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory]);

  const handleHeroSearch = () => {
    catalogRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Filter and sort items
  const filteredProducts = useMemo(() => {
    let list = [...initialProducts];

    // Category filter
    if (selectedCategory !== "All") {
      const targetCat = normalizeRentalCategory(selectedCategory).toLowerCase().trim();
      list = list.filter((item) => {
        const itemCats = item.category
          .split(",")
          .map((c) => normalizeRentalCategory(c).toLowerCase().trim());
        if (targetCat === "mounts & tripods") {
          return (
            itemCats.includes("mounts & tripods") ||
            item.category.toLowerCase().includes("mount") ||
            item.category.toLowerCase().includes("tripod")
          );
        }
        return itemCats.some((c) => c === targetCat || c.includes(targetCat) || targetCat.includes(c));
      });
    }

    // Search query filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.item_name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          normalizeRentalCategory(item.category).toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q))
      );
    }

    // Sorting by price
    list.sort((a, b) => {
      if (sortBy === "price-desc") {
        return b.daily_rate - a.daily_rate || a.item_name.localeCompare(b.item_name);
      }
      return a.daily_rate - b.daily_rate || a.item_name.localeCompare(b.item_name);
    });

    return list;
  }, [initialProducts, selectedCategory, searchTerm, sortBy]);

  // Aggregate category tabs
  const categoryTabs = useMemo(() => {
    const tabs = [{ label: "All", value: "All" }];
    
    const standardCategories = ["Camera", "Lens", "Lighting", "Audio", "Drone", "Gimbal", "Mounts & Tripods", "Accessories"];
    const foundSet = new Set<string>();

    initialProducts.forEach((item) => {
      item.category.split(",").forEach((cat) => {
        const trimmed = normalizeRentalCategory(cat);
        if (trimmed) foundSet.add(trimmed);
      });
    });

    standardCategories.forEach((sc) => {
      const scNorm = normalizeRentalCategory(sc).toLowerCase();
      if (initialProducts.some((p) => {
        const pCats = p.category.split(",").map((c) => normalizeRentalCategory(c).toLowerCase());
        return (
          pCats.includes(scNorm) ||
          ((p.category.toLowerCase().includes("mount") || p.category.toLowerCase().includes("tripod")) && scNorm === "mounts & tripods")
        );
      })) {
        tabs.push({ label: sc, value: sc });
        foundSet.delete(sc);
      }
    });

    foundSet.forEach((cat) => {
      tabs.push({ label: cat, value: cat });
    });

    return tabs;
  }, [initialProducts]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-14 pb-20 space-y-10 sm:space-y-12">
      {/* SaaS-Style Clean Hero Header */}
      <div className="text-center max-w-3xl mx-auto space-y-5">
        {/* Hero Title */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: "easeOut" }}
          className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.12]"
        >
          Camera &amp; equipment rentals in one place<span className="text-brand-600">.</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.14, ease: "easeOut" }}
          className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed"
        >
          Cinema cameras, prime lenses, lighting, audio gear, and mounts — all tested, verified, and ready for your next shoot.
        </motion.p>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          className="flex flex-wrap items-center justify-center gap-3 pt-1"
        >
          <button
            type="button"
            onClick={() => catalogRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold shadow-md shadow-brand-600/20 transition-all active:scale-95 cursor-pointer"
          >
            <span>Browse Equipment</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <Link
            href="/rentals/terms"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white hover:bg-slate-50 text-slate-800 hover:text-brand-700 text-sm font-semibold border border-slate-200 hover:border-brand-300 shadow-xs transition-all active:scale-95"
          >
            <span>Terms &amp; Conditions</span>
          </Link>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25, ease: "easeOut" }}
          className="w-full pt-4 max-w-4xl mx-auto"
        >
          <div className="flex flex-col sm:flex-row items-stretch bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/90 overflow-hidden">
            {/* Search Input */}
            <div className="relative flex-1 min-w-0">
              <Search className="w-4.5 h-4.5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleHeroSearch(); }}
                placeholder="Search cameras, lenses, lighting, audio..."
                className="w-full pl-11 pr-10 py-3.5 sm:py-4 bg-transparent text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none border-b sm:border-b-0 sm:border-r border-slate-200"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Dropdown */}
            <div className="relative min-w-[190px]">
              <Grid3X3 className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full h-full pl-11 pr-10 py-3.5 sm:py-4 bg-transparent text-sm text-slate-700 font-medium appearance-none focus:outline-none border-b sm:border-b-0 sm:border-r border-slate-200 cursor-pointer"
              >
                <option value="All">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.category} value={cat.category}>
                    {cat.category}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Search Button */}
            <button
              type="button"
              onClick={handleHeroSearch}
              className="px-8 py-3.5 sm:py-4 bg-brand-600 hover:bg-brand-500 text-white text-sm sm:text-base font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2 shrink-0 active:scale-[0.98]"
            >
              <Search className="w-4 h-4" />
              <span>Search</span>
            </button>
          </div>
        </motion.div>
      </div>

      {/* Main Catalog Section */}
      <section ref={catalogRef} className="space-y-6 pt-2">

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {categoryTabs.map((tab) => {
            const isSelected = selectedCategory === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setSelectedCategory(tab.value)}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Catalog Toolbar: Results Count & Sort */}
        <div className="flex items-center justify-between pt-2 border-b border-slate-200 pb-3">
          <div className="text-xs font-medium text-slate-500">
            {filteredProducts.length === 1 ? "1 item available" : `${filteredProducts.length} items available`}
            {(selectedCategory !== "All" || searchTerm) && (
              <button
                onClick={() => {
                  setSelectedCategory("All");
                  setSearchTerm("");
                }}
                className="ml-2.5 text-brand-600 hover:underline cursor-pointer"
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              id="rental-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer shadow-xs"
            >
              <option value="price-asc">Sort by Price: Low to High</option>
              <option value="price-desc">Sort by Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Product Cards Grid */}
        {filteredProducts.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
            <Camera className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No equipment found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No items match your selected filters. Try searching for another item or clear your search query.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCategory("All");
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
              <a
                href="https://wa.me/94702771361?text=Hi%20Frametoque%2C%20I'm%20looking%20for%20specific%20equipment%20not%20listed%20in%20your%20rentals%20catalog."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Ask on WhatsApp</span>
              </a>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => {
              const displayImage = product.image_url || product.images[0];

              return (
                <Link
                  key={product.id}
                  href={`/rentals/${product.slug || product.id}`}
                  className="group bg-white rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-pointer"
                >
                  <div>
                    {/* Image Area */}
                    <div className="relative aspect-square bg-slate-100 overflow-hidden">
                      {displayImage ? (
                        <img
                          src={displayImage}
                          alt={product.item_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">
                          <Camera className="w-8 h-8" />
                        </div>
                      )}

                      {/* Multiple Photos Indicator */}
                      {product.images.length > 1 && (
                        <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-black/60 text-white backdrop-blur-md flex items-center gap-1 pointer-events-none">
                          <ImagesIcon className="w-3 h-3" />
                          <span>{product.images.length}</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-1.5">
                      <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
                        {product.category}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-1">
                        {product.item_name}
                      </h3>
                      {product.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed pt-0.5">
                          {product.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom: Price */}
                  <div className="px-4 pb-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-baseline gap-1">
                      <span className="text-base font-extrabold text-slate-900">
                        {formatLKR(product.daily_rate)}
                      </span>
                      <span className="text-xs text-slate-500 font-normal">/ day</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}
