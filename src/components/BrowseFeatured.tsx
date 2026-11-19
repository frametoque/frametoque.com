"use client";

import Link from "next/link";
import { Camera, ArrowRight } from "lucide-react";
import type { PublicRentalProduct } from "@/app/actions/rentals-public";

const formatLKR = (amount: number) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(amount || 0);

interface BrowseFeaturedProps {
  products: PublicRentalProduct[];
}

export default function BrowseFeatured({ products }: BrowseFeaturedProps) {
  // Show up to 6 items
  const featured = products.slice(0, 6);

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#030303] text-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header Row */}
        <div className="flex items-end justify-between gap-4 mb-10">
          <div className="space-y-1">
            <p className="text-sm font-semibold tracking-wide text-brand-400">
              Our Featured Items
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
              <span className="bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
                Browse Featured Cameras
              </span>
            </h2>
          </div>
          <Link
            href="/rentals"
            className="shrink-0 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold shadow-lg shadow-brand-600/20 transition-all duration-300 hover:shadow-brand-500/30 active:scale-95"
          >
            <span>View All</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Horizontal scrollable product row */}
        <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory -mx-1 px-1">
          {featured.map((product) => {
            const displayImage = product.image_url || product.images[0];

            return (
              <Link
                key={product.id}
                href={`/rentals/${product.slug || product.id}`}
                className="group snap-start shrink-0 w-[260px] sm:w-[280px] rounded-2xl overflow-hidden bg-white/[0.04] border border-white/[0.08] hover:border-brand-500/40 transition-all duration-300 hover:shadow-2xl hover:shadow-brand-500/10 hover:-translate-y-1"
              >
                {/* Image */}
                <div className="relative aspect-[4/3] overflow-hidden bg-white/[0.03]">
                  {displayImage ? (
                    <img
                      src={displayImage}
                      alt={product.item_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <Camera className="w-10 h-10 mb-1 text-gray-700" />
                      <span className="text-[11px] font-medium text-gray-600">
                        Photo Coming Soon
                      </span>
                    </div>
                  )}
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-black/50 text-white backdrop-blur-md border border-white/10">
                    {product.category}
                  </span>
                </div>

                {/* Info */}
                <div className="p-4 space-y-2">
                  <h3 className="text-sm font-bold text-white group-hover:text-brand-400 transition-colors line-clamp-1">
                    {product.item_name}
                  </h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-extrabold text-white">
                      {formatLKR(product.daily_rate)}
                    </span>
                    <span className="text-[11px] text-gray-500">/ day</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
