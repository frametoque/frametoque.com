import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "Read the terms and conditions for using Frametoque's digital engineering, media productions, and rental services.",
  alternates: {
    canonical: "https://frametoque.com/terms",
  },
  openGraph: {
    title: "Terms & Conditions | Frametoque Digital Productions",
    description: "Read the terms and conditions for using Frametoque's digital engineering, media productions, and rental services.",
    url: "https://frametoque.com/terms", 
    siteName: "Frametoque Digital Productions",
    locale: "en_LK",
    images: [
      {
        url: "https://frametoque.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Frametoque Terms & Conditions",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms & Conditions | Frametoque Digital Productions",
    description: "Read the terms and conditions for using Frametoque's digital engineering, media productions, and rental services.",
    images: ["https://frametoque.com/og-image.png"],
  },
};

import TermsContent from "@/app/(legal)/terms/terms";


export default function Terms() {
  return (
    <>
    <main  className="min-h-screen bg-slate-950 text-white overflow-hidden">
    <TermsContent />
  </main >
  </>
  );
}
