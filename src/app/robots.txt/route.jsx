export const GET = async () => {
  const content = `
User-agent: *
Allow: /

Sitemap: https://frametoque.online/sitemap
  `.trim();

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
};
