export const GET = async () => {
  const content = `
User-agent: *
Allow: /
Allow: /_next/image


Sitemap: https://frametoque.com/sitemap
  `.trim();

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
};
