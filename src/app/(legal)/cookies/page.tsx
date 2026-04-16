export const metadata = {
  title: "Cookie Policy",
  description:
    "Read the cookie policy for Frametoque, explaining how we use cookies and similar technologies on our website.",
    openGraph: {
    title: "Cookie Policy | FrameToque Digital Media",
    description: "Read the cookie policy for Frametoque, explaining how we use cookies and similar technologies on our website.",
    url: "https://frametoque.online/cookies", 
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
    title: "Cookie Policy | FrameToque Digital Media",
    description: "Read the cookie policy for Frametoque, explaining how we use cookies and similar technologies on our website.",
    images: ["https://frametoque.online/og-image.png"],
  },
};

import CookiesContent from "@/app/(legal)/cookies/cookies";

export default function Cookies() { 

  return (
    <>
      <main  className="min-h-screen bg-slate-950 text-white overflow-hidden">
       
        <CookiesContent />
      </main >
    </>
  );
}
