import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GallerySection from "@/components/projects/GallerySection";

export const metadata = {
  title: "What We Did",
  description: "Explore our range of services including web development, graphic design, and video editing tailored to make your brand shine.",
  openGraph: {
    title: "Our Projects | FrameToque Digital Media",
    description: "Explore our range of services including web development, graphic design, and video editing tailored to make your brand shine.",
    url: "https://frametoque.online/", 
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

const VALID_SLUGS = [
  "photography",
  "videography",
  "graphic-design",
  "video-editing",
  "web-dev",
];

export function generateStaticParams() {
  return VALID_SLUGS.map((slug) => ({ slug }));
}

export default async function ProjectSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!VALID_SLUGS.includes(slug)) notFound();

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar scrolled={true} />
      <GallerySection initialTab={slug} />
      <Footer />
    </main>
  );
}