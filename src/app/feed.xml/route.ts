import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { APP_URL, APP_NAME, APP_DESCRIPTION } from '@/lib/constants';

export const revalidate = 3600; // 1 hour

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const baseUrl = APP_URL || 'https://redbeard.store';

  try {
    // Fetch latest 100 published chapters with their series info
    const latestChapters = await prisma.chapter.findMany({
      where: { isPublished: true },
      select: {
        slug: true,
        number: true,
        title: true,
        publishedAt: true,
        updatedAt: true,
        series: {
          select: {
            title: true,
            slug: true,
            description: true,
            coverImage: true,
          },
        },
      },
      orderBy: { publishedAt: 'desc' },
      take: 100,
    });

    // Also fetch latest 20 series (new additions)
    const latestSeries = await prisma.series.findMany({
      select: {
        title: true,
        slug: true,
        description: true,
        coverImage: true,
        type: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const now = new Date().toUTCString();

    // Build RSS items
    const chapterItems = latestChapters
      .filter((ch) => ch.series?.slug)
      .map((ch) => {
        const chSlug = ch.slug?.trim() ? ch.slug : String(ch.number);
        const url = `${baseUrl}/series/${ch.series.slug}/chapter/${chSlug}`;
        const title = ch.title
          ? `${ch.series.title} — ${ch.title}`
          : `${ch.series.title} — Chapter ${ch.number}`;
        const pubDate = (ch.publishedAt || ch.updatedAt).toUTCString();
        const description = `New chapter of ${ch.series.title} is now available to read on ${APP_NAME}.`;

        return `    <item>
      <title>${escapeXml(title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(description)}</description>
      <category>Chapter</category>
    </item>`;
      });

    const seriesItems = latestSeries.map((s) => {
      const url = `${baseUrl}/series/${s.slug}`;
      const title = `New Series: ${s.title}`;
      const pubDate = s.createdAt.toUTCString();
      const description = s.description
        ? s.description.slice(0, 300)
        : `${s.title} — a new ${s.type.toLowerCase()} is now available on ${APP_NAME}.`;

      return `    <item>
      <title>${escapeXml(title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(description)}</description>
      <category>Series</category>
    </item>`;
    });

    // Interleave: chapters first (most recent content), then series
    const allItems = [...chapterItems, ...seriesItems].join('\n');

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(APP_NAME)}</title>
    <link>${escapeXml(baseUrl)}</link>
    <description>${escapeXml(APP_DESCRIPTION)}</description>
    <language>en-us</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${escapeXml(baseUrl)}/feed.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>${escapeXml(baseUrl)}/icons/icon-512x512.png</url>
      <title>${escapeXml(APP_NAME)}</title>
      <link>${escapeXml(baseUrl)}</link>
    </image>
${allItems}
  </channel>
</rss>`;

    return new NextResponse(rss, {
      status: 200,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('RSS feed generation failed:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
