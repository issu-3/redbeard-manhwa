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
  let prevStartDate = new Date();
  let prevEndDate = new Date();

  switch (range) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - 1);
      prevEndDate = new Date(startDate);
      break;
    case '7d':
      startDate.setDate(now.getDate() - 7);
      prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - 7);
      prevEndDate = new Date(startDate);
      break;
    case '30d':
      startDate.setDate(now.getDate() - 30);
      prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - 30);
      prevEndDate = new Date(startDate);
      break;
    case 'all':
    default:
      startDate = new Date(0);
      prevStartDate = new Date(0);
      prevEndDate = new Date(0);
      break;
  }

  // 1. Current Period Counts
  const [
    usersCount,
    seriesCount,
    chaptersCount,
    commentsCount,
    bookmarksCount,
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

  // Current active & unique visitors from reading history
  const uniqueUsers = new Set<string>();
  readingHistory.forEach(h => uniqueUsers.add(h.userId));
  const activeUsersCount = uniqueUsers.size; 
  const viewsCount = readingHistory.length;
  // uniqueVisitors is the same as activeUsers in this context, but we will provide both as requested

  // 2. Previous Period Counts (for trend calculation)
  const isAllTime = range === 'all';
  let prevUsersCount = 0, prevSeriesCount = 0, prevChaptersCount = 0;
  let prevCommentsCount = 0, prevBookmarksCount = 0, prevViewsCount = 0, prevActiveUsersCount = 0;

  if (!isAllTime) {
    const [
      pu, ps, pc, pcom, pb, prh
    ] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: prevStartDate, lt: prevEndDate } } }),
      prisma.series.count({ where: { createdAt: { gte: prevStartDate, lt: prevEndDate } } }),
      prisma.chapter.count({ where: { createdAt: { gte: prevStartDate, lt: prevEndDate } } }),
      prisma.comment.count({ where: { createdAt: { gte: prevStartDate, lt: prevEndDate } } }),
      prisma.bookmark.count({ where: { createdAt: { gte: prevStartDate, lt: prevEndDate } } }),
      prisma.readingHistory.findMany({
        where: { createdAt: { gte: prevStartDate, lt: prevEndDate } },
        select: { userId: true }
      })
    ]);
    prevUsersCount = pu;
    prevSeriesCount = ps;
    prevChaptersCount = pc;
    prevCommentsCount = pcom;
    prevBookmarksCount = pb;
    prevViewsCount = prh.length;
    const prevUnique = new Set<string>();
    prh.forEach(h => prevUnique.add(h.userId));
    prevActiveUsersCount = prevUnique.size;
  }

  const calcTrend = (current: number, prev: number) => {
    if (isAllTime || prev === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - prev) / prev) * 100);
  };

  // 3. Sparkline Data (Last 7 Days)
  const sparklineStart = new Date();
  sparklineStart.setDate(now.getDate() - 7);
  sparklineStart.setHours(0, 0, 0, 0);
  
  const [
    spUsers, spSeries, spChapters, spComments, spBookmarks, spHistory
  ] = await Promise.all([
    prisma.user.findMany({ where: { createdAt: { gte: sparklineStart } }, select: { createdAt: true } }),
    prisma.series.findMany({ where: { createdAt: { gte: sparklineStart } }, select: { createdAt: true } }),
    prisma.chapter.findMany({ where: { createdAt: { gte: sparklineStart } }, select: { createdAt: true } }),
    prisma.comment.findMany({ where: { createdAt: { gte: sparklineStart } }, select: { createdAt: true } }),
    prisma.bookmark.findMany({ where: { createdAt: { gte: sparklineStart } }, select: { createdAt: true } }),
    prisma.readingHistory.findMany({ where: { createdAt: { gte: sparklineStart } }, select: { createdAt: true, userId: true } })
  ]);

  const generateSparkline = (records: { createdAt: Date, userId?: string }[], countUniqueUsers = false) => {
    const days: Record<string, Set<string> | number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      days[d.toISOString().split('T')[0]] = countUniqueUsers ? new Set<string>() : 0;
    }
    records.forEach(r => {
      const day = r.createdAt.toISOString().split('T')[0];
      if (days[day] !== undefined) {
        if (countUniqueUsers && r.userId) {
          (days[day] as Set<string>).add(r.userId);
        } else {
          (days[day] as number) += 1;
        }
      }
    });
    return Object.keys(days).map(date => ({
      date,
      value: countUniqueUsers ? (days[date] as Set<string>).size : (days[date] as number)
    }));
  };

  const sparklines = {
    users: generateSparkline(spUsers),
    series: generateSparkline(spSeries),
    chapters: generateSparkline(spChapters),
    comments: generateSparkline(spComments),
    bookmarks: generateSparkline(spBookmarks),
    views: generateSparkline(spHistory),
    activeUsers: generateSparkline(spHistory, true),
  };

  // 4. Formatting output
  const trafficByDay: Record<string, number> = {};
  readingHistory.forEach(history => {
    const day = history.createdAt.toISOString().split('T')[0];
    trafficByDay[day] = (trafficByDay[day] || 0) + 1;
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
      users: { value: usersCount, trend: calcTrend(usersCount, prevUsersCount), sparkline: sparklines.users },
      activeUsers: { value: activeUsersCount, trend: calcTrend(activeUsersCount, prevActiveUsersCount), sparkline: sparklines.activeUsers },
      series: { value: seriesCount, trend: calcTrend(seriesCount, prevSeriesCount), sparkline: sparklines.series },
      chapters: { value: chaptersCount, trend: calcTrend(chaptersCount, prevChaptersCount), sparkline: sparklines.chapters },
      views: { value: viewsCount, trend: calcTrend(viewsCount, prevViewsCount), sparkline: sparklines.views },
      uniqueVisitors: { value: activeUsersCount, trend: calcTrend(activeUsersCount, prevActiveUsersCount), sparkline: sparklines.activeUsers },
      bookmarks: { value: bookmarksCount, trend: calcTrend(bookmarksCount, prevBookmarksCount), sparkline: sparklines.bookmarks },
      comments: { value: commentsCount, trend: calcTrend(commentsCount, prevCommentsCount), sparkline: sparklines.comments },
    },
    traffic: trafficData,
    content: {
      byStatus: seriesByStatus,
      topGenres: genreCounts.map(g => ({ name: g.name, value: g._count.series }))
    },
    users: usersByRole,
    lastUpdated: new Date().toISOString(),
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
