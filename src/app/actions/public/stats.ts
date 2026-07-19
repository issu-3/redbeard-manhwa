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
      // 1. Active Series (Assuming all non-UPCOMING are active/published)
      const activeSeries = await prisma.series.count({
        where: {
          status: { not: 'UPCOMING' }
        }
      });

      // 2. Total Chapters
      const totalChapters = await prisma.chapter.count({
        where: { isPublished: true }
      });

      // 3. Total Views (Sum of totalViews from Series model)
      const viewsAggregation = await prisma.series.aggregate({
        _sum: { totalViews: true }
      });
      const totalViews = viewsAggregation._sum.totalViews || 0;

      // 4. Average Rating
      const ratingAggregation = await prisma.rating.aggregate({
        _avg: { score: true }
      });
      const averageRating = ratingAggregation._avg.score || null;

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
