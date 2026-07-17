import { notFound } from "next/navigation";
import { Metadata } from "next";
import ServiceDataPage from "@/components/services/ServiceDetails";
import { getServiceBySlugAndCategory, getServiceMeta, TABLE_MAP } from "@/lib/services";

export const dynamic = "force-dynamic";

// All valid category slugs
const VALID_CATEGORIES = Object.keys(TABLE_MAP);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category_slug: string; details_slug: string }>;
}): Promise<Metadata> {
  const { category_slug, details_slug } = await params;

  const meta = await getServiceMeta(details_slug);

  if (!meta) {
    return {
      title: "Service Not Found | Frametoque",
      description: "The requested service page could not be found.",
    };
  }

  return {
    title: `${meta.title} | Frametoque`,
    description: meta.description,
    openGraph: {
      title: `${meta.title} | Frametoque`,
      description: meta.description,
      url: `https://frametoque.online/services/${category_slug}/${details_slug}`,
      siteName: "Frametoque",
      images: [
        {
          url: `https://frametoque.online${meta.heroImage}`,
          width: 1200,
          height: 630,
          alt: meta.title,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${meta.title} | Frametoque`,
      description: meta.description,
      images: [`https://frametoque.online${meta.heroImage}`],
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    description: service.description,
    url: `https://frametoque.online/services/${category_slug}/${details_slug}`,
    image: `https://frametoque.online${service.hero_image}`,
    provider: {
      "@type": "LocalBusiness",
      name: "Frametoque",
      url: "https://frametoque.online",
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