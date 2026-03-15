export const metadata = {
  title: "Contact",
  description:
    "Get in touch with Frame Toque for inquiries about our web development, graphic design, and video editing services. We're here to help your brand shine.",
    openGraph: {
    title: "Contact | Frame Toque",
    description: "Get in touch with Frame Toque for inquiries about our web development, graphic design, and video editing services. We're here to help your brand shine.",
    url: "https://frametoque.online/contact", 
    siteName: "Frame Toque",
    images: [
      {
        url: "https://frametoque.online/og-image.png",
        width: 1200,
        height: 630,
        alt: "Frame Toque",
      },
    ],
    type: "website",
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
