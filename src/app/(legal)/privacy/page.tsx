export const metadata = {
  title: "Privacy Policy",
  description:
    "Read the privacy policy for Frametoque, detailing how we collect and handle user data when submitting projects or using our services.",
    openGraph: {
    title: "Privacy Policy | FrameToque Digital Media",
    description: "Read the privacy policy for Frametoque, detailing how we collect and handle user data when submitting projects or using our services.",
    url: "https://frametoque.com/privacy", 
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
    title: "Privacy Policy | FrameToque Digital Media",
    description: "Read the privacy policy for Frametoque, detailing how we collect and handle user data when submitting projects or using our services.",
    images: ["https://frametoque.com/og-image.png"],
  },
};

import PrivacyContent from "@/app/(legal)/privacy/privacy";


export default function Privacy() {
  return (
    <>
      <main  className="min-h-screen bg-slate-950 text-white overflow-hidden">
        <PrivacyContent />
      </main >
    </>
  );
}
