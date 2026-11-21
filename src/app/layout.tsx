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
import SessionKeepAlive from "@/components/auth/SessionKeepAlive";


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
    default: "Frametoque Digital Productions",
    template: "%s | Frametoque Digital Productions",
  },
  description:
    "Frametoque Digital Productions is a creative engineering and media production company comprising two core arms: Frametoque Digital (including Framebooks Cloud ERP) and Frametoque Productions (including Frametoque Rentals).",

  keywords: [
    "Frametoque",
    "Frametoque Digital Productions",
    "Frametoque Digital",
    "Frametoque Productions",
    "Frametoque Rentals",
    "Framebooks",
    "Web Development Sri Lanka",
    "UI/UX Design Agency",
    "Graphic Design Colombo",
    "Video Editing Sri Lanka",
    "Animations and VFX",
    "Photography Colombo",
    "Cinematography Sri Lanka",
    "Drone Cinematography",
    "Camera Equipment Rental Sri Lanka",
  ],

  authors: [{ name: "Frametoque Digital Productions", url: "https://frametoque.com" }],
  creator: "Frametoque Digital Productions",
  publisher: "Frametoque Digital Productions",

  formatDetection: {
    email: true,
    address: true,
    telephone: true,
  },

  alternates: {
    canonical: "https://frametoque.com",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

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
    title: "Frametoque Digital Productions",
    description:
      "Turning ideas into powerful digital experiences through web engineering, creative video production, camera rental, and cloud software.",
    url: "https://frametoque.com",
    siteName: "Frametoque Digital Productions",
    locale: "en_LK",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Frametoque Digital Productions",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Frametoque Digital Productions",
    description: "Turning ideas into powerful digital experiences through web engineering, creative video production, camera rental, and cloud software.",
    images: ["https://frametoque.com/og-image.png"],
    site: "@Frametoque",
    creator: "@Frametoque",
  },
};

const localBusiness = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Frametoque Digital Productions",
  "description": "Graphic design, video editing, photography, videography, camera rentals & web engineering",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Colombo",
    "addressCountry": "LK"
  },
  "url": "https://frametoque.com",
  "serviceArea": "Sri Lanka"
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Frametoque Digital Productions",
  url: "https://frametoque.com",
  logo: "https://frametoque.com/logos/ft/logo-main.png",
  sameAs: [
    "https://instagram.com/frame.toque",
    "https://linkedin.com/company/frametoque",
    "https://facebook.com/frametoque",
    "https://youtube.com/@Frametoque",
  ],
  department: [
    {
      "@type": "Organization",
      name: "Frametoque Digital",
      url: "https://frametoque.com/digital",
      description: "Web development, UI/UX engineering, graphic design, and proprietary cloud software products including Framebooks",
    },
    {
      "@type": "Organization",
      name: "Frametoque Productions",
      url: "https://frametoque.com/productions",
      description: "Cinematography, photography, videography, and post-production",
    },
    {
      "@type": "Organization",
      name: "Frametoque Rentals",
      url: "https://frametoque.com/rentals",
      description: "Cinema camera, lens, lighting, and audio gear hire",
    },
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
};

export default function RootLayout({ children }) {
  
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          type="application/ld+json"
          id="schema-org"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([organizationSchema, localBusiness]),
          }}
        />
      </head>

      <body suppressHydrationWarning
        className={`${bricolage.variable} ${dmMono.variable} antialiased`}
      >
        <ClerkProvider>
          <SessionKeepAlive />
          <CartProvider>
            <SWRegister />
            <SmoothScroll />
            {children}
            <Analytics />
            <FloatingButtons />
            <SnowfallWrapper />
            <UmamiScript />
          </CartProvider>
        </ClerkProvider>
        
      </body>
    </html>
  );
}
