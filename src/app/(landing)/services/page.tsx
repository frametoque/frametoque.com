export const metadata = {
  title: "What We Do",
  description:
    "Explore our range of services including web development, graphic design, and video editing tailored to make your brand shine.",
  openGraph: {
    title: "What We Do | Frametoque",
    description: "Explore our range of services including web development, graphic design, and video editing tailored to make your brand shine.",
    url: "https://frametoque.online/services",
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



import Services from "@/components/services/Services";
//import Alert from '@/components/Alert"
import Collab from "@/components/Collab";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function Home() {


  return (
    <>
      <main className="min-h-screen bg-slate-950 text-white overflow-hidden">
        <Navbar scrolled={false} />

        <div className="h-20" />
        <div className="h-20" />

        {/* Pulse removed */}

        <div className="max-w-7xl mx-auto text-center mb-8">
          <h2 className="text-5xl sm:text-6xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-b from-white to-gray-300 bg-clip-text text-transparent">What We
            </span>
            <span className="bg-gradient-to-b from-brand-400 to-brand-500 bg-clip-text text-transparent">
              &nbsp;Do
            </span>
          </h2>
          <p className="text-gray-400 text-base sm:text-lg max-w-3xl mx-auto leading-relaxed">
            From websites to videos, we make your brand look amazing everywhere.
          </p>
        </div>

        <Services />
        {/* <Alert /> */}
        <Collab />
        <br /><br /><br /><br /><br />
        <Footer />
      </main >
    </>
  );
}
