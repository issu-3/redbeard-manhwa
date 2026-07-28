import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import SearchClient from './SearchClient';
import { unstable_cache } from 'next/cache';

export const metadata: Metadata = { title: 'Search' };

const getCachedSearchFilterData = unstable_cache(
  async () => {
    const [genres, trending] = await Promise.all([
      prisma.genre.findMany({
        orderBy: { name: 'asc' },
        select: { name: true, slug: true, iconName: true, color: true }
      }),
      prisma.series.findMany({
        orderBy: { totalViews: 'desc' },
        take: 8,
        select: { title: true }
      })
    ]);
    return { genres, trendingSearches: trending.map(s => s.title) };
  },
  ['search-filter-data'],
  { tags: ['genres', 'trending'], revalidate: 3600 }
);

export default async function SearchPage() {
  const { genres, trendingSearches } = await getCachedSearchFilterData();

  return (
    <div className="flex flex-col w-full">
      <SearchClient dynamicGenres={genres} dynamicTrending={trendingSearches} />
    </div>
  );
}
