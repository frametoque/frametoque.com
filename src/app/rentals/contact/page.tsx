import type { Metadata } from "next";
import RentalContactClient from "./RentalContactClient";

export const metadata: Metadata = {
  title: "Contact Rental Desk | Frametoque Equipment Rentals",
  description: "Get in touch with the Frametoque camera and equipment rental desk in Colombo, Sri Lanka. WhatsApp hotline, phone numbers, operating hours, and equipment inquiries.",
};

export default function RentalContactPage() {
  return <RentalContactClient />;
}
