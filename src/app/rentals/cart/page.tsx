import type { Metadata } from "next";
import RentalCartClient from "./RentalCartClient";

export const metadata: Metadata = {
  title: {
    absolute: "Your Bag & Quotation | Frametoque Rental",
  },
  description: "Review your equipment rental manifest, calculate multi-day shoot rates, generate official PDF quotations, and book gear directly in Sri Lanka.",
  alternates: {
    canonical: "https://frametoque.com/rentals/cart",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function RentalCartPage() {
  return <RentalCartClient />;
}
