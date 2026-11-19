import type { Metadata } from "next";
import { getPublicRentals, getPublicRentalCategories } from "../actions/rentals-public";
import RentalsClient from "./RentalsClient";

export const revalidate = 60; // revalidate every 60 seconds

export const metadata: Metadata = {
  title: {
    absolute: "Camera & Equipment Rental Sri Lanka | Frametoque Rentals",
  },
  description: "Rent professional cinema cameras, Sony FX series, cine lenses, lighting kits, and audio gear in Colombo, Sri Lanka. Check real-time shoot date availability and book directly.",
  alternates: {
    canonical: "https://frametoque.com/rentals",
  },
  openGraph: {
    title: "Camera & Equipment Rental Sri Lanka | Frametoque Rentals",
    description: "Rent professional cinema cameras, cine lenses, lighting kits, and audio gear in Colombo, Sri Lanka. Real-time availability.",
    url: "https://frametoque.com/rentals",
    siteName: "Frametoque Rentals",
    type: "website",
  },
  keywords: [
    "camera rental sri lanka",
    "camera hire colombo",
    "sony fx3 rental sri lanka",
    "cinema lens rental colombo",
    "filmmaking equipment hire sri lanka",
    "video production gear colombo",
    "lighting equipment rental sri lanka",
    "audio gear rental sri lanka",
    "frametoque rentals",
  ],
};

export default async function RentalsPage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string; search?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const [products, categories] = await Promise.all([
    getPublicRentals(),
    getPublicRentalCategories(),
  ]);

  const schemaData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LocalBusiness",
        "@id": "https://frametoque.com/rentals#store",
        name: "Frametoque Rentals Sri Lanka",
        url: "https://frametoque.com/rentals",
        telephone: "+94702771361",
        email: "info@frametoque.com",
        priceRange: "LKR",
        image: "https://frametoque.com/logos/ft/name-logo.png",
        address: {
          "@type": "PostalAddress",
          streetAddress: "35, Kopiwaththa Road",
          addressLocality: "Piliyandala",
          addressRegion: "Western Province",
          addressCountry: "LK",
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: 6.7978,
          longitude: 79.9238,
        },
        openingHoursSpecification: [
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
            opens: "08:00",
            closes: "21:00",
          },
        ],
      },
      {
        "@type": "ItemList",
        name: "Equipment Rental Catalog",
        itemListElement: products.slice(0, 30).map((product, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: product.item_name,
          url: `https://frametoque.com/rentals/${product.slug || product.id}`,
          image: product.image_url || undefined,
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />
      <RentalsClient
        initialProducts={products}
        categories={categories}
        initialCategory={resolvedParams.category}
      />
    </>
  );
}
