import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toSeriesCardData, SERIES_CARD_SELECT } from '@/lib/data-mappers';

declare global {
  var _searchLogBuffer: any[] | undefined;
}

const searchBuffer = globalThis._searchLogBuffer ?? [];
if (!globalThis._searchLogBuffer) globalThis._searchLogBuffer = searchBuffer;

async function flushSearchBuffer() {
  if (searchBuffer.length === 0) return;
  const items = [...searchBuffer];
  searchBuffer.length = 0;
  try {
    await prisma.auditLog.createMany({
      data: items,
      skipDuplicates: true
    });
  } catch (e) {
    console.error('Failed to flush search logs:', e);
  }
}

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
    const whereClause: import('@prisma/client').Prisma.SeriesWhereInput = {
      isNSFW: false,
      type: { notIn: ['PORNHWA', 'DOUJINSHI'] }
    };
    
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
      select: SERIES_CARD_SELECT,
      take: limit,
    });

    if (query && query.length >= 3) {
      // OPT-10: Skip auth() — it was only used for optional userId in audit logs.
      // Saves JWT verification CPU on every search keystroke.
      searchBuffer.push({
        action: 'SEARCH',
        targetType: 'SearchQuery',
        targetId: 'public',
        userId: undefined,
        metadata: { query: query.toLowerCase() }
      });
      if (searchBuffer.length >= 10) {
        flushSearchBuffer().catch(err => console.error('Failed to log search:', err));
      }
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
