export const metadata = {
  title: "Frame Toque",
  description: "We craft fast websites, bold graphic, and pro videos that make your brand shine.",
  openGraph: {
    title: "Frame Toque Digital | Web Development, Graphic Design & Video Solutions",
    description: "We craft fast websites, bold graphic, and pro videos that make your brand shine.",
    url: "https://frametoque.online/", 
    siteName: "Frame Toque",
    images: [
      {
        url: "https://frametoque.online/og-image.png",
        width: 1200,
        height: 630,
        alt: "Frame Toque",
      },
    ],
    type: "website",
  },
};


import HomeClient from "./home/page.jsx";

export default function Page() {
  return <HomeClient />;
}
