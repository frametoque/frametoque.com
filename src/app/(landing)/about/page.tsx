export const metadata = {
  title: "About",
  description:
    "Learn more about Frametoque, our mission to empower brands with stunning web development, graphic design, and video editing services.",
  openGraph: {
    title: "About | FrameToque Digital Media",
    description: "Learn more about Frametoque, our mission to empower brands with stunning web development, graphic design, and video editing services.",
    url: "https://frametoque.online/about", 
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
    title: "About | FrameToque Digital Media",
    description: "Explore our range of services...",
    images: ["https://frametoque.online/og-image.png"],
  },
};

import About from "@/components/About";

export default function AboutOut() {

  return (
    <>
    <main  className="min-h-screen bg-slate-950 text-white overflow-hidden">
      <About />
    </main >
    </>
  );
}