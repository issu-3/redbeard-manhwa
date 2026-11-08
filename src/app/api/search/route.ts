import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toSeriesCardData, SERIES_CARD_SELECT } from '@/lib/data-mappers';


export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  
  // H6 FIX: Cap limit to 50 max to prevent resource exhaustion
  let limit = parseInt(searchParams.get('limit') || '20', 10);
  if (isNaN(limit) || limit < 1) limit = 20;
  limit = Math.min(limit, 50);

  let skip = parseInt(searchParams.get('skip') || '0', 10);
  if (isNaN(skip) || skip < 0) skip = 0;

  const genreSlugs = searchParams.getAll('genre');
  const typeParam = searchParams.get('type');
  const statusParam = searchParams.get('status');
  const sortParam = searchParams.get('sort');

  try {
    const whereClause: import('@prisma/client').Prisma.SeriesWhereInput = {};
    
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

    // Validate + normalize before casting: an unknown or lowercase
    // type/status must never reach Prisma as a raw enum cast (that throws
    // and surfaces as a 500). Unknown values are ignored (no filter).
    const SERIES_TYPES = ['MANHWA', 'MANGA', 'MANHUA', 'WEBTOON', 'PORNHWA', 'DOUJINSHI', 'COMIC', 'LIGHT_NOVEL'];
    const normalizedType = typeParam?.toUpperCase();
    if (normalizedType && SERIES_TYPES.includes(normalizedType)) {
      whereClause.type = normalizedType as import('@prisma/client').SeriesType;
    }

    const SERIES_STATUSES = ['ONGOING', 'COMPLETED', 'HIATUS', 'CANCELLED', 'UPCOMING'];
    const normalizedStatus = statusParam?.toUpperCase();
    if (normalizedStatus && SERIES_STATUSES.includes(normalizedStatus)) {
      whereClause.status = normalizedStatus as import('@prisma/client').SeriesStatus;
    }

    let orderByClause: import('@prisma/client').Prisma.SeriesOrderByWithRelationInput | import('@prisma/client').Prisma.SeriesOrderByWithRelationInput[] = [
      { totalViews: 'desc' },
      { id: 'asc' }
    ];
    if (sortParam === 'latest') {
      orderByClause = [{ updatedAt: 'desc' }, { id: 'asc' }];
    } else if (sortParam === 'newest') {
      orderByClause = [{ createdAt: 'desc' }, { id: 'asc' }];
    } else if (sortParam === 'rating') {
      orderByClause = [{ averageRating: 'desc' }, { id: 'asc' }];
    } else if (sortParam === 'popular' || sortParam === 'views') {
      orderByClause = [{ totalViews: 'desc' }, { id: 'asc' }];
    } else if (sortParam === 'bookmarks') {
      orderByClause = [{ totalBookmarks: 'desc' }, { id: 'asc' }];
    } else if (sortParam === 'alphabetical') {
      orderByClause = [{ title: 'asc' }, { id: 'asc' }];
    } else if (sortParam === 'updated') {
      orderByClause = [{ updatedAt: 'desc' }, { id: 'asc' }];
    }

    const results = await prisma.series.findMany({
      where: whereClause,
      select: SERIES_CARD_SELECT,
      take: limit,
      skip: skip,
      orderBy: orderByClause,
    });

    return NextResponse.json(
      {
        success: true,
        data: results.map(toSeriesCardData),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
        }
      }
    );
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { success: false, error: 'Search failed' },
      { status: 500 }
    );
  }
}
