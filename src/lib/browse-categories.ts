import { unstable_cache } from 'next/cache';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { SERIES_CARD_SELECT, toSeriesCardData } from '@/lib/data-mappers';
import type { BrowseCategory } from '@/lib/browse-constants';
import type { SeriesCardData } from '@/types';

// Shared data layer for the /browse/* category pages and their Load More
// action. Previously every category page hard-capped its query at take: 40
// with no way to reach the remaining series; pages now fetch the first
// BROWSE_PAGE_SIZE results plus a total count, and the client Load More
// button pages through the rest via loadMoreBrowseSeries.
// (BROWSE_PAGE_SIZE / BrowseCategory live in browse-constants.ts so the
// client BrowseGrid never imports this server-only module.)

interface BrowseCategoryConfig {
  where: Prisma.SeriesWhereInput;
  // Array form with an id tiebreaker: skip/take pagination across separate
  // queries is only stable if the ordering is total. With a single sort key,
  // tied values (e.g. many series with 0 bookmarks, or bulk-imported rows
  // sharing updatedAt) come back in different orders per query, so Load More
  // batches overlap/gap and some series become unreachable.
  orderBy: Prisma.SeriesOrderByWithRelationInput[];
}

export const BROWSE_CATEGORY_CONFIG: Record<
  Exclude<BrowseCategory, 'latest'>,
  BrowseCategoryConfig
> = {
  trending: { where: {}, orderBy: [{ totalBookmarks: 'desc' }, { id: 'asc' }] },
  popular: { where: {}, orderBy: [{ totalViews: 'desc' }, { id: 'asc' }] },
  completed: { where: { status: 'COMPLETED' }, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }] },
  ongoing: { where: { status: 'ONGOING' }, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }] },
  'new-releases': { where: {}, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }] },
};

export const getCachedBrowsePage = unstable_cache(
  async (
    category: Exclude<BrowseCategory, 'latest'>,
    skip: number,
    take: number,
  ): Promise<SeriesCardData[]> => {
    const config = BROWSE_CATEGORY_CONFIG[category];
    const rows = await prisma.series.findMany({
      where: config.where,
      select: SERIES_CARD_SELECT,
      skip,
      take,
      orderBy: config.orderBy,
    });
    return rows.map(toSeriesCardData);
  },
  ['browse-category-page'],
  { tags: ['browse', 'series-data'], revalidate: 3600 },
);

export const getCachedBrowseTotal = unstable_cache(
  async (category: Exclude<BrowseCategory, 'latest'>): Promise<number> => {
    const config = BROWSE_CATEGORY_CONFIG[category];
    return prisma.series.count({ where: config.where });
  },
  ['browse-category-total'],
  { tags: ['browse', 'series-data'], revalidate: 3600 },
);
