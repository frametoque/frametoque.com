export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata = {
  title: "Dashboard",
  description: "We craft fast websites, bold graphic, and pro videos that make your brand shine.",
  openGraph: {
    title: "Dashboard | Frametoque",
    description: "We craft fast websites, bold graphic, and pro videos that make your brand shine.",
    url: "https://frametoque.com/dashboard", 
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
    title: "Dashboard | Frametoque Digital Media",
    description: "Explore our range of services...",
    images: ["https://frametoque.com/og-image.png"],
  },
};

import MainPage from './MainPage'

function page() {
  return (
    <MainPage/>
  )
}

export default page