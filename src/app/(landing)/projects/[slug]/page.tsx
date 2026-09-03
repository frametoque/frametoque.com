import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GallerySection from "@/components/projects/GallerySection";
import { getPhotography, getGraphics, getVideography, getVideoEditing, getWebProjects } from "@/lib/workdata";
import { Metadata } from "next";

const titles: Record<string, string> = {
  photography: "Photography Projects",
  videography: "Videography Projects",
  "graphic-design": "Graphic Design Projects",
  "video-editing": "Video Editing Projects",
  "web-dev": "Web Development Projects",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const title = titles[slug] || "Our Projects";
  const description = `Explore our ${title.toLowerCase()} at Frametoque.`;

  return {
    title: `${title}`,
    description,
    openGraph: {
      title: `${title} | Frametoque Digital Media`,
      description,
      url: `https://frametoque.com/projects/${slug}`,
      siteName: "Frametoque",
      images: [
        {
          url: "https://frametoque.com/og-image.png",
          width: 1200,
          height: 630,
          alt: "Frametoque",
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Frametoque Digital Media`,
      description,
      images: ["https://frametoque.com/og-image.png"],
    },
  };
}

const VALID_SLUGS = [
  "photography",
  "videography",
  "graphic-design",
  "video-editing",
  "web-dev",
];

export const dynamic = "force-dynamic";

export default async function ProjectSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!VALID_SLUGS.includes(slug)) notFound();

const [
  photographyEvents,
  graphicImages,
  videographyUrls,
  videoEditingUrls,
  { projects: webProjects, detailsMap: webDetailsMap }, 
] = await Promise.all([
  getPhotography(),
  getGraphics(),
  getVideography(),
  getVideoEditing(),
  getWebProjects(),
]);

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar scrolled={true} />
      <GallerySection
        initialTab={slug}
        photographyEvents={photographyEvents}
        graphicImages={graphicImages}
        videographyUrls={videographyUrls}
        videoEditingUrls={videoEditingUrls}
        webProjects={webProjects}
        webDetailsMap={webDetailsMap} 
      />
      <Footer />
    </main>
  );
}