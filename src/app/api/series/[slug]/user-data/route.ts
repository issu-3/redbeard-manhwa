import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ isBookmarked: false, continueReadingChapter: null });
    }
    
    const { slug } = await params;

    const series = await prisma.series.findUnique({
      where: { slug },
      select: { id: true }
    });

    if (!series) {
      return NextResponse.json({ error: 'Series not found' }, { status: 404 });
    }

    const [bookmark, history] = await Promise.all([
      prisma.bookmark.findUnique({
        where: {
          userId_seriesId: {
            userId: session.user.id,
            seriesId: series.id
          }
        }
      }),
      prisma.readingHistory.findFirst({
        where: {
          userId: session.user.id,
          seriesId: series.id,
        },
        orderBy: {
          updatedAt: 'desc'
        },
        include: {
          chapter: true
        }
      })
    ]);

    return NextResponse.json({
      isBookmarked: !!bookmark,
      continueReadingChapter: history?.chapter?.number || null
    });
  } catch (error) {
    console.error('Failed to fetch user series data:', error);
    return NextResponse.json({ isBookmarked: false, continueReadingChapter: null }, { status: 500 });
  }
}
