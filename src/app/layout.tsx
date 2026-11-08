import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/react";
import Script from "next/script";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import SWRegister from "../lib/sw-register";
import SnowfallWrapper from "@/components/SnowfallWrapper";
import FloatingButtons from '@/components/FloatingButtons';
import type { Metadata } from 'next'
import localFont from "next/font/local";
import UmamiScript from "@/components/UmamiScript";

import SmoothScroll from "@/components/SmoothScroll";


const bricolage = localFont({
  src: "./fonts/BricolageGrotesque-Variable.ttf",
  variable: "--font-geist-sans",
  weight: "400 800",
  display: "swap",
});

const dmMono = localFont({
  src: [
    {
      path: './fonts/DMMono-Light.ttf',
      weight: '300',
      style: 'normal',
    },
    {
      path: './fonts/DMMono-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/DMMono-Medium.ttf',
      weight: '500',
      style: 'normal',
    },
  ],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL("https://frametoque.com"),

  title: {
    default: "Frametoque Digital Media"
  },
  description:
    "Frametoque Digital Media is a creative media company focused on web development, video production, and digital storytelling.",

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
    title: "Frametoque Digital Media",
    description:
      "Turning ideas into powerful digital visuals through web, video, and creative media.",
    keywords: ['Frametoque', 'Digital Media', 'Creative Services', 'Web Development', 'Graphic Design', 'Video Editing', 'Photography', 'Videography'],
    url: "https://frametoque.com",
    siteName: "Frametoque",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Frametoque Digital Media",
      },
    ],
    type: "website",
  },
    twitter: {
    card: "summary_large_image",
    title: "Frametoque Digital Media",
    description: "Turning ideas into powerful digital visuals through web, video, and creative media.",
    images: ["https://frametoque.com/og-image.png"],
  },
};

const localBusiness = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Frametoque Digital Media",
  "description": "graphic design, Video editing, photography, videography & web development",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Colombo",
    "addressCountry": "LK"
  },
  "url": "https://frametoque.com",
  "serviceArea": "Sri Lanka"
}

export default function RootLayout({ children }) {
  
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Frametoque Digital Media",
              url: "https://frametoque.com",
              logo: "https://frametoque.com/logos/ft/logo-main.png",
              sameAs: [
                "https://instagram.com/frame.toque",
                "https://linkedin.com/company/frametoque",
              ],
              founder: [
                {
                  "@type": "Person",
                  name: "Kavinu Pasandul",
                  jobTitle: "Co-Founder & Chief Executive Officer",
                  sameAs: [
                    "https://www.linkedin.com/in/kavinudigitalworks/",
                    "https://www.instagram.com/skingod.frrr/"
                  ]
                },
                {
                  "@type": "Person",
                  name: "Tharul Bandara",
                  jobTitle: "Co-Founder & Chief Executive Officer",
                  sameAs: [
                    "https://www.instagram.com/bandara.tharul/"
                  ]
                }
              ],
              employee: [
                {
                  "@type": "Person",
                  name: "Nelitha Priyawansha",
                  jobTitle: "Chief Technology Officer",
                  sameAs: [
                    "https://linkedin.com/in/itsnelitha",
                    "https://github.com/itsnelitha"
                  ]
                },
                {
                  "@type": "Person",
                  name: "Sadaka Parami",
                  jobTitle: "Head of Engineering",
                  sameAs: [
                    "https://github.com/Sadaka-Wijerathna",
                    "https://www.instagram.com/sadaka.wijerathna/"
                  ]
                },
                {
                  "@type": "Person",
                  name: "Dasindu Nimnal",
                  jobTitle: "Head of Media",
                  sameAs: [
                    "https://www.instagram.com/dazuu.jay/"
                  ]
                }
              ]
            }),
          }}
        />
      </head>

      <body suppressHydrationWarning
        className={`${bricolage.variable} ${dmMono.variable} antialiased`}
      >
        <ClerkProvider>
          <CartProvider>
            <SWRegister />
            <SmoothScroll />
            {children}
            {process.env.VERCEL ? <Analytics /> : null}
            <FloatingButtons />
            <SnowfallWrapper />
            <UmamiScript />
          </CartProvider>
        </ClerkProvider>
        
      </body>
    </html>
  );
}
