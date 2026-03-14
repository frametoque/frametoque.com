export const metadata = {
  title: "What We Did",
  description:
    "Discover Frame Toque's portfolio showcasing our expertise in web development, graphic design, and video editing services that elevate brands.",
  openGraph: {
    title: "What We Did | Frame Toque",
    description: "Discover Frame Toque's portfolio showcasing our expertise in web development, graphic design, and video editing services that elevate brands.",
    url: "https://frametoque.online/projects",
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

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Projects from "@/components/Projects";

export default function ProjectsOut() {
  return (
    <>
      <main className="min-h-screen bg-slate-950 text-white overflow-hidden">
        <Navbar scrolled={false} />
        <div className="h-20" />
        <div className="h-20" />

        {/* Pulse Effects */}
        <div className="absolute top-20 left-4 sm:left-10 w-48 sm:w-72 h-48 sm:h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-4 sm:right-10 w-64 sm:w-96 h-64 sm:h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />

        <div className="max-w-7xl mx-auto text-center mb-16 relative z-10">
          <h2 className="text-5xl sm:text-6xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-b from-white to-gray-300 bg-clip-text text-transparent">
              What We&nbsp;
            </span>
            <span className="bg-gradient-to-b from-blue-400 to-blue-500 bg-clip-text text-transparent">
              Did
            </span>
          </h2>

          <p className="text-gray-400 text-base sm:text-lg max-w-3xl mx-auto leading-relaxed">
            A quick glimpse into some of our highlighted work.<br />
            <i className="text-gray-600">We haven't added all projects we've completed due to legal reasons and client confidentiality.
              Below are projects that our clients have chosen to showcase publicly.</i>
          </p>
        </div>

        <Projects />
        <br /><br />
        <Footer />
      </main >
    </>
  );
}
