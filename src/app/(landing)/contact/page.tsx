export const metadata = {
  title: "Contact",
  description:
    "Get in touch with Frametoque for inquiries about our web development, graphic design, and video editing services. We're here to help your brand shine.",
    openGraph: {
    title: "Contact | FrameToque Digital Media",
    description: "Get in touch with Frametoque for inquiries about our web development, graphic design, and video editing services. We're here to help your brand shine.",
    url: "https://frametoque.com/contact", 
    siteName: "Frametoque",
    images: [
      {
        url: "https://frametoque.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Frametoque",
      },
    ],
    type: "website",
  },
    twitter: {
    card: "summary_large_image",
    title: "Contact | FrameToque Digital Media",
    description: "Get in touch with Frametoque for inquiries about our web development, graphic design, and video editing services. We're here to help your brand shine.",
    images: ["https://frametoque.com/og-image.png"],
  },
};

import Contact from "@/components/Contact";

export default function ProjectsOut() {
  return (
    <>
    <main  className="min-h-screen bg-slate-950 text-white overflow-hidden">
      <Contact />
    </main >
    </>
  );
}
