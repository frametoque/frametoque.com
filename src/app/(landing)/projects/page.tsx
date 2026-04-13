export const metadata = {
  title: "What We Did",
  description:
    "Discover Frametoque's portfolio showcasing our expertise in web development, graphic design, and video editing services that elevate brands.",
  openGraph: {
    title: "What We Did | Frametoque",
    description: "Discover Frametoque's portfolio showcasing our expertise in web development, graphic design, and video editing services that elevate brands.",
    url: "https://frametoque.online/projects",
    siteName: "Frametoque",
    images: [
      {
        url: "https://frametoque.online/og-image.png",
        width: 1200,
        height: 630,
        alt: "Frametoque",
      },
    ],
    type: "website",
  },
};


import Projects from "@/components/Projects";

export default function ProjectsOut() {

  return (
    <>
      <main className="min-h-screen bg-slate-950 text-white overflow-hidden">

        <Projects />

      </main >
    </>
  );
}
