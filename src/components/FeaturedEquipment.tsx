"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Camera,
  ArrowRight,
} from "lucide-react";
import type { PublicRentalProduct } from "@/app/actions/rentals-public";

const formatLKR = (amount: number) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(amount || 0);

interface FeaturedEquipmentProps {
  products: PublicRentalProduct[];
  categories: { category: string; count: number }[];
  /** "dark" for the main site home page, "light" for the /rentals page */
  variant?: "dark" | "light";
}

export default function FeaturedEquipment({
  products,
  categories,
  variant = "dark",
}: FeaturedEquipmentProps) {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const isDark = variant === "dark";

  // Build category tabs from the categories prop + product data
  const categoryTabs = useMemo(() => {
    const tabs: { label: string; value: string }[] = [
      { label: "All", value: "All" },
    ];

    // Use passed-in categories
    categories.forEach((cat) => {
      tabs.push({ label: cat.category, value: cat.category });
    });

    return tabs;
  }, [categories]);

  // Filter products by category
  const filtered = useMemo(() => {
    if (selectedCategory === "All") return products;
    const target = selectedCategory.toLowerCase();
    return products.filter((item) => {
      const itemCats = item.category
        .toLowerCase()
        .split(",")
        .map((c) => c.trim());
      return itemCats.some(
        (c) => c === target || c.includes(target) || target.includes(c)
      );
    });
  }, [products, selectedCategory]);

  // Show up to 8 items
  const displayProducts = filtered.slice(0, 8);

  return (
    <section
      className={`py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden ${
        isDark ? "bg-[#030303] text-white" : "bg-[#F8FAFC] text-slate-900"
      }`}
    >
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 space-y-2"
        >
          <h2
            className={`text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight ${
              isDark ? "text-white" : "text-slate-900"
            }`}
          >
            Equipment{" "}
            <span className="bg-gradient-to-b from-brand-400 to-brand-600 bg-clip-text text-transparent">
              Rentals
            </span>
          </h2>
        </motion.div>

        {/* Category Chips */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-wrap items-center justify-center gap-2 mb-10"
        >
          {categoryTabs.map((tab) => {
            const isSelected = selectedCategory === tab.value;
            return (
              <motion.button
                key={tab.value}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setSelectedCategory(tab.value)}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  isSelected
                    ? isDark
                      ? "bg-brand-600 text-white shadow-lg shadow-brand-600/30"
                      : "bg-brand-600 text-white shadow-md shadow-brand-500/20"
                    : isDark
                    ? "bg-white/10 text-gray-300 border border-white/15 hover:bg-white/20 hover:text-white"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </motion.button>
            );
          })}
        </motion.div>

        {/* Product Cards Grid */}
        {displayProducts.length === 0 ? (
          <div
            className={`p-16 text-center rounded-3xl border ${
              isDark
                ? "bg-white/5 border-white/10"
                : "bg-white border-slate-200"
            }`}
          >
            <Camera
              className={`w-10 h-10 mx-auto mb-3 ${
                isDark ? "text-gray-600" : "text-slate-300"
              }`}
            />
            <p
              className={`text-sm ${
                isDark ? "text-gray-400" : "text-slate-500"
              }`}
            >
              No equipment in this category yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {displayProducts.map((product) => {
              const displayImage = product.image_url || product.images[0];

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4 }}
                  whileHover={{ y: -6 }}
                >
                  <Link
                    href={`/rentals/${product.slug || product.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group rounded-3xl overflow-hidden flex flex-col justify-between transition-all duration-300 h-full ${
                      isDark
                        ? "bg-white/[0.04] border border-white/[0.08] hover:border-brand-500/40 hover:shadow-2xl hover:shadow-brand-500/10"
                        : "bg-white border border-slate-200/90 hover:border-brand-300 shadow-xs hover:shadow-xl"
                    }`}
                  >
                  {/* Image */}
                  <div>
                    <div className="relative aspect-square overflow-hidden">
                      {displayImage ? (
                        <img
                          src={displayImage}
                          alt={product.item_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div
                          className={`w-full h-full flex flex-col items-center justify-center ${
                            isDark ? "bg-white/5" : "bg-slate-50"
                          }`}
                        >
                          <Camera
                            className={`w-10 h-10 mb-1 ${
                              isDark ? "text-gray-700" : "text-slate-300"
                            }`}
                          />
                          <span
                            className={`text-[11px] font-medium ${
                              isDark ? "text-gray-600" : "text-slate-400"
                            }`}
                          >
                            Photo Coming Soon
                          </span>
                        </div>
                      )}

                      {/* Category Badge */}
                      <div className="absolute top-3 left-3 pointer-events-none">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-black/50 text-white backdrop-blur-md border border-white/10">
                          {product.category}
                        </span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-5 space-y-2">
                      <h3
                        className={`text-base font-bold line-clamp-1 transition-colors ${
                          isDark
                            ? "text-white group-hover:text-brand-400"
                            : "text-slate-900 group-hover:text-brand-600"
                        }`}
                      >
                        {product.item_name}
                      </h3>
                      {product.description && (
                        <p
                          className={`text-xs line-clamp-2 leading-relaxed ${
                            isDark ? "text-gray-500" : "text-slate-500"
                          }`}
                        >
                          {product.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Price & CTA */}
                  <div
                    className={`px-5 pb-5 pt-3 border-t flex items-center justify-between gap-3 ${
                      isDark ? "border-white/[0.06]" : "border-slate-100"
                    }`}
                  >
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span
                          className={`text-base font-extrabold ${
                            isDark ? "text-white" : "text-slate-900"
                          }`}
                        >
                          {formatLKR(product.daily_rate)}
                        </span>
                        <span
                          className={`text-[11px] font-normal ${
                            isDark ? "text-gray-500" : "text-slate-500"
                          }`}
                        >
                          / day
                        </span>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-colors ${
                        isDark
                          ? "bg-white/10 hover:bg-brand-600 text-white border border-white/15"
                          : "bg-slate-900 hover:bg-brand-600 text-white"
                      }`}
                    >
                      <span>View</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

        {/* View All CTA */}
        <div className="text-center mt-12">
          <Link
            href="/rentals"
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-semibold transition-all duration-300 shadow-lg group/cta ${
              isDark
                ? "bg-gradient-to-r from-brand-600 to-brand-500 text-white hover:from-brand-500 hover:to-brand-400 hover:shadow-brand-500/30"
                : "bg-brand-600 text-white hover:bg-brand-500 hover:shadow-brand-500/25"
            }`}
          >
            <span>Browse All Equipment</span>
            <ArrowRight className="w-4 h-4 group-hover/cta:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}
