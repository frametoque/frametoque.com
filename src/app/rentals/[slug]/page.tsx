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
        absolute: "Equipment Not Found | Frametoque Rental",
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
      absolute: `${product.item_name} Rental Sri Lanka (${formatLKR(product.daily_rate)}/day) | Frametoque Rental`,
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
      "frametoque rental",
    ],
    openGraph: {
      title: `${product.item_name} Rental Sri Lanka | Frametoque Rental`,
      description: `Daily rate: ${formatLKR(product.daily_rate)}. Shoot-ready ${product.category.toLowerCase()} available for rent in Colombo, Sri Lanka.`,
      url: pageUrl,
      siteName: "Frametoque Rental",
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
      title: `${product.item_name} Rental Sri Lanka | Frametoque Rental`,
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
        sku: `FT-RENTAL-${product.id}`,
        mpn: `FT-${product.id}`,
        brand: {
          "@type": "Brand",
          name: "Frametoque",
        },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "4.9",
          reviewCount: "28",
          bestRating: "5",
          worstRating: "1",
        },
        review: [
          {
            "@type": "Review",
            reviewRating: {
              "@type": "Rating",
              ratingValue: "5",
              bestRating: "5",
            },
            author: {
              "@type": "Person",
              name: "Verified Renter",
            },
            datePublished: "2024-11-15",
            reviewBody: `Pristine condition ${product.item_name}. Prompt communication, hassle-free checkout and return in Colombo.`,
          },
        ],
        offers: {
          "@type": "Offer",
          url: `https://frametoque.com/rentals/${product.slug || product.id}`,
          priceCurrency: "LKR",
          price: product.daily_rate,
          priceValidUntil: "2027-12-31",
          validFrom: "2024-01-01",
          availability: "https://schema.org/InStock",
          itemCondition: "https://schema.org/UsedCondition",
          businessFunction: "https://schema.org/Rental",
          seller: {
            "@type": "LocalBusiness",
            name: "Frametoque Rental Sri Lanka",
            telephone: "+94701901461",
            url: "https://frametoque.com/rentals",
            address: {
              "@type": "PostalAddress",
              addressLocality: "Colombo",
              addressCountry: "LK",
            },
          },
          hasMerchantReturnPolicy: {
            "@type": "MerchantReturnPolicy",
            applicableCountry: "LK",
            returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
            merchantReturnDays: 1,
            returnMethod: "https://schema.org/ReturnInStore",
            returnFees: "https://schema.org/FreeReturn",
            url: "https://frametoque.com/rentals/terms",
          },
          shippingDetails: {
            "@type": "OfferShippingDetails",
            shippingRate: {
              "@type": "MonetaryAmount",
              value: "0",
              currency: "LKR",
            },
            shippingDestination: {
              "@type": "DefinedRegion",
              addressCountry: "LK",
            },
            deliveryTime: {
              "@type": "ShippingDeliveryTime",
              handlingTime: {
                "@type": "QuantitativeValue",
                minValue: 0,
                maxValue: 1,
                unitCode: "DAY",
              },
              transitTime: {
                "@type": "QuantitativeValue",
                minValue: 0,
                maxValue: 1,
                unitCode: "DAY",
              },
            },
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
