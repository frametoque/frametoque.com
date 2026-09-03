export const metadata = {
  title: "Invoices",
  description: "View, track, and manage all your invoices in one place & Get real-time updates.",
  openGraph: {
    title: "Invoices | Frametoque Digital Media",
    description: "View, track, and manage all your invoices in one place & Get real-time updates.",
    url: "https://frametoque.com/dashboard/invoices", 
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
    title: "Projects | Frametoque Digital Media",
    description: "Explore our range of services...",
    images: ["https://frametoque.com/og-image.png"],
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