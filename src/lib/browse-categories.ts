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
//
// Pagination design (fixed after two failed attempts): every page of a
// category — the first render and every Load More batch — is sliced from
// ONE cached snapshot: the category's full ordered id list. The earlier
// design cached each skip/take window as its own unstable_cache entry.
// That can never be consistent: unstable_cache keys include the
// stringified fetcher function but NOT the config object it closes over,
// so windows computed under an older ordering survived deploys and
// disagreed with each other (Trending paginated 24 -> 43 -> 44 of 50:
// batches overlapped, 6 series were unreachable, and the button hid
// early). Slicing one snapshot makes overlap/gap impossible, and the
// total is the snapshot's length, so "Showing X of Y" always reaches Y.

interface BrowseCategoryConfig {
  where: Prisma.SeriesWhereInput;
  // Array form with an id tiebreaker: the ordering must be total, or the
  // snapshot itself is unstable (tied values — e.g. many series with 0
  // bookmarks, or bulk-imported rows sharing updatedAt — would come back
  // in different orders on each snapshot rebuild).
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

// The single snapshot every page of a category is sliced from.
// IMPORTANT: bump the key version ('browse-category-ids-v1') whenever
// BROWSE_CATEGORY_CONFIG changes — unstable_cache keys do not include
// closure variables, so a config change alone would keep serving the
// old snapshot's ordering until revalidation.
const getCachedBrowseIds = unstable_cache(
  async (category: Exclude<BrowseCategory, 'latest'>): Promise<string[]> => {
    const config = BROWSE_CATEGORY_CONFIG[category];
    const rows = await prisma.series.findMany({
      where: config.where,
      select: { id: true },
      orderBy: config.orderBy,
    });
    return rows.map((r) => r.id);
  },
  ['browse-category-ids-v1'],
  { tags: ['browse', 'series-data'], revalidate: 3600 },
);

export async function getCachedBrowsePage(
  category: Exclude<BrowseCategory, 'latest'>,
  skip: number,
  take: number,
): Promise<SeriesCardData[]> {
  const ids = await getCachedBrowseIds(category);
  const pageIds = ids.slice(skip, skip + take);
  if (pageIds.length === 0) return [];
  // Card data is fetched fresh by id (cheap primary-key lookup); only the
  // ORDER comes from the snapshot, which is the part that must not drift.
  const rows = await prisma.series.findMany({
    where: { id: { in: pageIds } },
    select: SERIES_CARD_SELECT,
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const ordered: typeof rows = [];
  for (const id of pageIds) {
    const row = byId.get(id);
    if (row) ordered.push(row);
  }
  return ordered.map(toSeriesCardData);
}

export async function getCachedBrowseTotal(
  category: Exclude<BrowseCategory, 'latest'>,
): Promise<number> {
  const ids = await getCachedBrowseIds(category);
  return ids.length;
}
