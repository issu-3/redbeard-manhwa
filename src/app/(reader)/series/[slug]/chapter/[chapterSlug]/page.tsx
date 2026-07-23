import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ChapterReader } from '@/components/reader/ChapterReader';
import type { ChapterData } from '@/types';
import { auth } from '@/auth';
import { APP_URL } from '@/lib/constants';
import { getCachedSettings } from '@/app/actions/public/settings';
import { AdRenderer } from '@/components/ads/AdRenderer';

// ─── Data Fetching ───────────────────────────────────────────────

async function getChapterData(slug: string, chapterSlug: string): Promise<ChapterData | null> {
  const series = await prisma.series.findUnique({
    where: { slug },
    select: { id: true, title: true, slug: true },
  });

  if (!series) return null;

  const chapter = await prisma.chapter.findUnique({
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

  if (!chapter) return null;

  // Find previous chapter
  let prevChapter = null;
  if (chapter.number !== null) {
    prevChapter = await prisma.chapter.findFirst({
      where: {
        seriesId: series.id,
        number: { lt: chapter.number },
        isPublished: true,
      },
      orderBy: { number: 'desc' },
      select: { number: true, slug: true },
    });
  }

  // Find next chapter
  let nextChapter = null;
  if (chapter.number !== null) {
    nextChapter = await prisma.chapter.findFirst({
      where: {
        seriesId: series.id,
        number: { gt: chapter.number },
        isPublished: true,
      },
      orderBy: { number: 'asc' },
      select: { number: true, slug: true },
    });
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
    externalUrl: chapter.externalUrl || undefined,
    externalProvider: chapter.externalProvider || undefined,
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
}

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
  const siteTitle = settings.seo_site_title || 'REDBEARD';
  
  const defaultTitle = `${chapter.seriesTitle} ${chapter.label || `Chapter ${chapter.number}`} - Read Online | ${settings.siteName || 'REDBEARD'}`;
  const defaultDesc = `Read ${chapter.seriesTitle} ${chapter.label || `Chapter ${chapter.number}`}${chapter.title ? ` - ${chapter.title}` : ''} online on ${settings.siteName || 'REDBEARD'}. High quality manhwa reading experience.`;
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

  // Handle external redirect
  if (chapter.sourceType === 'EXTERNAL' && chapter.externalUrl) {
    // Record reading history before redirecting
    const session = await auth();
    if (session?.user?.id) {
      await prisma.readingHistory.upsert({
        where: {
          userId_chapterId: {
            userId: session.user.id,
            chapterId: chapter.id,
          },
        },
        update: {
          pageNumber: 1,
          updatedAt: new Date(),
        },
        create: {
          userId: session.user.id,
          chapterId: chapter.id,
          seriesId: chapter.seriesId,
          pageNumber: 1,
        },
      });

      // Update lastReadAt on user
      await prisma.user.update({
        where: { id: session.user.id },
        data: { lastReadAt: new Date() },
      });
    }

    // Record view counts for external chapters
    try {
      const { headers } = await import('next/headers');
      const headersList = await headers();
      const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || null;
      
      await prisma.chapter.update({
        where: { id: chapter.id },
        data: { totalViews: { increment: 1 } },
      });
      await prisma.series.update({
        where: { id: chapter.seriesId },
        data: { totalViews: { increment: 1 } },
      });
      
      await prisma.viewLog.create({
        data: {
          seriesId: chapter.seriesId,
          chapterId: chapter.id,
          userId: session?.user?.id || null,
          ipAddress: ipAddress ? ipAddress.split(',')[0].trim() : null,
        }
      });
    } catch (e) {
      console.error('Failed to increment view count for external chapter:', e);
    }

    // Redirect to the external URL
    redirect(chapter.externalUrl);
  }

  // Reading history and view tracking is now handled asynchronously via client-side API call
  // to prevent blocking the server render thread (TTFB optimization).

  // Fetch comments
  const commentsData = await prisma.comment.findMany({
    where: { chapterId: chapter.id },
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

  const session = await auth();
  
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

  return (
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
  );
}
