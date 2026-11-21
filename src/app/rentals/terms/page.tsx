import type { Metadata } from "next";
import RentalTermsClient from "./RentalTermsClient";

export const metadata: Metadata = {
  title: {
    absolute: "Rental Terms & Conditions | Frametoque Rental",
  },
  description: "Standard terms and conditions for camera and production equipment hire from Frametoque Rental Sri Lanka. Advance deposit, inspection, liability, and care policies.",
  alternates: {
    canonical: "https://frametoque.com/rentals/terms",
  },
  openGraph: {
    title: "Rental Terms & Conditions | Frametoque Rental",
    description: "Equipment hire policies, advance payment guidelines, inspection protocols, and liability agreements from Frametoque Rental Sri Lanka.",
    url: "https://frametoque.com/rentals/terms",
    siteName: "Frametoque Rental",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rental Terms & Conditions | Frametoque Rental",
    description: "Official equipment hire agreement and policies from Frametoque Rental Sri Lanka.",
  },
  keywords: [
    "camera rental terms sri lanka",
    "equipment hire agreement",
    "camera rental deposit policy",
    "frametoque terms and conditions",
  ],
};

const termsJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Equipment Rental Terms & Conditions",
  url: "https://frametoque.com/rentals/terms",
  description: "Terms of service and equipment rental agreement for Frametoque in Sri Lanka.",
  publisher: {
    "@type": "Organization",
    name: "Frametoque Digital Media",
    url: "https://frametoque.com",
  },
};

export default function RentalsTermsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(termsJsonLd) }}
      />
      <RentalTermsClient />
    </>
  );
}
