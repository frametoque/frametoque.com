import { Metadata } from "next";
import CartClient from "@/components/cart/CartClient";

export const metadata: Metadata = {
  title: "Cart",
  description: "Review and book your selected photography, videography, graphic design, video editing, and web development packages.",
  openGraph: {
    title: "Cart | Frametoque Digital Productions",
    description: "Review and book your selected photography, videography, graphic design, video editing, and web development packages.",
    url: "https://frametoque.com/cart",
    siteName: "Frametoque Digital Productions",
    images: [
      {
        url: "https://frametoque.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Frametoque Digital Productions",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cart | Frametoque Digital Productions",
    description: "Review and book your selected photography, videography, graphic design, video editing, and web development packages.",
    images: ["https://frametoque.com/og-image.png"],
  },
};

export default function CartPage() {
  return <CartClient />;
}
