import { APP_URL } from '@/lib/constants';
import { prisma } from '@/lib/prisma';

export const revalidate = 3600;

export async function GET() {
  const baseUrl = APP_URL || 'http://localhost:3000';
  let numSitemaps = 1;
  try {
    const chapterCount = await prisma.chapter.count({ where: { isPublished: true } });
    numSitemaps = Math.max(1, Math.ceil(chapterCount / 20000));
  } catch (error) {
    console.error('Failed to get chapter count for sitemap index', error);
  }

  let sitemapsXml = '';
  for (let i = 0; i < numSitemaps; i++) {
    sitemapsXml += `
  <sitemap>
    <loc>${baseUrl}/sitemap/${i}.xml</loc>
  </sitemap>`;
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapsXml}
</sitemapindex>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
