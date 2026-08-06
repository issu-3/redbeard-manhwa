'use server';

import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';

export interface WebsiteStats {
  activeSeries: number;
  totalChapters: number;
  totalViews: number;
  averageRating: number | null;
}

export const getWebsiteStatistics = unstable_cache(
  async (): Promise<WebsiteStats> => {
    try {
      // OPT-25: Run all stats queries concurrently
      const [activeSeries, totalChapters, viewsAggregation, ratingAggregation] = await Promise.all([
        prisma.series.count({ where: { status: { not: 'UPCOMING' } } }),
        prisma.chapter.count({ where: { isPublished: true } }),
        prisma.series.aggregate({ _sum: { totalViews: true } }),
        prisma.review.aggregate({ _avg: { rating: true } })
      ]);

      const totalViews = viewsAggregation._sum.totalViews || 0;
      const averageRating = ratingAggregation._avg.rating || null;

      return {
        activeSeries,
        totalChapters,
        totalViews,
        averageRating
      };
    } catch (error) {
      console.error('Failed to fetch website statistics:', error);
      return {
        activeSeries: 0,
        totalChapters: 0,
        totalViews: 0,
        averageRating: null
      };
    }
  },
  ['website-statistics'],
  { revalidate: 300, tags: ['website-stats'] }
);
