export const metadata = {
  title: "Dashboard",
  description: "We craft fast websites, bold graphic, and pro videos that make your brand shine.",
  openGraph: {
    title: "Dashboard | Frametoque",
    description: "We craft fast websites, bold graphic, and pro videos that make your brand shine.",
    url: "https://frametoque.online/dashboard", 
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

import MainPage from './MainPage'

function page() {
  return (
    <MainPage/>
  )
}

export default page