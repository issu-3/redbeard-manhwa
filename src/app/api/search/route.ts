import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toSeriesCardData } from '@/lib/data-mappers';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  const genreSlugs = searchParams.getAll('genre');

  if (!query && genreSlugs.length === 0) {
    return NextResponse.json({ success: true, data: [] });
  }

  try {
    const whereClause: any = {};
    
    if (query) {
      whereClause.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { alternativeTitles: { has: query } },
        { authors: { some: { name: { contains: query, mode: 'insensitive' } } } },
      ];
    }

    if (genreSlugs.length > 0) {
      whereClause.genres = {
        some: {
          slug: { in: genreSlugs }
        }
      };
    }

    const results = await prisma.series.findMany({
      where: whereClause,
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
