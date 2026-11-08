import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import SearchClient from './SearchClient';
import { unstable_cache } from 'next/cache';

import { generateMetadata as generateSeoMetadata } from '@/lib/seo';
import { APP_URL } from '@/lib/constants';
import { getCachedSettings } from '@/app/actions/public/settings';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getCachedSettings();
  return generateSeoMetadata({
    title: 'Search',
    description: 'Search thousands of series. Find your next read on REDBEARD.',
    url: `${APP_URL}/search`,
    noindex: true,
    settings,
  });
}

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

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { genres, trendingSearches } = await getCachedSearchFilterData();
  // Shared/bookmarked search links (e.g. /search?q=love) must run the search
  // on load, so the initial query comes from the URL, not just local state.
  const sp = await searchParams;
  const initialQuery = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim() || '';

  return (
    <div className="flex flex-col w-full">
      <h1 className="sr-only">Search Comics, Manga & Manhwa Online</h1>
      <SearchClient
        key={initialQuery}
        initialQuery={initialQuery}
        dynamicGenres={genres}
        dynamicTrending={trendingSearches}
      />
    </div>
  );
}
