import type { Metadata } from "next";
import RentalContactClient from "./RentalContactClient";

export const metadata: Metadata = {
  title: {
    absolute: "Contact Us | Frametoque Rentals",
  },
  description: "Get in touch with the Frametoque camera and equipment rental desk in Colombo, Sri Lanka. WhatsApp hotline +94 70 277 1361, gear pickup location, and registration info.",
  alternates: {
    canonical: "https://frametoque.com/rentals/contact",
  },
  openGraph: {
    title: "Contact Us | Frametoque Rentals",
    description: "WhatsApp hotline +94 70 277 1361, phone numbers, operating hours, and equipment pickup in Piliyandala, Colombo.",
    url: "https://frametoque.com/rentals/contact",
    siteName: "Frametoque Rentals",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Us | Frametoque Rentals",
    description: "WhatsApp hotline +94 70 277 1361. Daily camera and cinema gear hire.",
  },
  keywords: [
    "contact camera rental sri lanka",
    "frametoque rental hotline",
    "video gear hire colombo phone number",
    "camera pickup piliyandala",
    "equipment reservation whatsapp",
  ],
};

const contactJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "ContactPage",
      "@id": "https://frametoque.com/rentals/contact#webpage",
      url: "https://frametoque.com/rentals/contact",
      name: "Contact Frametoque Rentals Sri Lanka",
      description: "Contact details for camera, lens, lighting, and video production gear rental in Sri Lanka.",
    },
    {
      "@type": "LocalBusiness",
      "@id": "https://frametoque.com/rentals#store",
      name: "Frametoque Rentals Sri Lanka",
      url: "https://frametoque.com/rentals",
      telephone: "+94702771361",
      email: "info@frametoque.com",
      address: {
        "@type": "PostalAddress",
        streetAddress: "35, Kopiwaththa Road",
        addressLocality: "Piliyandala",
        addressRegion: "Western Province",
        addressCountry: "LK",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: 6.7978,
        longitude: 79.9238,
      },
      openingHoursSpecification: [
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
          opens: "08:00",
          closes: "21:00",
        },
      ],
    },
  ],
};

export default function RentalContactPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactJsonLd) }}
      />
      <RentalContactClient />
    </>
  );
}
