import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ChapterReader } from '@/components/reader/ChapterReader';
import type { ChapterData } from '@/types';
import { auth } from '@/auth';
import { APP_URL } from '@/lib/constants';
import { getCachedSettings } from '@/app/actions/public/settings';
import { AdRenderer } from '@/components/ads/AdRenderer';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
// OPT-21: Pre-render recent chapters at build time
export async function generateStaticParams() {
  const chapters = await prisma.chapter.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: 'desc' },
    take: 200,
    select: { slug: true, series: { select: { slug: true } } }
  });
  return chapters.map((c) => ({
    slug: c.series.slug,
    chapterSlug: c.slug,
  }));
}

// ─── Data Fetching ───────────────────────────────────────────────

const getCachedChapterDataInternal = unstable_cache(
  async (slug: string, chapterSlug: string): Promise<ChapterData | null> => {
    const series = await prisma.series.findUnique({
      where: { slug },
      select: { id: true, title: true, slug: true },
    });

    if (!series) return null;

    let chapter = null;
    if (chapterSlug && chapterSlug !== 'null' && chapterSlug !== 'undefined') {
      chapter = await prisma.chapter.findUnique({
        where: {
          seriesId_slug: {
            seriesId: series.id,
            slug: chapterSlug,
          },
        },
        include: {
          images: {
            orderBy: { pageNumber: 'asc' },
          },
        },
      });

      if (!chapter) {
        const numericSlug = Number(chapterSlug);
        chapter = await prisma.chapter.findFirst({
          where: {
            seriesId: series.id,
            isPublished: true,
            OR: [
              ...(!isNaN(numericSlug) ? [{ number: numericSlug }] : []),
              { slug: `chapter-${chapterSlug}` },
              { slug: { equals: chapterSlug, mode: 'insensitive' as const } },
              { label: { equals: chapterSlug, mode: 'insensitive' as const } },
            ],
          },
          include: {
            images: {
              orderBy: { pageNumber: 'asc' },
            },
          },
        });
      }
    }

    if (!chapter) {
      chapter = await prisma.chapter.findFirst({
        where: { seriesId: series.id, isPublished: true },
        orderBy: [{ number: 'asc' }, { createdAt: 'asc' }],
        include: {
          images: {
            orderBy: { pageNumber: 'asc' },
          },
        },
      });
    }

    if (!chapter) return null;

    // Find adjacent chapters concurrently
    let prevChapter = null;
    let nextChapter = null;
    if (chapter.number !== null) {
      [prevChapter, nextChapter] = await Promise.all([
        prisma.chapter.findFirst({
          where: {
            seriesId: series.id,
            number: { lt: chapter.number },
            isPublished: true,
          },
          orderBy: { number: 'desc' },
          select: { number: true, slug: true },
        }),
        prisma.chapter.findFirst({
          where: {
            seriesId: series.id,
            number: { gt: chapter.number },
            isPublished: true,
          },
          orderBy: { number: 'asc' },
          select: { number: true, slug: true },
        })
      ]);
    }

    return {
      id: chapter.id,
      seriesId: series.id,
      seriesTitle: series.title,
      seriesSlug: series.slug,
      number: chapter.number,
      title: chapter.title || undefined,
      slug: chapter.slug,
      totalPages: chapter.totalPages || chapter.images.length,
      sourceType: chapter.sourceType || 'UPLOAD',
      downloadUrl: chapter.downloadUrl || undefined,
      downloadProvider: chapter.downloadProvider || undefined,
      images: chapter.images?.map((img: any) => ({
        id: img.id,
        pageNumber: img.pageNumber,
        imageUrl: img.imageUrl,
        width: img.width || undefined,
        height: img.height || undefined,
        blurHash: img.blurHash || undefined,
      })) || [],
      prevChapter: prevChapter ? { number: prevChapter.number, slug: prevChapter.slug } : undefined,
      nextChapter: nextChapter ? { number: nextChapter.number, slug: nextChapter.slug } : undefined,
      seo: chapter.seo as Record<string, string> | undefined,
    };
  },
  ['chapter-reader-data'],
  { tags: ['chapter-data'], revalidate: 3600 }
);

const getChapterData = cache(async (slug: string, chapterSlug: string): Promise<ChapterData | null> => {
  return getCachedChapterDataInternal(slug, chapterSlug);
});

