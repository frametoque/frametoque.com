import { Metadata } from "next";
import ProductionsClient from "./ProductionsClient";
import { getPhotography, getVideography, getEventProductions } from "@/lib/workdata";

export const metadata: Metadata = {
  title: {
    absolute: "Frametoque Productions | Cinematic Media & Event Productions",
  },
  description:
    "Frametoque Productions delivers cinematic videography, commercial photography, drone cinematography, and full-scale live event production packages in Sri Lanka.",
  alternates: {
    canonical: "https://frametoque.com/productions",
  },
  keywords: [
    "Frametoque Productions",
    "Cinematic Videography Sri Lanka",
    "Commercial Photography Colombo",
    "Aerial and FPV Drone Cinematography",
    "Event Productions Sri Lanka",
    "Stage Media Packages",
    "Camera Equipment Hire",
    "Frametoque Rentals",
  ],
  openGraph: {
    title: "Frametoque Productions | Cinematic Media & Event Productions",
    description: "Cinematic media production, brand commercials, event photography, drone cinematography, and live stage productions.",
    url: "https://frametoque.com/productions",
    siteName: "Frametoque Productions",
    locale: "en_LK",
    images: [{ url: "https://frametoque.com/og-image.png", width: 1200, height: 630, alt: "Frametoque Productions" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Frametoque Productions | Cinematic Media & Event Productions",
    description: "Cinematic media production, brand commercials, event photography, drone cinematography, and live stage productions.",
    images: ["https://frametoque.com/og-image.png"],
    site: "@Frametoque",
    creator: "@Frametoque",
  },
};

export default async function ProductionsPage() {
  const [photographyEvents, videographyUrls, eventProductionUrls] =
    await Promise.all([
      getPhotography(),
      getVideography(),
      getEventProductions(),
    ]);

  return (
    <ProductionsClient
      photographyEvents={photographyEvents}
      videographyUrls={videographyUrls}
      eventProductionUrls={eventProductionUrls}
    />
  );
}
