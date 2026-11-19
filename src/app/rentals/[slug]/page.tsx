import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicRentalItemById, getPublicRentals } from "../../actions/rentals-public";
import ProductDetailsClient from "./ProductDetailsClient";

export const revalidate = 60; // revalidate every 60 seconds

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { product } = await getPublicRentalItemById(slug);

  if (!product) {
    return {
      title: "Equipment Not Found | Frametoque Rentals",
    };
  }

  const formatLKR = (amount: number) =>
    new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      maximumFractionDigits: 0,
    }).format(amount || 0);

  return {
    title: `${product.item_name} Rental Sri Lanka (${formatLKR(product.daily_rate)}/day) | Frametoque`,
    description: product.description || `Rent ${product.item_name} in Colombo, Sri Lanka. Check real-time shoot date availability and book directly via WhatsApp.`,
    openGraph: {
      title: `${product.item_name} Rental | Frametoque Digital Media`,
      description: `Daily rate: ${formatLKR(product.daily_rate)}. Professional shoot-ready camera & production equipment rental.`,
      images: product.image_url ? [{ url: product.image_url }] : [],
    },
  };
}

export default async function RentalProductPage({ params }: PageProps) {
  const { slug } = await params;
  const [{ product, bookedRanges }, allProducts] = await Promise.all([
    getPublicRentalItemById(slug),
    getPublicRentals(),
  ]);

  if (!product) {
    notFound();
  }

  // Cross-sell similar items in same category or other gear
  const similarProducts = allProducts
    .filter((p) => p.id !== product.id)
    .slice(0, 4);

  return (
    <ProductDetailsClient
      product={product}
      bookedRanges={bookedRanges}
      similarProducts={similarProducts}
    />
  );
}
