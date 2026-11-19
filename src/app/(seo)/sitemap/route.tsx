import { getPublicRentals } from "@/app/actions/rentals-public";

export const dynamic = "force-dynamic";

export const GET = async () => {
  const baseUrl = "https://frametoque.com";

  const staticPages = [
    { slug: "", priority: "1.0", changefreq: "weekly" },
    { slug: "about", priority: "0.8", changefreq: "monthly" },
    { slug: "projects", priority: "0.8", changefreq: "monthly" },
    { slug: "contact", priority: "0.8", changefreq: "monthly" },
    { slug: "services", priority: "0.9", changefreq: "weekly" },
    { slug: "rentals", priority: "1.0", changefreq: "daily" },
    { slug: "rentals/contact", priority: "0.8", changefreq: "monthly" },
    { slug: "rentals/faq", priority: "0.8", changefreq: "monthly" },
    { slug: "rentals/terms", priority: "0.6", changefreq: "monthly" },
  ];

  const serviceCategories = [
    "web-dev",
    "graphic-design",
    "video-editing",
    "photo-video",
    "saas-products",
  ];

  const projectCategories = [
    "web-dev",
    "graphic-design",
    "video-editing",
    "photography",
    "videography",
  ];

  const servicesData = [
    { id: "portfolio-websites", category: "web-dev" },
    { id: "business-websites", category: "web-dev" },
    { id: "ecommerce-websites", category: "web-dev" },
    { id: "learning-platforms", category: "web-dev" },
    { id: "media-websites", category: "web-dev" },
    { id: "booking-systems", category: "web-dev" },
    { id: "education-websites", category: "web-dev" },

    { id: "short-form-video-editing", category: "video-editing" },
    { id: "long-form-video-editing", category: "video-editing" },
    { id: "social-media-video-editing", category: "video-editing" },
    { id: "motion-graphic-and-annimation", category: "video-editing" },
    { id: "corporate-and-business-videos", category: "video-editing" },
    { id: "content-creator-video-editing", category: "video-editing" },

    { id: "basic-photography", category: "photo-video" },
    { id: "basic-videography", category: "photo-video" },
    { id: "standard-photo-video", category: "photo-video" },
    { id: "extended-event-package", category: "photo-video" },
    { id: "premium-cinematic-package", category: "photo-video" },
    { id: "ultimate-production-package", category: "photo-video" },

    { id: "logo-design", category: "graphic-design" },
    { id: "socialmedia-post-design", category: "graphic-design" },
    { id: "promotional-design", category: "graphic-design" },
    { id: "stationery-design", category: "graphic-design" },
    { id: "webgraphic", category: "graphic-design" },

    { id: "accounting-inventory-system", category: "saas-products" },
  ];

  type UrlEntry = {
    loc: string;
    changefreq: string;
    priority: string;
  };

  const urls: UrlEntry[] = [];

  staticPages.forEach(({ slug, priority, changefreq }) => {
    urls.push({
      loc: `${baseUrl}/${slug}`,
      changefreq,
      priority,
    });
  });

  serviceCategories.forEach((cat) => {
    urls.push({
      loc: `${baseUrl}/services/${cat}`,
      changefreq: "weekly",
      priority: "0.9",
    });
  });

  projectCategories.forEach((cat) => {
    urls.push({
      loc: `${baseUrl}/projects/${cat}`,
      changefreq: "monthly",
      priority: "0.7",
    });
  });

  servicesData.forEach((service) => {
    urls.push({
      loc: `${baseUrl}/services/${service.category}/${service.id}`,
      changefreq: "monthly",
      priority: "0.7",
    });
  });

  // Dynamic Rentals Gear Products
  try {
    const rentalProducts = await getPublicRentals();
    rentalProducts.forEach((product) => {
      urls.push({
        loc: `${baseUrl}/rentals/${product.slug || product.id}`,
        changefreq: "weekly",
        priority: "0.8",
      });
    });
  } catch (err) {
    console.error("Failed to load rental items for sitemap:", err);
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls
    .map(
      ({ loc, changefreq, priority }) => `
  <url>
    <loc>${loc}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
    )
    .join("")}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      "Content-Type": "text/xml",
    },
  });
};