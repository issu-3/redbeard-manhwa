import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';

const getCachedApiGenres = unstable_cache(
  async () => {
    return prisma.genre.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
      }
    });
  },
  ['api-genres-list'],
  { tags: ['genres'], revalidate: 86400 }
);

export async function GET(request: NextRequest) {
  try {
    const genres = await getCachedApiGenres();
    
    return NextResponse.json(
      { success: true, data: genres },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800'
        }
      }
    );
  } catch (error) {
    console.error('Failed to fetch genres:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
