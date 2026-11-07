import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';

/**
 * Lightweight genre list (slug + name + series count) for internal-linking
 * navigation: homepage genre section, genre-page cross-links and the footer.
 * Cached for 24h and invalidated with the same tags as the browse genres
 * index, so rendering these links adds no per-request database queries.
 */
export const getCachedGenreList = unstable_cache(
  async () => {
    return prisma.genre.findMany({
      select: {
        slug: true,
        name: true,
        _count: { select: { series: true } },
      },
      orderBy: { name: 'asc' },
    });
  },
  ['genre-list-for-links'],
  { tags: ['genres', 'genres-list'], revalidate: 86400 }
);
