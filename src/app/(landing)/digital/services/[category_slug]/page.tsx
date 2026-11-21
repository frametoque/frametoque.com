import { notFound } from "next/navigation";
import { Metadata } from "next";
import Services from "@/components/services/Services";

const titles: Record<string, string> = {
  "web-dev": "Web Development Services",
  "graphic-design": "Graphic Design Services",
  "video-editing": "Video Editing Services",
};

const VALID_SLUGS = Object.keys(titles);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category_slug: string }>;
}): Promise<Metadata> {
  const { category_slug } = await params;

  if (!VALID_SLUGS.includes(category_slug)) {
    return {
      title: { absolute: "Services | Frametoque Digital" },
    };
  }

  const title = titles[category_slug];
  const description = `Explore our high-performance ${title.toLowerCase()} at Frametoque Digital.`;

  return {
    title: { absolute: `${title} | Frametoque Digital` },
    description,
    openGraph: {
      title: `${title} | Frametoque Digital`,
      description,
      url: `https://frametoque.com/digital/services/${category_slug}`,
      siteName: "Frametoque Digital",
      images: [
        {
          url: "https://frametoque.com/og-image.png",
          width: 1200,
          height: 630,
          alt: "Frametoque Digital",
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Frametoque Digital`,
      description,
      images: ["https://frametoque.com/og-image.png"],
    },
  };
}

export const dynamic = "force-dynamic";

export default async function DigitalServiceCategoryPage({
  params,
}: {
  params: Promise<{ category_slug: string }>;
}) {
  const { category_slug } = await params;

  if (!VALID_SLUGS.includes(category_slug)) notFound();

  return (
    <main className="min-h-screen bg-slate-950 text-white overflow-hidden">
      <Services arm="digital" />
    </main>
  );
}
