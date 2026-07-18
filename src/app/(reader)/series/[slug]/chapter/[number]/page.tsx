import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ChapterReader } from '@/components/reader/ChapterReader';
import type { ChapterData } from '@/types';
import { auth } from '@/auth';

// ─── Data Fetching ───────────────────────────────────────────────

async function getChapterData(slug: string, number: number): Promise<ChapterData | null> {
  const series = await prisma.series.findUnique({
    where: { slug },
    select: { id: true, title: true, slug: true },
  });

  if (!series) return null;

  const chapter = await prisma.chapter.findUnique({
    where: {
      seriesId_number: {
        seriesId: series.id,
        number,
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
  const prevChapter = await prisma.chapter.findFirst({
    where: {
      seriesId: series.id,
      number: { lt: number },
      isPublished: true,
    },
    orderBy: { number: 'desc' },
    select: { number: true, slug: true },
  });

  // Find next chapter
  const nextChapter = await prisma.chapter.findFirst({
    where: {
      seriesId: series.id,
      number: { gt: number },
      isPublished: true,
    },
    orderBy: { number: 'asc' },
    select: { number: true, slug: true },
  });

  return {
    id: chapter.id,
    seriesId: series.id,
    seriesTitle: series.title,
    seriesSlug: series.slug,
    number: chapter.number,
    title: chapter.title || undefined,
    slug: chapter.slug,
    totalPages: chapter.totalPages || chapter.images.length,
    images: chapter.images.map((img) => ({
      id: img.id,
      pageNumber: img.pageNumber,
      imageUrl: img.imageUrl,
      width: img.width || undefined,
      height: img.height || undefined,
      blurHash: img.blurHash || undefined,
    })),
    prevChapter: prevChapter ? { number: prevChapter.number, slug: prevChapter.slug } : undefined,
    nextChapter: nextChapter ? { number: nextChapter.number, slug: nextChapter.slug } : undefined,
  };
}

// ─── Metadata ──────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; number: string }>;
}): Promise<Metadata> {
  const { slug, number } = await params;
  const chapterNum = parseFloat(number);
  
  if (isNaN(chapterNum)) return { title: 'Chapter Not Found' };
  
  const chapter = await getChapterData(slug, chapterNum);
  if (!chapter) return { title: 'Chapter Not Found' };

  return {
    title: `Ch. ${chapter.number}${chapter.title ? ` — ${chapter.title}` : ''} | ${chapter.seriesTitle}`,
    description: `Read ${chapter.seriesTitle} Chapter ${chapter.number}${chapter.title ? ` — ${chapter.title}` : ''} on REDBEARD. High quality manhwa reading experience.`,
    openGraph: {
      title: `${chapter.seriesTitle} - Chapter ${chapter.number}`,
      description: `Read Chapter ${chapter.number} of ${chapter.seriesTitle}`,
      images: chapter.images.length > 0 ? [{ url: chapter.images[0].imageUrl }] : [],
    },
    robots: {
      index: false,
      follow: true,
    },
  };
}

// ─── Page ──────────────────────────────────────────────────────

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ slug: string; number: string }>;
}) {
  const { slug, number } = await params;
  const chapterNum = parseFloat(number);
  
  if (isNaN(chapterNum)) {
    notFound();
  }

  const chapter = await getChapterData(slug, chapterNum);
  if (!chapter) {
    notFound();
  }

  // Record reading history in the background (or rather, when page loads)
  // We can do it right here since this is a server component
  const session = await auth();
  if (session?.user?.id) {
    try {
      await prisma.readingHistory.upsert({
        where: {
          userId_chapterId: {
            userId: session.user.id,
            chapterId: chapter.id,
          },
        },
        create: {
          userId: session.user.id,
          chapterId: chapter.id,
          seriesId: chapter.seriesId,
          pageNumber: 1,
        },
        update: {
          updatedAt: new Date(),
          // We don't overwrite pageNumber here, as they might have been further along.
          // Tracking actual scroll position requires a client-side API call.
        },
      });
      
      // Update lastReadAt on user
      await prisma.user.update({
        where: { id: session.user.id },
        data: { lastReadAt: new Date() }
      });
    } catch (e) {
      console.error('Failed to update reading history:', e);
    }
  }
  
  // Increment chapter view count
  try {
    await prisma.chapter.update({
      where: { id: chapter.id },
      data: { totalViews: { increment: 1 } }
    });
    // Also increment series view count
    await prisma.series.update({
      where: { id: chapter.seriesId },
      data: { totalViews: { increment: 1 } }
    });
  } catch (e) {
    console.error('Failed to increment view count:', e);
  }

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

  return <ChapterReader chapter={chapter} comments={commentsData} currentUserId={session?.user?.id} />;
}
