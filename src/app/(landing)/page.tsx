export const metadata = {
  title: "Frametoque Digital Media",
  description: "We craft fast websites, bold graphic, and pro videos that make your brand shine.",
  openGraph: {
    title: "Frametoque Digital Media | Simple.Better.Fast.",
    description: "We craft fast websites, bold graphic, and pro videos that make your brand shine.",
    url: "https://frametoque.com/", 
    siteName: "Frametoque",
    images: [
      {
        url: "https://frametoque.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Frametoque",
      },
    ],
    type: "website",
  },
    twitter: {
    card: "summary_large_image",
    title: "Frametoque Digital Media | Simple.Better.Fast.",
    description: "We craft fast websites, bold graphic, and pro videos that make your brand shine.",
    images: ["https://frametoque.com/og-image.png"],
  },
};


import HomeClient from "./home/page";
import FeaturedEquipmentServer from "@/components/FeaturedEquipmentServer";
import BrowseFeaturedServer from "@/components/BrowseFeaturedServer";

export default function Page() {
  return (
    <HomeClient
      featuredEquipment={<FeaturedEquipmentServer variant="dark" />}
      browseFeatured={<BrowseFeaturedServer />}
    />
  );
}
