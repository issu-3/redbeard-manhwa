export function generateSitemapXml(
  items: { url: string; lastModified?: Date; changeFrequency?: string; priority?: number }[]
) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${items
    .map((item) => {
      let xml = `<url>\n    <loc>${item.url}</loc>`;
      if (item.lastModified) {
        xml += `\n    <lastmod>${item.lastModified.toISOString()}</lastmod>`;
      }
      if (item.changeFrequency) {
        xml += `\n    <changefreq>${item.changeFrequency}</changefreq>`;
      }
      if (item.priority) {
        xml += `\n    <priority>${item.priority.toFixed(1)}</priority>`;
      }
      xml += `\n  </url>`;
      return xml;
    })
    .join('\n  ')}
</urlset>
`;
}
