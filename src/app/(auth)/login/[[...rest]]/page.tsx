export const metadata = {
  title: "Login | Frametoque",
  description: "Log in to your Frametoque account to manage your dashboard, track services, and access your projects securely.",
  openGraph: {
    title: "Login | Frametoque",
    description: "Log in to your Frametoque account to manage your dashboard, track services, and access your projects securely.",
    url: "https://frametoque.online/login", 
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

    twitter: {
    card: "summary_large_image",
    title: "Login | FrameToque Digital Media",
    description: "Explore our range of services...",
    images: ["https://frametoque.online/og-image.png"],
  },
};

import React from 'react'
import Login from "./MainPage"

function page() {
  return (
    <>
    
     <Login scrolled={false} />
        
    </>
   
  )
}

export default page