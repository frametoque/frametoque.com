import type { Metadata } from "next";
import RentalTermsClient from "./RentalTermsClient";

export const metadata: Metadata = {
  title: "Equipment Rental Terms & Conditions | Frametoque Digital Media",
  description: "Standard terms and conditions for equipment hire from Frametoque Digital Media in Sri Lanka. Rental period, security deposit, inspection, liability, and care policies.",
};

export default function RentalsTermsPage() {
  return <RentalTermsClient />;
}
