import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicRentalItemById, getPublicRentals } from "../../actions/rentals-public";
import ProductDetailsClient from "./ProductDetailsClient";

export const revalidate = 60; // revalidate every 60 seconds

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { product } = await getPublicRentalItemById(slug);

  if (!product) {
    return {
      title: {
        absolute: "Equipment Not Found | Frametoque Rentals",
      },
    };
  }

  const formatLKR = (amount: number) =>
    new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      maximumFractionDigits: 0,
    }).format(amount || 0);

  const pageUrl = `https://frametoque.com/rentals/${product.slug || product.id}`;
  const metaDescription =
    product.description ||
    `Rent the ${product.item_name} in Colombo, Sri Lanka at ${formatLKR(product.daily_rate)}/day. Check live shoot date availability and reserve directly via WhatsApp.`;

  return {
    title: {
      absolute: `${product.item_name} Rental Sri Lanka (${formatLKR(product.daily_rate)}/day) | Frametoque Rentals`,
    },
    description: metaDescription,
    alternates: {
      canonical: pageUrl,
    },
    keywords: [
      `${product.item_name} rental`,
      `rent ${product.item_name} sri lanka`,
      `${product.category} rental colombo`,
      `hire ${product.item_name}`,
      "camera equipment rental sri lanka",
      "frametoque rentals",
    ],
    openGraph: {
      title: `${product.item_name} Rental Sri Lanka | Frametoque Rentals`,
      description: `Daily rate: ${formatLKR(product.daily_rate)}. Shoot-ready ${product.category.toLowerCase()} available for rent in Colombo, Sri Lanka.`,
      url: pageUrl,
      siteName: "Frametoque Rentals",
      type: "website",
      images: product.image_url
        ? [
            {
              url: product.image_url,
              width: 1200,
              height: 630,
              alt: `${product.item_name} Rental`,
            },
          ]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.item_name} Rental Sri Lanka | Frametoque Rentals`,
      description: `Rent ${product.item_name} in Colombo for ${formatLKR(product.daily_rate)}/day.`,
      images: product.image_url ? [product.image_url] : [],
    },
  };
}

export default async function RentalProductPage({ params }: PageProps) {
  const { slug } = await params;
  const [{ product, bookedRanges }, allProducts] = await Promise.all([
    getPublicRentalItemById(slug),
    getPublicRentals(),
  ]);

  if (!product) {
    notFound();
  }

  // Cross-sell similar items in same category or other gear
  const similarProducts = allProducts
    .filter((p) => p.id !== product.id)
    .slice(0, 4);

  const productJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `https://frametoque.com/rentals/${product.slug || product.id}#product`,
        name: product.item_name,
        description: product.description || `Professional ${product.item_name} equipment available for hire in Sri Lanka.`,
        image: product.image_url ? [product.image_url] : undefined,
        category: product.category,
        brand: {
          "@type": "Brand",
          name: "Frametoque",
        },
        offers: {
          "@type": "Offer",
          url: `https://frametoque.com/rentals/${product.slug || product.id}`,
          priceCurrency: "LKR",
          price: product.daily_rate,
          priceValidUntil: "2027-12-31",
          availability: "https://schema.org/InStock",
          itemCondition: "https://schema.org/UsedCondition",
          businessFunction: "https://schema.org/Rental",
          seller: {
            "@type": "LocalBusiness",
            name: "Frametoque Rentals Sri Lanka",
            telephone: "+94702771361",
          },
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: "https://frametoque.com",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Rentals",
            item: "https://frametoque.com/rentals",
          },
          {
            "@type": "ListItem",
            position: 3,
            name: product.category,
            item: `https://frametoque.com/rentals?category=${encodeURIComponent(product.category)}`,
          },
          {
            "@type": "ListItem",
            position: 4,
            name: product.item_name,
            item: `https://frametoque.com/rentals/${product.slug || product.id}`,
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <ProductDetailsClient
        product={product}
        bookedRanges={bookedRanges}
        similarProducts={similarProducts}
      />
    </>
  );
}
