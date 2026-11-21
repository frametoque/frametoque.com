export const metadata = {
  title: {
    absolute: "Frametoque Digital Productions | Simple.Better.Fast.",
  },
  description:
    "Frametoque Digital Productions builds high-converting web applications, bold brand identities, cinematic video productions, and full-scale camera rentals in Sri Lanka.",
  alternates: {
    canonical: "https://frametoque.com",
  },
  keywords: [
    "Frametoque",
    "Frametoque Digital",
    "Frametoque Productions",
    "Frametoque Rentals",
    "Framebooks",
    "Web Development Sri Lanka",
    "Cinematography Sri Lanka",
    "Camera Hire Colombo",
    "Video Production Colombo",
    "Digital Creative Agency Sri Lanka",
  ],
  openGraph: {
    title: "Frametoque Digital Productions | Simple.Better.Fast.",
    description: "We craft fast websites, bold graphic design systems, and cinematic video productions.",
    url: "https://frametoque.com/", 
    siteName: "Frametoque Digital Productions",
    locale: "en_LK",
    images: [
      {
        url: "https://frametoque.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Frametoque Digital Productions",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Frametoque Digital Productions | Simple.Better.Fast.",
    description: "We craft fast websites, bold graphic design systems, and cinematic video productions.",
    images: ["https://frametoque.com/og-image.png"],
    site: "@Frametoque",
    creator: "@Frametoque",
  },
};


import HomeClient from "./home/page";

export default function Page() {
  return <HomeClient />;
}
