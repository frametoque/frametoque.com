export const metadata = {
  title: "Terms & Conditions",
  description:
    "Read the terms and conditions for using Frametoque's web development, graphic design, and video editing services.",
    openGraph: {
    title: "Terms & Conditions |  | FrameToque Digital Media",
    description: "Read the terms and conditions for using Frametoque's web development, graphic design, and video editing services.",
    url: "https://frametoque.com/terms", 
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
    title: "Terms & Conditions | FrameToque Digital Media",
    description: "Read the terms and conditions for using Frametoque's web development, graphic design, and video editing services.",
    images: ["https://frametoque.com/og-image.png"],
  },
};

import TermsContent from "@/app/(legal)/terms/terms";


export default function Terms() {
  return (
    <>
    <main  className="min-h-screen bg-slate-950 text-white overflow-hidden">
    <TermsContent />
  </main >
  </>
  );
}
