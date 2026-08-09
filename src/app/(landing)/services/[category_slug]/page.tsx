// app/services/[category_slug]/page.tsx
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Services from "@/components/services/Services";

const titles: Record<string, string> = {
  "photo-video": "Photography & Videograhy Services",
  "graphic-design": "Graphic Design Services",
  "video-editing": "Video Editing Services",
  "web-dev": "Web Development Services",
  "domain": "Domain Registration Services",
  "saas-products": "SaaS Products",
};

const VALID_SLUGS = Object.keys(titles);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category_slug: string }>;
}): Promise<Metadata> {
  const { category_slug } = await params;

  const title = titles[category_slug] || "Our Services";
  const description = `Explore our ${title.toLowerCase()} at FrameToque.`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | FrameToque Digital Media`,
      description,
      url: `https://frametoque.online/services/${category_slug}`,
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
      title: `${title} | FrameToque Digital Media`,
      description,
      images: ["https://frametoque.online/og-image.png"],
    },
  };
}

export const dynamic = "force-dynamic";

export default async function ServiceCategoryPage({
  params,
}: {
  params: Promise<{ category_slug: string }>;
}) {
  const { category_slug } = await params;

  if (!VALID_SLUGS.includes(category_slug)) notFound();

  return (
    <main className="min-h-screen bg-slate-950 text-white overflow-hidden">
      <Services />
    </main>
  );
}
