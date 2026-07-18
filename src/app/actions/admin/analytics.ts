'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { unstable_cache } from 'next/cache';

async function checkAdmin() {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }
}

async function fetchAnalyticsData(range: string) {
  const now = new Date();
  let startDate = new Date();

  switch (range) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      break;
    case '7d':
      startDate.setDate(now.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(now.getDate() - 30);
      break;
    case 'all':
    default:
      startDate = new Date(0); // Beginning of time
      break;
  }

  // OVERVIEW METRICS (Real)
  const [
    newUsers,
    totalSeries,
    totalChapters,
    newComments,
    newBookmarks,
    readingHistory,
    seriesByStatusRaw,
    genreCounts,
    usersByRoleRaw
  ] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: startDate } } }),
    prisma.series.count({ where: { createdAt: { gte: startDate } } }),
    prisma.chapter.count({ where: { createdAt: { gte: startDate } } }),
    prisma.comment.count({ where: { createdAt: { gte: startDate } } }),
    prisma.bookmark.count({ where: { createdAt: { gte: startDate } } }),
    prisma.readingHistory.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true, userId: true }
    }),
    prisma.series.groupBy({
      by: ['status'],
      _count: { id: true },
      where: { createdAt: { gte: startDate } }
    }),
    prisma.genre.findMany({
      include: { _count: { select: { series: true } } },
      take: 5,
      orderBy: { seriesCount: 'desc' }
    }),
    prisma.user.groupBy({
      by: ['role'],
      _count: { id: true },
      where: { createdAt: { gte: startDate } }
    })
  ]);

  // TRAFFIC METRICS (Real)
  const trafficByDay: Record<string, number> = {};
  const uniqueUsers = new Set<string>();

  readingHistory.forEach(history => {
    const day = history.createdAt.toISOString().split('T')[0];
    trafficByDay[day] = (trafficByDay[day] || 0) + 1;
    uniqueUsers.add(history.userId);
  });

  const trafficData = Object.entries(trafficByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, views]) => ({ date, views }));

  const seriesByStatus = seriesByStatusRaw.map(s => ({
    name: s.status,
    value: s._count.id
  }));

  const usersByRole = usersByRoleRaw.map(r => ({
    name: r.role,
    value: r._count.id
  }));

  return {
    overview: {
      newUsers,
      totalSeries,
      totalChapters,
      newComments,
      newBookmarks,
      chapterViews: readingHistory.length,
      uniqueVisitors: uniqueUsers.size,
    },
    traffic: trafficData,
    content: {
      byStatus: seriesByStatus,
      topGenres: genreCounts.map(g => ({ name: g.name, value: g._count.series }))
    },
    users: usersByRole,
  };
}

export async function getAnalyticsData(range: string) {
  await checkAdmin();
  
  // Using unstable_cache to cache this for 5 minutes (300 seconds)
  // We use `range` as part of the key
  const getCachedData = unstable_cache(
    async (r: string) => fetchAnalyticsData(r),
    [`analytics_data_${range}`],
    { revalidate: 300, tags: [`analytics_${range}`] }
  );

  return getCachedData(range);
}
