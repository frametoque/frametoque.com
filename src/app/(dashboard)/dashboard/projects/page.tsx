export const metadata = {
  title: "Projects",
  description: "View, track, and manage all your projects in one place & Get real-time updates.",
  openGraph: {
    title: "Projects | FrameToque Digital Media",
    description: "View, track, and manage all your projects in one place & Get real-time updates.",
    url: "https://frametoque.online/dashboard/projects", 
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
};

import React from 'react'
import MainPage from './MainPage'

function page() {
  return (
    <MainPage/>
  )
}

export default page