export const metadata = {
  title: "Invoices",
  description: "View, track, and manage all your invoices in one place & Get real-time updates.",
  openGraph: {
    title: "Invoices | FrameToque Digital Media",
    description: "View, track, and manage all your invoices in one place & Get real-time updates.",
    url: "https://frametoque.online/dashboard/invoices", 
    siteName: "FrameToque",
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
    twitter: {
    card: "summary_large_image",
    title: "Projects | FrameToque Digital Media",
    description: "Explore our range of services...",
    images: ["https://frametoque.online/og-image.png"],
  },
};

import React from 'react'
import MainPage from './MainPage'

function page() {
  return (
    <MainPage/>
  )
}

export default page