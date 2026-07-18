import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  searchParams.get('q');
  parseInt(searchParams.get('limit') || '10', 10);

  try {
    // In production: full-text search with Prisma + PostgreSQL
    // const results = await prisma.series.findMany({
    //   where: {
    //     OR: [
    //       { title: { contains: query, mode: 'insensitive' } },
    //       { alternativeTitles: { has: query } },
    //       { authors: { some: { name: { contains: query, mode: 'insensitive' } } } },
    //     ],
    //   },
    //   take: limit,
    //   select: { id: true, title: true, slug: true, coverImage: true, type: true, status: true },
    // });

    return NextResponse.json({
      success: true,
      data: [],
      suggestions: [],
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { success: false, error: 'Search failed' },
      { status: 500 }
    );
  }
}
