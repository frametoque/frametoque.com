import { Metadata } from "next";
import { BRANDS } from "@/config/brand";
import DigitalClient from "./DigitalClient";
import { getGraphics, getWebProjects, getVideoEditing } from "@/lib/workdata";

export const metadata: Metadata = {
  title: {
    absolute: "Frametoque Digital | Web Development, Design & Cloud Software",
  },
  description:
    "Frametoque Digital builds high-converting websites, custom web applications, digital design systems, animations & VFX, and modern SaaS software including Framebooks.",
  alternates: {
    canonical: "https://frametoque.com/digital",
  },
  keywords: [
    "Frametoque Digital",
    "Web Development Sri Lanka",
    "Next.js Developer Colombo",
    "UI/UX Design Agency Sri Lanka",
    "Brand Identity Design",
    "Video Editing Sri Lanka",
    "Animations and VFX",
    "Framebooks Cloud ERP",
    "Digital Marketing Colombo",
  ],
  openGraph: {
    title: "Frametoque Digital | Web Development, Design & SaaS",
    description: "High-performance web development, digital branding, animations, and custom SaaS software systems.",
    url: "https://frametoque.com/digital",
    siteName: "Frametoque Digital",
    locale: "en_LK",
    images: [{ url: "https://frametoque.com/og-image.png", width: 1200, height: 630, alt: "Frametoque Digital" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Frametoque Digital | Web Development, Design & SaaS",
    description: "High-performance web development, digital branding, animations, and custom SaaS software systems.",
    images: ["https://frametoque.com/og-image.png"],
    site: "@Frametoque",
    creator: "@Frametoque",
  },
};

export default async function DigitalPage() {
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
    />
  );
}
