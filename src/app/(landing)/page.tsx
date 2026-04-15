export const metadata = {
  title: "FrameToque Digital Media",
  description: "We craft fast websites, bold graphic, and pro videos that make your brand shine.",
  openGraph: {
    title: "FrameToque Digital Media | Simple.Better.Fast.",
    description: "We craft fast websites, bold graphic, and pro videos that make your brand shine.",
    url: "https://frametoque.online/", 
    siteName: "Frametoque",
    images: [
      {
        url: "https://frametoque.online/og-image.png",
        width: 1200,
        height: 630,
        alt: "Frametoque",
      },
    ],
    type: "website",
  },
};


import HomeClient from "./home/page";

export default function Page() {
  return <HomeClient />;
}
