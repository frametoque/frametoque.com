export const metadata = {
  title: "My Requests | Frame Toque",
  description: "View, track, and manage all your requests in one place & Get real-time updates.",
  openGraph: {
    title: "My Requests | Frame Toque",
    description: "View, track, and manage all your requests in one place & Get real-time updates.",
    url: "https://frametoque.online/dashboard/requests", 
    siteName: "Frame Toque",
    images: [
      {
        url: "https://frametoque.online/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "Frame Toque",
      },
    ],
    type: "website",
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