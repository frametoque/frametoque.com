export const metadata = {
  title: "Terms & Conditions",
  description:
    "Read the terms and conditions for using Frametoque's web development, graphic design, and video editing services.",
    openGraph: {
    title: "Terms & Conditions | Frametoque",
    description: "Read the terms and conditions for using Frametoque's web development, graphic design, and video editing services.",
    url: "https://frametoque.online/terms", 
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
