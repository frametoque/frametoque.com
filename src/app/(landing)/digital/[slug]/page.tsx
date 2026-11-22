import { Metadata } from "next";
import { notFound } from "next/navigation";
import { BRANDS } from "@/config/brand";
import DigitalClient from "../DigitalClient";
import { getGraphics, getWebProjects, getVideoEditing } from "@/lib/workdata";

const VALID_DIGITAL_SLUGS = ["web-dev", "graphic-design", "video-editing"] as const;
type DigitalSlug = (typeof VALID_DIGITAL_SLUGS)[number];

const SLUG_TITLES: Record<DigitalSlug, string> = {
  "web-dev": "Web Development Portfolio | Frametoque Digital",
  "graphic-design": "Graphic Design Portfolio | Frametoque Digital",
  "video-editing": "Video Editing & Motion Design Portfolio | Frametoque Digital",
};

const SLUG_DESCRIPTIONS: Record<DigitalSlug, string> = {
  "web-dev": "Explore production web architectures, responsive web apps, and modern high-converting websites by Frametoque Digital.",
  "graphic-design": "Explore creative brand identities, commercial posters, and visual communication designs crafted by Frametoque Digital.",
  "video-editing": "Explore cinematic video reels, motion graphics, and high-energy short visual edits produced by Frametoque Digital.",
};

export async function generateStaticParams() {
  return VALID_DIGITAL_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!VALID_DIGITAL_SLUGS.includes(slug as DigitalSlug)) {
    return { title: "Frametoque Digital" };
  }

  const validSlug = slug as DigitalSlug;
  const title = SLUG_TITLES[validSlug];
  const description = SLUG_DESCRIPTIONS[validSlug];
  const url = `https://frametoque.com/digital/${validSlug}`;

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
      siteName: "Frametoque Digital",
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

export default async function DigitalSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!VALID_DIGITAL_SLUGS.includes(slug as DigitalSlug)) {
    notFound();
  }

  const booksUrl = BRANDS.framebooks.externalUrl || "https://books.frametoque.com";
  const [graphicImages, { projects: webProjects, detailsMap: webDetailsMap }, videoEditingUrls] =
    await Promise.all([getGraphics(), getWebProjects(), getVideoEditing()]);

  return (
    <DigitalClient
      booksUrl={booksUrl}
      graphicImages={graphicImages}
      webProjects={webProjects}
      webDetailsMap={webDetailsMap}
      videoEditingUrls={videoEditingUrls}
      initialTab={slug}
    />
  );
}
