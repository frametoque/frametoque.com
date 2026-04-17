export const metadata = {
  title: "What We Do",
  description:
    "Explore our range of services including web development, graphic design, and video editing tailored to make your brand shine.",
  openGraph: {
    title: "Services | FrameToque Digital Media",
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
    twitter: {
    card: "summary_large_image",
    title: "Our Projects | FrameToque Digital Media",
    description: "Explore our range of services including web development, graphic design, and video editing tailored to make your brand shine.",
    images: ["https://frametoque.online/og-image.png"],
  },
};



import Services from "@/components/services/Services";
//import Alert from '@/components/Alert"
import Collab from "@/components/Collab";


export default function Home() {


  return (
    <>
      <main className="min-h-screen bg-slate-950 text-white overflow-hidden">
        

        <Services />
        {/* <Alert /> */}
        {/* <Collab /> */}

      </main >
    </>
  );
}
