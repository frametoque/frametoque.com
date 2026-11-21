import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "Read the cookie policy for Frametoque, explaining how we use cookies and similar technologies on our website.",
  alternates: {
    canonical: "https://frametoque.com/cookies",
  },
  openGraph: {
    title: "Cookie Policy | Frametoque Digital Productions",
    description: "Read the cookie policy for Frametoque, explaining how we use cookies and similar technologies on our website.",
    url: "https://frametoque.com/cookies", 
    siteName: "Frametoque Digital Productions",
    locale: "en_LK",
    images: [
      {
        url: "https://frametoque.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Frametoque Cookie Policy",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cookie Policy | Frametoque Digital Productions",
    description: "Read the cookie policy for Frametoque, explaining how we use cookies and similar technologies on our website.",
    images: ["https://frametoque.com/og-image.png"],
  },
};

import CookiesContent from "@/app/(legal)/cookies/cookies";

export default function Cookies() { 

  return (
    <>
      <main  className="min-h-screen bg-slate-950 text-white overflow-hidden">
       
        <CookiesContent />
      </main >
    </>
  );
}
