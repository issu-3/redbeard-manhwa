import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toSeriesDetail } from '@/lib/data-mappers';
import { unstable_cache } from 'next/cache';

const getCachedApiSeriesDetail = unstable_cache(
  async (slug: string) => {
    const series = await prisma.series.findUnique({
      where: { slug },
      include: {
        genres: true,
        tags: true,
        authors: true,
        artists: true,
        chapters: {
          where: { isPublished: true },
          orderBy: [{ number: 'desc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            number: true,
            label: true,
            title: true,
            slug: true,
            totalPages: true,
            totalViews: true,
            publishedAt: true,
            sourceType: true,
            downloadUrl: true,
            downloadProvider: true,
          },
        },
      },
    });

    if (!series) return null;
    return toSeriesDetail(series as any);
  },
  ['api-series-detail'],
  { tags: ['series-data'], revalidate: 3600 }
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json({ success: false, error: 'Slug is required' }, { status: 400 });
    }

    const data = await getCachedApiSeriesDetail(slug);

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Series not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600'
        }
      }
    );
  } catch (error) {
    console.error('Failed to fetch series detail:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
