import { Metadata } from "next";
import { getPublicCareers } from "@/app/(dashboard)/admin/actions/careersActions";
import CareersClient from "./CareersClient";

export const metadata: Metadata = {
  title: {
    absolute: "Careers at Frametoque | Join Our Crew",
  },
  description:
    "Join the team at Frametoque Digital Productions. Explore career opportunities across software development, digital design, cinematography, video presentation, and post-production.",
  alternates: {
    canonical: "https://frametoque.com/careers",
  },
  keywords: [
    "Frametoque Careers",
    "Creative Jobs Sri Lanka",
    "Video Editor Jobs Colombo",
    "Video Presenter Jobs",
    "Web Developer Vacancies Sri Lanka",
    "Cinematographer Jobs",
    "Media Production Careers",
  ],
  openGraph: {
    title: "Careers at Frametoque | Join Our Crew",
    description: "Join our creative engineering and media production team.",
    url: "https://frametoque.com/careers",
    siteName: "Frametoque Digital Productions",
    locale: "en_LK",
    images: [{ url: "https://frametoque.com/og-image.png", width: 1200, height: 630, alt: "Frametoque Careers" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Careers at Frametoque | Join Our Crew",
    description: "Join our creative engineering and media production team.",
    images: ["https://frametoque.com/og-image.png"],
    site: "@Frametoque",
    creator: "@Frametoque",
  },
};

export default async function CareersPage() {
  const openRoles = await getPublicCareers();

  return <CareersClient openRoles={openRoles} />;
}
