import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toSeriesCardData } from '@/lib/data-mappers';
import { auth } from '@/auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  
  // H6 FIX: Cap limit to 50 max to prevent resource exhaustion
  let limit = parseInt(searchParams.get('limit') || '10', 10);
  if (isNaN(limit) || limit < 1) limit = 10;
  limit = Math.min(limit, 50);

  const genreSlugs = searchParams.getAll('genre');

  if (!query && genreSlugs.length === 0) {
    return NextResponse.json({ success: true, data: [] });
  }

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

    const results = await prisma.series.findMany({
      where: whereClause,
      include: {
        genres: true,
      },
      take: limit,
    });

    if (query) {
      // M8 FIX: Include user ID in audit log if authenticated
      const session = await auth();
      
      // Log search analytics asynchronously so we don't block the request
      prisma.auditLog.create({
        data: {
          action: 'SEARCH',
          targetType: 'SearchQuery',
          targetId: 'public',
          userId: session?.user?.id || undefined,
          metadata: { query: query.toLowerCase() }
        }
      }).catch(err => console.error('Failed to log search:', err));
    }

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
