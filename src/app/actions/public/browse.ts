'use server';

import { getCachedBrowsePage } from '@/lib/browse-categories';
import { BROWSE_PAGE_SIZE, type BrowseCategory } from '@/lib/browse-constants';
import { getCachedSectionSeries } from '@/app/actions/public/homepage';
import type { SeriesCardData } from '@/types';

export interface LoadMoreBrowseResult {
  series: SeriesCardData[];
  // Exact total for the prisma-backed categories; null for 'latest', whose
  // feed is chapter-based — the client treats a short batch as the end.
  total: number | null;
}

export async function loadMoreBrowseSeries(
  category: BrowseCategory,
  offset: number,
): Promise<LoadMoreBrowseResult> {
  const safeOffset = Math.max(0, Math.floor(offset) || 0);

  if (category === 'latest') {
    // Latest is a distinct-series-by-recent-chapter feed; page it by growing
    // the cached fetch window and slicing, like the Latest page itself does.
    const updates = await getCachedSectionSeries(
      'RECENTLY_UPDATED',
      safeOffset + BROWSE_PAGE_SIZE,
      false,
      [],
    );
    const mapped = updates.map((u: any) => ({
      ...u.series,
      updatedAt: u.publishedAt,
    })) as SeriesCardData[];
    return { series: mapped.slice(safeOffset, safeOffset + BROWSE_PAGE_SIZE), total: null };
  }

  const series = await getCachedBrowsePage(category, safeOffset, BROWSE_PAGE_SIZE);
  return { series, total: null };
}
