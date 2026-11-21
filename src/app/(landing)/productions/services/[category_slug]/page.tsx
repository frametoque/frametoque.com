import { notFound, redirect } from "next/navigation";
import { Metadata } from "next";
import Services from "@/components/services/Services";

const titles: Record<string, string> = {
  "photo-video": "Photography & Videography Services",
  "event-productions": "Event Productions Services",
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
      title: { absolute: "Services | Frametoque Productions" },
    };
  }

  const title = titles[category_slug];
  const description = `Explore our cinematic ${title.toLowerCase()} at Frametoque Productions.`;

  return {
    title: { absolute: `${title} | Frametoque Productions` },
    description,
    openGraph: {
      title: `${title} | Frametoque Productions`,
      description,
      url: `https://frametoque.com/productions/services/${category_slug}`,
      siteName: "Frametoque Productions",
      images: [
        {
          url: "https://frametoque.com/og-image.png",
          width: 1200,
          height: 630,
          alt: "Frametoque Productions",
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Frametoque Productions`,
      description,
      images: ["https://frametoque.com/og-image.png"],
    },
  };
}

export const dynamic = "force-dynamic";

export default async function ProductionsServiceCategoryPage({
  params,
}: {
  params: Promise<{ category_slug: string }>;
}) {
  const { category_slug } = await params;

  if (category_slug === "video-editing") {
    redirect("/digital/services/video-editing");
  }

  if (!VALID_SLUGS.includes(category_slug)) notFound();

  return (
    <main className="min-h-screen bg-slate-950 text-white overflow-hidden">
      <Services arm="productions" />
    </main>
  );
}
