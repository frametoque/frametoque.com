export const metadata = {
  title: "Login | Frame Toque",
  description: "Log in to your Frame Toque account to manage your dashboard, track services, and access your projects securely.",
  openGraph: {
    title: "Login | Frame Toque",
    description: "Log in to your Frame Toque account to manage your dashboard, track services, and access your projects securely.",
    url: "https://frametoque.online/login", 
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

import React from 'react'
import Login from "./MainPage"

function page() {
  return (
    <>
    
     <Login/>
        
    </>
   
  )
}

export default page