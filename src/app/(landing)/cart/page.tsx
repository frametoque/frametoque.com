import { Metadata } from "next";
import CartClient from "@/components/cart/CartClient";

export const metadata: Metadata = {
  title: "Cart | FrameToque Digital Media",
  description: "Review and book your selected photography, videography, graphic design, video editing, and web development packages.",
  openGraph: {
    title: "Cart | FrameToque Digital Media",
    description: "Review and book your selected photography, videography, graphic design, video editing, and web development packages.",
    url: "https://frametoque.online/cart",
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
  twitter: {
    card: "summary_large_image",
    title: "Cart | FrameToque Digital Media",
    description: "Review and book your selected photography, videography, graphic design, video editing, and web development packages.",
    images: ["https://frametoque.online/og-image.png"],
  },
};

export default function CartPage() {
  return <CartClient />;
}
