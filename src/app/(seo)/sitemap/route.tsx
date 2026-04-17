export const GET = async () => {
  const baseUrl = "https://frametoque.online";

  const staticPages = [
    "",
    "about",
    "projects",
    "contact",
    "services",
    "terms",
    "privacy",
    "cookies",
  ];

  const serviceCategories = [
    "web-dev",
    "graphic-design",
    "video-editing",
    "photo-video",
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
  { id: "standard-videography", category: "photo-video" },
  { id: "extended-event-package", category: "photo-video" },
  { id: "premium-cinematic-package", category: "photo-video" },
  { id: "ultimate-production-package", category: "photo-video" },

  { id: "logo-design", category: "graphic-design" },
  { id: "socialmedia-post-design", category: "graphic-design" },
  { id: "promotional-design", category: "graphic-design" },
  { id: "stationery-design", category: "graphic-design" },
  { id: "webgraphic", category: "graphic-design" },
];



  const urls: string[] = [];

  staticPages.forEach((page) => {
    urls.push(`${baseUrl}/${page}`);
  });

  serviceCategories.forEach((cat) => {
    urls.push(`${baseUrl}/services/${cat}`);
  });

  projectCategories.forEach((cat) => {
    urls.push(`${baseUrl}/projects/${cat}`);
  });

  servicesData.forEach((service) => {
    urls.push(`${baseUrl}/services/${service.category}/${service.id}`);
  });

  // Generate XML
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${urls
      .map(
        (url) => `
      <url>
        <loc>${url}</loc>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
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
