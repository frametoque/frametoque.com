import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/react";
import Script from "next/script";
import "./globals.css";
import SWRegister from "./sw-register";
import SnowfallWrapper from "@/components/SnowfallWrapper";
import AIChatbot from "@/components/AIChatbot";

import { Bricolage_Grotesque, DM_Mono } from "next/font/google";

const bricolage = Bricolage_Grotesque({
  variable: "--font-geist-sans", // keeps your existing CSS vars working
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const dmMono = DM_Mono({
  variable: "--font-geist-mono", // keeps your existing CSS vars working
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});


export const metadata = {
  metadataBase: new URL("https://frametoque.online"),

  title: {
    default: "Frame Toque Digital"
  },

  description:
    "Frame Toque Digital is a creative studio focused on web development, video production, and digital storytelling.",

  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180" },
    ],
  },

  manifest: "/site.webmanifest",

  appleWebApp: {
    title: "FrameToque",
  },

  openGraph: {
    title: "Frame Toque Digital",
    description:
      "Turning ideas into powerful digital visuals through web, video, and creative media.",
    url: "https://frametoque.online",
    siteName: "Frame Toque",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Frame Toque Digital",
      },
    ],
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <Script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Frame Toque Digital",
              url: "https://frametoque.online",
              logo: "https://frametoque.online/logos/ft/logo-main.png",
              sameAs: [
                "https://instagram.com/frame.toque",
                "https://linkedin.com/company/frametoque",
              ],
            }),
          }}
        />
      </head>

      <body suppressHydrationWarning
        className={`${bricolage.variable} ${dmMono.variable} antialiased`}
      >
        <ClerkProvider>
          <SWRegister />
          {children}
          <Analytics />
          <AIChatbot />
          <SnowfallWrapper />
        </ClerkProvider>
      </body>
    </html>
  );
}
