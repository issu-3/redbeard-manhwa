import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toSeriesCardData } from '@/lib/data-mappers';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  if (!query) {
    return NextResponse.json({ success: true, data: [] });
  }

  try {
    const results = await prisma.series.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { alternativeTitles: { has: query } },
          { authors: { some: { name: { contains: query, mode: 'insensitive' } } } },
        ],
      },
      include: {
        genres: true,
      },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: results.map(toSeriesCardData),
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { success: false, error: 'Search failed' },
      { status: 500 }
    );
  }
}
