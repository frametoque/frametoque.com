import type { Metadata } from "next";
import RentalFAQClient from "./RentalFAQClient";

export const metadata: Metadata = {
  title: {
    absolute: "Equipment Rental FAQ | Frametoque Rentals",
  },
  description: "Frequently asked questions about hiring cinema cameras, lenses, lighting, and audio equipment from Frametoque Rentals Sri Lanka. Booking, verification, and deposit info.",
  alternates: {
    canonical: "https://frametoque.com/rentals/faq",
  },
  openGraph: {
    title: "Equipment Rental FAQ | Frametoque Rentals",
    description: "Answers about equipment hire, verification requirements, security deposits, and gear pickups in Colombo from Frametoque Rentals Sri Lanka.",
    url: "https://frametoque.com/rentals/faq",
    siteName: "Frametoque Rentals",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Equipment Rental FAQ | Frametoque Rentals",
    description: "Clear answers on camera gear hire, shoot dates, verification, and rates from Frametoque Rentals Sri Lanka.",
  },
  keywords: [
    "camera rental faq sri lanka",
    "equipment hire verification requirements",
    "advance payment rental sri lanka",
    "camera hire colombo rules",
    "sony fx3 rental deposit",
  ],
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How do I check equipment availability and make a reservation?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Browse our catalog on /rentals, select the gear you need, pick your shoot date(s) using the live date checker, and click 'Book via WhatsApp'. Our rental team will instantly confirm availability, reserve the gear, and guide you through the pickup process.",
      },
    },
    {
      "@type": "Question",
      name: "How far in advance should I reserve equipment?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We recommend reserving at least 2 to 4 days ahead, particularly for weekends and commercial shoot dates when high-demand cameras (e.g. Sony FX3) and cinema prime lenses book out quickly.",
      },
    },
    {
      "@type": "Question",
      name: "Can I extend my rental while on shoot?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, provided the gear has not already been reserved by another client for the subsequent days. Please notify us via WhatsApp as early as possible so we can confirm the extension and adjust your booking.",
      },
    },
    {
      "@type": "Question",
      name: "What details and documents are required for registration?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Please provide the following details for registration: 1. Both sides of NIC, 2. Personal Facebook Profile, 3. Home contact number, 4. Home address and location, 5. Utility bill (Electricity or Telephone) to confirm address, 6. Facebook page (Need to see your works).",
      },
    },
    {
      "@type": "Question",
      name: "Do I need to pay an advance payment to confirm my booking?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. You must pay half (50%) amount of advance payment to confirm the booking. Note: Advance payment is non-refundable and that advance payment is not valid for another booking.",
      },
    },
    {
      "@type": "Question",
      name: "Where is pickup and return located?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Equipment is collected and returned at 35, Kopiwaththa Road, Piliyandala. Our rental desk operates daily from 8:00 AM to 9:00 PM by appointment.",
      },
    },
    {
      "@type": "Question",
      name: "What defines a 24-hour rental day?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A standard 1-day rental covers 24 hours from pickup to return (for example, checkout at 9:00 AM today and return by 9:00 AM the following morning). Flexible pickup windows can be coordinated via WhatsApp.",
      },
    },
    {
      "@type": "Question",
      name: "What condition is the equipment in?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "All equipment is maintained to professional standards. Optical elements are pristine, sensors are cleaned, firmware is updated, and batteries are fully charged prior to handover.",
      },
    },
  ],
};

export default function RentalsFAQPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <RentalFAQClient />
    </>
  );
}
