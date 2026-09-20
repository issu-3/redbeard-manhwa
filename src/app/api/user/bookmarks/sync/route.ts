import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    const bookmarks = await prisma.bookmark.findMany({
      where: { userId },
      include: {
        series: {
          select: {
            id: true,
            title: true,
            slug: true,
            coverImage: true,
            status: true,
          }
        }
      },
    });

    const seriesList = bookmarks.map(b => ({
      seriesId: b.series.id,
      title: b.series.title,
      slug: b.series.slug,
      coverImage: b.series.coverImage,
      status: b.series.status,
    }));

    return NextResponse.json({ series: seriesList });
  } catch (error) {
    console.error('[Sync Bookmarks API] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
