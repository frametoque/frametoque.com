import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Read the privacy policy for Frametoque, detailing how we collect and handle user data when submitting projects or using our services.",
  alternates: {
    canonical: "https://frametoque.com/privacy",
  },
  openGraph: {
    title: "Privacy Policy | Frametoque Digital Productions",
    description: "Read the privacy policy for Frametoque, detailing how we collect and handle user data when submitting projects or using our services.",
    url: "https://frametoque.com/privacy", 
    siteName: "Frametoque Digital Productions",
    locale: "en_LK",
    images: [
      {
        url: "https://frametoque.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Frametoque Privacy Policy",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy | Frametoque Digital Productions",
    description: "Read the privacy policy for Frametoque, detailing how we collect and handle user data when submitting projects or using our services.",
    images: ["https://frametoque.com/og-image.png"],
  },
};

import PrivacyContent from "@/app/(legal)/privacy/privacy";


export default function Privacy() {
  return (
    <>
      <main  className="min-h-screen bg-slate-950 text-white overflow-hidden">
        <PrivacyContent />
      </main >
    </>
  );
}
