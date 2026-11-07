import { unstable_cache } from 'next/cache';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { SERIES_CARD_SELECT, toSeriesCardData } from '@/lib/data-mappers';
import type { SeriesCardData } from '@/types';

// Shared data layer for the /browse/* category pages and their Load More
// action. Previously every category page hard-capped its query at take: 40
// with no way to reach the remaining series; pages now fetch the first
// BROWSE_PAGE_SIZE results plus a total count, and the client Load More
// button pages through the rest via loadMoreBrowseSeries.

export const BROWSE_PAGE_SIZE = 24;

export type BrowseCategory =
  | 'trending'
  | 'popular'
  | 'completed'
  | 'ongoing'
  | 'new-releases'
  | 'latest';

interface BrowseCategoryConfig {
  where: Prisma.SeriesWhereInput;
  orderBy: Prisma.SeriesOrderByWithRelationInput;
}

export const BROWSE_CATEGORY_CONFIG: Record<
  Exclude<BrowseCategory, 'latest'>,
  BrowseCategoryConfig
> = {
  trending: { where: {}, orderBy: { totalBookmarks: 'desc' } },
  popular: { where: {}, orderBy: { totalViews: 'desc' } },
  completed: { where: { status: 'COMPLETED' }, orderBy: { updatedAt: 'desc' } },
  ongoing: { where: { status: 'ONGOING' }, orderBy: { updatedAt: 'desc' } },
  'new-releases': { where: {}, orderBy: { createdAt: 'desc' } },
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
