import { notFound, redirect } from "next/navigation";
import { Metadata } from "next";
import ServiceDataPage from "@/components/services/ServiceDetails";
import { getServiceMeta, TABLE_MAP } from "@/lib/services";

export const dynamic = "force-dynamic";

const PRODUCTIONS_CATEGORIES = ["photo-video", "event-productions"];

function formatImageUrl(imagePath?: string): string {
  if (!imagePath) return "https://frametoque.com/services/eventpulse.png";
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }
  const cleanPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  return `https://frametoque.com${cleanPath}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category_slug: string; details_slug: string }>;
}): Promise<Metadata> {
  const { category_slug, details_slug } = await params;

  if (!PRODUCTIONS_CATEGORIES.includes(category_slug)) {
    return {
      title: { absolute: "Service Not Found | Frametoque Productions" },
    };
  }

  const meta = await getServiceMeta(details_slug);

  if (!meta) {
    return {
      title: { absolute: "Service Not Found | Frametoque Productions" },
      description: "The requested service page could not be found.",
    };
  }

  const imageUrl = formatImageUrl(meta.heroImage);
  const description = meta.description || "Explore our cinematic production services at Frametoque Productions.";

  return {
    title: { absolute: `${meta.title} | Frametoque Productions` },
    description,
    openGraph: {
      title: `${meta.title} | Frametoque Productions`,
      description,
      url: `https://frametoque.com/productions/services/${category_slug}/${details_slug}`,
      siteName: "Frametoque Productions",
      images: [
        {
          url: imageUrl,
          width: 1601,
          height: 1084,
          alt: meta.title,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${meta.title} | Frametoque Productions`,
      description,
      images: [imageUrl],
    },
  };
}

export default async function ProductionsServiceDetailPage({
  params,
}: {
  params: Promise<{ category_slug: string; details_slug: string }>;
}) {
  const { category_slug, details_slug } = await params;

  if (category_slug === "video-editing") {
    redirect(`/digital/services/video-editing/${details_slug}`);
  }

  if (!PRODUCTIONS_CATEGORIES.includes(category_slug) || !TABLE_MAP[category_slug]) {
    notFound();
  }

  return <ServiceDataPage categorySlug={category_slug} serviceType={details_slug} />;
}
