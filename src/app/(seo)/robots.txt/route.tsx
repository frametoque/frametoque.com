export const GET = async () => {
  const content = `
User-agent: *
Allow: /
Allow: /_next/image
Disallow: /admin
Disallow: /admin/*
Disallow: /dashboard
Disallow: /dashboard/*
Disallow: /api/*

Sitemap: https://frametoque.com/sitemap
  `.trim();

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
};
