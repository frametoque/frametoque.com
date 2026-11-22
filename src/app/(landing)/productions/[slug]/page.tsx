import { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductionsClient from "../ProductionsClient";
import { getPhotography, getVideography, getEventProductions } from "@/lib/workdata";

const VALID_PRODUCTIONS_SLUGS = ["photography", "videography", "event-productions"] as const;
type ProductionsSlug = (typeof VALID_PRODUCTIONS_SLUGS)[number];

const SLUG_TITLES: Record<ProductionsSlug, string> = {
  "photography": "Commercial & Event Photography Portfolio | Frametoque Productions",
  "videography": "Cinematic Videography Portfolio | Frametoque Productions",
  "event-productions": "Live Event Productions Portfolio | Frametoque Productions",
};

const SLUG_DESCRIPTIONS: Record<ProductionsSlug, string> = {
  "photography": "Explore commercial, event, concert, and portrait photography captures by Frametoque Productions.",
  "videography": "Explore cinematic aftermovies, corporate commercials, and broadcast-grade videography by Frametoque Productions.",
  "event-productions": "Explore concert stage setups, live streaming, multi-camera broadcasting, and full-scale event productions by Frametoque Productions.",
};

export async function generateStaticParams() {
  return VALID_PRODUCTIONS_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!VALID_PRODUCTIONS_SLUGS.includes(slug as ProductionsSlug)) {
    return { title: "Frametoque Productions" };
  }

  const validSlug = slug as ProductionsSlug;
  const title = SLUG_TITLES[validSlug];
  const description = SLUG_DESCRIPTIONS[validSlug];
  const url = `https://frametoque.com/productions/${validSlug}`;

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "Frametoque Productions",
      locale: "en_LK",
      images: [{ url: "https://frametoque.com/og-image.png", width: 1200, height: 630, alt: title }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["https://frametoque.com/og-image.png"],
      site: "@Frametoque",
      creator: "@Frametoque",
    },
  };
}

export default async function ProductionsSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!VALID_PRODUCTIONS_SLUGS.includes(slug as ProductionsSlug)) {
    notFound();
  }

  const [photographyEvents, videographyUrls, eventProductionUrls] =
    await Promise.all([
      getPhotography(),
      getVideography(),
      getEventProductions(),
    ]);

  return (
    <ProductionsClient
      photographyEvents={photographyEvents}
      videographyUrls={videographyUrls}
      eventProductionUrls={eventProductionUrls}
      initialTab={slug}
    />
  );
}
