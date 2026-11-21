export const metadata = {
  title: "Login",
  description: "Log in to your Frametoque account to manage your dashboard, track services, and access your projects securely.",
  openGraph: {
    title: "Login | Frametoque Digital Productions",
    description: "Log in to your Frametoque account to manage your dashboard, track services, and access your projects securely.",
    url: "https://frametoque.com/login", 
    siteName: "Frametoque Digital Productions",
    images: [
      {
        url: "https://frametoque.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Frametoque Digital Productions",
      },
    ],
    type: "website",
  },

    twitter: {
    card: "summary_large_image",
    title: "Login | Frametoque Digital Productions",
    description: "Log in to your Frametoque account to manage your dashboard, track services, and access your projects securely.",
    images: ["https://frametoque.com/og-image.png"],
  },
};

import React from 'react'
import Login from "./MainPage"

function page() {
  return (
    <>
    
     <Login />
        
    </>
   
  )
}

export default page