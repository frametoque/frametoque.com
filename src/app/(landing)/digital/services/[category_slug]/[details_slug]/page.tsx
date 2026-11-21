import { notFound } from "next/navigation";
import { Metadata } from "next";
import ServiceDataPage from "@/components/services/ServiceDetails";
import { getServiceMeta, TABLE_MAP } from "@/lib/services";

export const dynamic = "force-dynamic";

const DIGITAL_CATEGORIES = ["web-dev", "graphic-design", "video-editing"];

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

  if (!DIGITAL_CATEGORIES.includes(category_slug)) {
    return {
      title: { absolute: "Service Not Found | Frametoque Digital" },
    };
  }

  const meta = await getServiceMeta(details_slug);

  if (!meta) {
    return {
      title: { absolute: "Service Not Found | Frametoque Digital" },
      description: "The requested service page could not be found.",
    };
  }

  const imageUrl = formatImageUrl(meta.heroImage);
  const description = meta.description || "Explore our premium digital solutions at Frametoque Digital.";

  return {
    title: { absolute: `${meta.title} | Frametoque Digital` },
    description,
    openGraph: {
      title: `${meta.title} | Frametoque Digital`,
      description,
      url: `https://frametoque.com/digital/services/${category_slug}/${details_slug}`,
      siteName: "Frametoque Digital",
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
      title: `${meta.title} | Frametoque Digital`,
      description,
      images: [imageUrl],
    },
  };
}

export default async function DigitalServiceDetailPage({
  params,
}: {
  params: Promise<{ category_slug: string; details_slug: string }>;
}) {
  const { category_slug, details_slug } = await params;

  if (!DIGITAL_CATEGORIES.includes(category_slug) || !TABLE_MAP[category_slug]) {
    notFound();
  }

  return <ServiceDataPage categorySlug={category_slug} serviceType={details_slug} />;
}
