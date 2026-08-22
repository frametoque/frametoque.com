export const metadata = {
  title: "FrameToque Digital Media",
  description: "We craft fast websites, bold graphic, and pro videos that make your brand shine.",
  openGraph: {
    title: "FrameToque Digital Media | Simple.Better.Fast.",
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
    title: "FrameToque Digital Media | Simple.Better.Fast.",
    description: "We craft fast websites, bold graphic, and pro videos that make your brand shine.",
    images: ["https://frametoque.com/og-image.png"],
  },
};


import HomeClient from "./home/page";

export default function Page() {
  return <HomeClient />;
}
