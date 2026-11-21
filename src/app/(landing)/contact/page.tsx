import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "Contact Frametoque | Inquiries & Booking",
  },
  description:
    "Get in touch with Frametoque Digital Productions. Reach out for web development, software engineering, commercial media productions, camera gear rentals, or careers.",
  alternates: {
    canonical: "https://frametoque.com/contact",
  },
  keywords: [
    "Contact Frametoque",
    "Frametoque Phone Number",
    "Hire Web Developer Sri Lanka",
    "Book Videographer Colombo",
    "Frametoque Location Colombo",
    "Frametoque Email",
  ],
  openGraph: {
    title: "Contact Frametoque | Inquiries & Booking",
    description:
      "Departmental directory and direct contact details for Frametoque Digital Productions.",
    url: "https://frametoque.com/contact",
    siteName: "Frametoque Digital Productions",
    locale: "en_LK",
    images: [
      {
        url: "https://frametoque.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Contact Frametoque Digital Productions",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Frametoque | Inquiries & Booking",
    description:
      "Departmental directory and direct contact details for Frametoque Digital Productions.",
    images: ["https://frametoque.com/og-image.png"],
    site: "@Frametoque",
    creator: "@Frametoque",
  },
};

import Contact from "@/components/Contact";

export default function ProjectsOut() {
  return (
    <>
    <main  className="min-h-screen bg-slate-950 text-white overflow-hidden">
      <Contact />
    </main >
    </>
  );
}
