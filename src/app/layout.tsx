import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/react";
import Script from "next/script";
import "./globals.css";
import SWRegister from "../lib/sw-register";
import SnowfallWrapper from "@/components/SnowfallWrapper";
import FloatingButtons from '@/components/FloatingButtons';

import { Bricolage_Grotesque, DM_Mono } from "next/font/google";
//import localFont from "next/font/local";

const bricolage = Bricolage_Grotesque({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const dmMono = DM_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

// const aestera = localFont({
//   src: "./fonts/aestera.ttf",
//   variable: "--font-geist-sans",
// });

export const metadata = {
  metadataBase: new URL("https://frametoque.online"),

  title: {
    default: "FrameToque Digital Media Media"
  },
  description:
    "FrameToque Digital Media is a creative media company focused on web development, video production, and digital storytelling.",

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
    title: "Frametoque",
  },

  openGraph: {
    title: "FrameToque Digital Media",
    description:
      "Turning ideas into powerful digital visuals through web, video, and creative media.",
    url: "https://frametoque.online",
    siteName: "Frametoque",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "FrameToque Digital Media",
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
              name: "FrameToque Digital Media",
              url: "https://frametoque.online",
              logo: "https://frametoque.online/logos/ft/logo-main.png",
              sameAs: [
                "https://instagram.com/frametoque",
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
          <FloatingButtons />
          <SnowfallWrapper />
        </ClerkProvider>
      </body>
    </html>
  );
}
