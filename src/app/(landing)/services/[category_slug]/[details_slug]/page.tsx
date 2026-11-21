import { notFound } from "next/navigation";
import { Metadata } from "next";
import ServiceDataPage from "@/components/services/ServiceDetails";
import { getServiceBySlugAndCategory, getServiceMeta, TABLE_MAP } from "@/lib/services";

export const dynamic = "force-dynamic";

// All valid category slugs
const VALID_CATEGORIES = Object.keys(TABLE_MAP);

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

  const meta = await getServiceMeta(details_slug);

  if (!meta) {
    return {
      title: "Service Not Found",
      description: "The requested service page could not be found.",
    };
  }

  const imageUrl = formatImageUrl(meta.heroImage);
  const description = meta.description || "Explore our premium digital services at Frametoque.";

  return {
    title: meta.title,
    description,
    openGraph: {
      title: `${meta.title} | Frametoque Digital Productions`,
      description,
      url: `https://frametoque.com/services/${category_slug}/${details_slug}`,
      siteName: "Frametoque",
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
      title: `${meta.title} | Frametoque`,
      description,
      images: [imageUrl],
      site: "@Frametoque",
    },
  };
}

export default async function ServicePage({
  params,
}: {
  params: Promise<{ category_slug: string; details_slug: string }>;
}) {
  const { category_slug, details_slug } = await params;

  if (!VALID_CATEGORIES.includes(category_slug)) {
    notFound();
  }

  // Verify the service exists in this category
  const service = await getServiceBySlugAndCategory(details_slug, category_slug);
  if (!service) {
    notFound();
  }

  const imageUrl = formatImageUrl(service.hero_image);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    description: service.description,
    url: `https://frametoque.com/services/${category_slug}/${details_slug}`,
    image: imageUrl,
    provider: {
      "@type": "LocalBusiness",
      name: "Frametoque",
      url: "https://frametoque.com",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Colombo",
        addressCountry: "LK",
      },
    },
    areaServed: {
      "@type": "Country",
      name: "Sri Lanka",
    },
    serviceType: service.title,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ServiceDataPage serviceType={details_slug} categorySlug={category_slug} />
    </>
  );
}