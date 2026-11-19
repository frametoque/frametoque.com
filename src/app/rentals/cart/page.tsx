import type { Metadata } from "next";
import RentalCartClient from "./RentalCartClient";

export const metadata: Metadata = {
  title: "Your Shoot Bag & Quotation | Frametoque Rentals",
  description: "Review your equipment rental manifest, calculate multi-day shoot rates, generate official PDF quotations, and book gear directly.",
};

export default function RentalCartPage() {
  return <RentalCartClient />;
}
