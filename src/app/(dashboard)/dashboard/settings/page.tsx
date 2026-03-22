export const metadata = {
  title: "Settings",
  description: "Manage your account settings, profile details, and payment methods all in one place.",
  openGraph: {
    title: "Settings | Frametoque",
    description: "Manage your account settings, profile details, and payment methods all in one place.",
    url: "https://frametoque.online/dashboard/settings", 
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

import React from 'react'
import MainPage from './MainPage'

function page() {
  return (
    <MainPage/>
  )
}

export default page