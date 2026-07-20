import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import SearchClient from './SearchClient';

export const metadata: Metadata = { title: 'Search' };

export default async function SearchPage() {
  // Fetch dynamic genres from Prisma
  const genres = await prisma.genre.findMany({
    orderBy: { name: 'asc' },
    select: { name: true, slug: true, iconName: true, color: true }
  });

  // Calculate dynamic trending searches (e.g. top 8 most viewed series)
  const trending = await prisma.series.findMany({
    orderBy: { totalViews: 'desc' },
    take: 8,
    select: { title: true }
  });
  
  const trendingSearches = trending.map(s => s.title);

  return <SearchClient dynamicGenres={genres} dynamicTrending={trendingSearches} />;
}
