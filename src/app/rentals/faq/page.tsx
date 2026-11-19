import type { Metadata } from "next";
import RentalFAQClient from "./RentalFAQClient";

export const metadata: Metadata = {
  title: "Equipment Rental FAQ | Frametoque Digital Media",
  description: "Frequently asked questions about hiring cinema cameras, lenses, lighting, and audio equipment from Frametoque in Sri Lanka. Booking, verification, and deposit info.",
};

export default function RentalsFAQPage() {
  return <RentalFAQClient />;
}