// OPT-05: Cache comments to avoid hitting DB on every chapter page load
const getCachedChapterComments = unstable_cache(
  async (chapterId: string) => {
    return prisma.comment.findMany({
      where: { chapterId },
      include: {
        user: {
          select: { displayName: true, username: true, avatarUrl: true, role: true }
        },
        replies: {
          include: {
            user: {
              select: { displayName: true, username: true, avatarUrl: true, role: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  },
  ['chapter-comments'],
  { tags: ['comments'], revalidate: 60 }
);

// ─── Metadata ──────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; chapterSlug: string }>;
}): Promise<Metadata> {
  const { slug, chapterSlug } = await params;
  
  const chapter = await getChapterData(slug, chapterSlug);
  const settings = await getCachedSettings();
  
  if (!chapter) return { title: 'Chapter Not Found' };

  const seo = chapter.seo || {};
  const _siteTitle = settings.seo_site_title || 'REDBEARD';
  
  const defaultTitle = `${chapter.seriesTitle} ${chapter.label || `Chapter ${chapter.number}`} - Download | ${settings.siteName || 'REDBEARD'}`;
  const defaultDesc = `Download ${chapter.seriesTitle} ${chapter.label || `Chapter ${chapter.number}`}${chapter.title ? ` - ${chapter.title}` : ''} on ${settings.siteName || 'REDBEARD'}. High quality download experience.`;
  const defaultUrl = `${APP_URL}/series/${slug}/chapter/${chapterSlug}`;
  const defaultImage = chapter.images.length > 0 ? chapter.images[0].imageUrl : undefined;

  const title = seo.title || defaultTitle;
  const description = seo.description || defaultDesc;
  const canonical = seo.canonicalUrl || defaultUrl;
  const robots = seo.robots || 'index, follow';
  const ogImage = seo.ogImage || defaultImage;
  const twitterImage = seo.twitterImage || defaultImage;
  const keywords = seo.keywords ? seo.keywords.split(',').map(k => k.trim()) : undefined;
  
  return {
    title,
    description,
    keywords,
    robots,
    openGraph: {
      title,
      description,
      images: ogImage ? [{ url: ogImage, width: 800, height: 1200, alt: title }] : [],
      url: canonical,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: twitterImage ? [twitterImage] : undefined,
    },
    alternates: {
      canonical: canonical,
    },
  };
}

// ─── Page ──────────────────────────────────────────────────────

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ slug: string; chapterSlug: string }>;
}) {
  const { slug, chapterSlug } = await params;
  
  const chapter = await getChapterData(slug, chapterSlug);
  if (!chapter) {
    notFound();
  }

  if (chapter.slug !== chapterSlug) {
    redirect(`/series/${slug}/chapter/${chapter.slug}`);
  }

  // OPT-06: Call auth() once and reuse throughout the function
  const session = await auth();

  // Handle external redirect
  if (chapter.sourceType === 'DOWNLOAD' && chapter.downloadUrl) {
    // OPT-07: Parallelize all DB writes instead of running sequentially
    const writePromises: Promise<any>[] = [];
    
    // Record view counts for external chapters
    try {
      const { headers } = await import('next/headers');
      const headersList = await headers();
      const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || null;
      
      writePromises.push(
        prisma.chapter.update({
          where: { id: chapter.id },
          data: { totalViews: { increment: 1 } },
        }),
        prisma.series.update({
          where: { id: chapter.seriesId },
          data: { totalViews: { increment: 1 } },
        }),
        prisma.viewLog.create({
          data: {
            seriesId: chapter.seriesId,
            chapterId: chapter.id,
            userId: session?.user?.id || null,
            ipAddress: ipAddress ? ipAddress.split(',')[0].trim() : null,
          }
        })
      );
    } catch (e) {
      console.error('Failed to prepare view count writes:', e);
    }

    // OPT-07: Fire all writes concurrently and unblock the response using after()
    // Make sure to require next/server in the file or dynamically import it
    const { after } = await import('next/server');
    after(() => {
      Promise.allSettled(writePromises).catch(e => console.error(e));
    });

    // Ensure the external URL is absolute to prevent relative redirect bugs
    let targetUrl = chapter.downloadUrl;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = `https://${targetUrl}`;
    }

    // Redirect to the external URL
    redirect(targetUrl);
  }

  // Reading history and view tracking is now handled asynchronously via client-side API call
  // to prevent blocking the server render thread (TTFB optimization).

  // OPT-05: Use cached comments query
  const commentsData = await getCachedChapterComments(chapter.id);
  
  // Fetch User Preferences
  let userPreferences = {};
  if (session?.user?.id) {
    const userRecord = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { preferences: true }
    });
    if (userRecord?.preferences) {
      userPreferences = userRecord.preferences as Record<string, any>;
    }
  }

  const settings = await getCachedSettings();

  const siteUrl = APP_URL || 'http://localhost:3000';
  const chapterUrl = `${siteUrl}/series/${slug}/chapter/${chapterSlug}`;

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: chapter.seriesTitle,
        item: `${siteUrl}/series/${slug}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: chapter.label || `Chapter ${chapter.number}`,
        item: chapterUrl,
      }
    ]
  };

  const chapterLd = {
    '@context': 'https://schema.org',
    '@type': 'Chapter',
    name: chapter.title || chapter.label || `Chapter ${chapter.number}`,
    isPartOf: {
      '@type': 'ComicSeries',
      name: chapter.seriesTitle,
      url: `${siteUrl}/series/${slug}`
    },
    url: chapterUrl,
    image: chapter.images.length > 0 ? chapter.images[0].imageUrl : undefined
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(chapterLd) }}
      />
      {/* SEO: Server-rendered crawlable link back to parent series for Googlebot */}
      <Link href={`/series/${slug}`} className="sr-only">
        Back to {chapter.seriesTitle}
      </Link>
      <ChapterReader 
        chapter={chapter} 
        comments={commentsData} 
        currentUserId={session?.user?.id} 
        adSlotTop={<AdRenderer placement="reader_top" />}
        adSlotMiddle={<AdRenderer placement="reader_middle" />}
        adSlotBottom={<AdRenderer placement="reader_bottom" />}
        userPreferences={userPreferences}
        defaultReadingMode={settings.defaultReadingMode || 'vertical'}
        youtubeUrl={settings.youtubeUrl || null}
      />
    </>
  );
}
