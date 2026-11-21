import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "About Frametoque | Creative Engineering & Media Production",
  },
  description:
    "Learn about Frametoque Digital Productions, our vision, and our two specialized operational arms: Frametoque Digital (Web & Software) and Frametoque Productions (Cinematic Media & Rentals).",
  alternates: {
    canonical: "https://frametoque.com/about",
  },
  keywords: [
    "About Frametoque",
    "Frametoque Digital Productions",
    "Creative Tech Company Sri Lanka",
    "Media Production Studio Colombo",
    "Digital Agency Sri Lanka",
    "Frametoque Story",
  ],
  openGraph: {
    title: "About Frametoque | Creative Engineering & Media Production",
    description:
      "Learn about Frametoque Digital Productions and our specialized creative engineering and media production arms.",
    url: "https://frametoque.com/about",
    siteName: "Frametoque Digital Productions",
    locale: "en_LK",
    images: [
      {
        url: "https://frametoque.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "About Frametoque Digital Productions",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About Frametoque | Creative Engineering & Media Production",
    description:
      "Learn about Frametoque Digital Productions and our creative engineering and media arms.",
    images: ["https://frametoque.com/og-image.png"],
    site: "@Frametoque",
    creator: "@Frametoque",
  },
};

import About from "@/components/about/About";

export default function AboutOut() {

  return (
    <>
    <main  className="min-h-screen bg-slate-950 text-white overflow-hidden">
      <About />
    </main >
    </>
  );
}