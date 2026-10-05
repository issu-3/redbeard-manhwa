
'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { unstable_cache } from 'next/cache';

async function checkAdmin() {
  const session = await auth();
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MODERATOR')) {
    throw new Error('Unauthorized');
  }
}

export async function fetchAnalyticsData(range: string) {
  // C5 FIX: This exported server action must verify admin access
  await checkAdmin();
  
  const getCachedData = unstable_cache(
    async () => fetchAnalyticsDataInternal(range),
    [`admin-analytics-data-${range}`],
    { tags: [`admin-analytics-${range}`, 'admin-analytics'], revalidate: 60 }
  );
  
  return getCachedData();
}

async function fetchAnalyticsDataInternal(range: string) {
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

  const isAllTime = range === 'all';

  // --- 1. OVERVIEW COUNTS ---
  const [
    usersCount, seriesCount, chaptersCount, commentsCount, bookmarksCount, viewsCount, activeUsersCount, uniqueVisitorsData,
    prevUsersCount, prevSeriesCount, prevChaptersCount, prevCommentsCount, prevBookmarksCount, prevViewsCount, prevActiveUsersCount, prevUniqueVisitorsData
  ] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: startDate } } }),
    prisma.series.count({ where: { createdAt: { gte: startDate } } }),
    prisma.chapter.count({ where: { createdAt: { gte: startDate } } }),
    prisma.comment.count({ where: { createdAt: { gte: startDate } } }),
    prisma.bookmark.count({ where: { createdAt: { gte: startDate } } }),
    prisma.viewLog.count({ where: { createdAt: { gte: startDate } } }),
    prisma.user.count({ where: { lastReadAt: { gte: startDate } } }),
    prisma.viewLog.groupBy({ by: ['ipAddress'], where: { createdAt: { gte: startDate }, ipAddress: { not: null } } }),
    
    isAllTime ? 0 : prisma.user.count({ where: { createdAt: { gte: prevStartDate, lt: prevEndDate } } }),
    isAllTime ? 0 : prisma.series.count({ where: { createdAt: { gte: prevStartDate, lt: prevEndDate } } }),
    isAllTime ? 0 : prisma.chapter.count({ where: { createdAt: { gte: prevStartDate, lt: prevEndDate } } }),
    isAllTime ? 0 : prisma.comment.count({ where: { createdAt: { gte: prevStartDate, lt: prevEndDate } } }),
    isAllTime ? 0 : prisma.bookmark.count({ where: { createdAt: { gte: prevStartDate, lt: prevEndDate } } }),
    isAllTime ? 0 : prisma.viewLog.count({ where: { createdAt: { gte: prevStartDate, lt: prevEndDate } } }),
    isAllTime ? 0 : prisma.user.count({ where: { lastReadAt: { gte: prevStartDate, lt: prevEndDate } } }),
    isAllTime ? [] : prisma.viewLog.groupBy({ by: ['ipAddress'], where: { createdAt: { gte: prevStartDate, lt: prevEndDate }, ipAddress: { not: null } } })
  ]);

  const uniqueVisitorsCount = uniqueVisitorsData.length;
  const prevUniqueVisitorsCount = isAllTime ? 0 : prevUniqueVisitorsData.length;

  const calcTrend = (current: number, prev: number) => {
    if (isAllTime || prev === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - prev) / prev) * 100);
  };

  // --- 2. SPARKLINE DATA (Last 7 Days) ---
  const sparklineStart = new Date();
  sparklineStart.setDate(now.getDate() - 7);
  sparklineStart.setHours(0, 0, 0, 0);

  const [
    spUsers, spSeries, spChapters, spComments, spBookmarks, spViews, spActiveUsers
  ] = await Promise.all([
    prisma.$queryRaw<{date: Date, count: bigint}[]>`SELECT DATE_TRUNC('day', "createdAt") as date, COUNT(*) as count FROM "users" WHERE "createdAt" >= ${sparklineStart} GROUP BY 1`,
    prisma.$queryRaw<{date: Date, count: bigint}[]>`SELECT DATE_TRUNC('day', "createdAt") as date, COUNT(*) as count FROM "series" WHERE "createdAt" >= ${sparklineStart} GROUP BY 1`,
    prisma.$queryRaw<{date: Date, count: bigint}[]>`SELECT DATE_TRUNC('day', "createdAt") as date, COUNT(*) as count FROM "chapters" WHERE "createdAt" >= ${sparklineStart} GROUP BY 1`,
    prisma.$queryRaw<{date: Date, count: bigint}[]>`SELECT DATE_TRUNC('day', "createdAt") as date, COUNT(*) as count FROM "comments" WHERE "createdAt" >= ${sparklineStart} GROUP BY 1`,
    prisma.$queryRaw<{date: Date, count: bigint}[]>`SELECT DATE_TRUNC('day', "createdAt") as date, COUNT(*) as count FROM "bookmarks" WHERE "createdAt" >= ${sparklineStart} GROUP BY 1`,
    prisma.$queryRaw<{date: Date, count: bigint}[]>`SELECT DATE_TRUNC('day', "createdAt") as date, COUNT(*) as count FROM "view_logs" WHERE "createdAt" >= ${sparklineStart} GROUP BY 1`,
    prisma.$queryRaw<{date: Date, count: bigint}[]>`SELECT DATE_TRUNC('day', "createdAt") as date, COUNT(DISTINCT "ipAddress") as count FROM "view_logs" WHERE "createdAt" >= ${sparklineStart} AND "ipAddress" IS NOT NULL GROUP BY 1`
  ]);

  const formatSparklineData = (raw: {date: Date, count: bigint}[]) => {
    const days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      days[d.toISOString().split('T')[0]] = 0;
    }
    raw.forEach(r => {
      const day = r.date.toISOString().split('T')[0];
      if (days[day] !== undefined) {
        days[day] = Number(r.count);
      }
    });
    return Object.keys(days).map(date => ({ date, value: days[date] }));
  };

  const sparklines = {
    users: formatSparklineData(spUsers),
    series: formatSparklineData(spSeries),
    chapters: formatSparklineData(spChapters),
    comments: formatSparklineData(spComments),
    bookmarks: formatSparklineData(spBookmarks),
    views: formatSparklineData(spViews),
    activeUsers: formatSparklineData(spActiveUsers),
  };

  // --- 3. CHARTS DATA ---
  const chartStart = isAllTime ? new Date(new Date().setDate(now.getDate() - 90)) : startDate;
  
  const [
    chartViews, chartUsers, chartSeries, chartChapters,
    topSeriesRaw, mostReadChaptersRaw, topGenresRaw
  ] = await Promise.all([
    prisma.$queryRaw<{date: Date, count: bigint}[]>`SELECT DATE_TRUNC('day', "createdAt") as date, COUNT(*) as count FROM "view_logs" WHERE "createdAt" >= ${chartStart} GROUP BY 1`,
    prisma.$queryRaw<{date: Date, count: bigint}[]>`SELECT DATE_TRUNC('day', "createdAt") as date, COUNT(*) as count FROM "users" WHERE "createdAt" >= ${chartStart} GROUP BY 1`,
    prisma.$queryRaw<{date: Date, count: bigint}[]>`SELECT DATE_TRUNC('day', "createdAt") as date, COUNT(*) as count FROM "series" WHERE "createdAt" >= ${chartStart} GROUP BY 1`,
    prisma.$queryRaw<{date: Date, count: bigint}[]>`SELECT DATE_TRUNC('day', "createdAt") as date, COUNT(*) as count FROM "chapters" WHERE "createdAt" >= ${chartStart} GROUP BY 1`,
    
    // Series, Chapters, and Genres aggregated by real views in the date range
    prisma.viewLog.groupBy({
      by: ['seriesId'],
      _count: { id: true },
      where: { createdAt: { gte: chartStart } },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    }),
    prisma.viewLog.groupBy({
      by: ['chapterId'],
      _count: { id: true },
      where: { createdAt: { gte: chartStart } },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    }),
    prisma.$queryRaw<any[]>`
      SELECT g.name, COUNT(v.id) as count
      FROM "view_logs" v
      JOIN "series" s ON v."seriesId" = s.id
      JOIN "_GenreToSeries" gs ON s.id = gs."B"
      JOIN "genres" g ON gs."A" = g.id
      WHERE v."createdAt" >= ${chartStart}
      GROUP BY g.id, g.name
      ORDER BY count DESC
      LIMIT 10
    `
  ]);

  const getDatesBetween = (start: Date, end: Date) => {
    const dates = [];
    let current = new Date(start);
    current.setHours(0, 0, 0, 0);
    const stop = new Date(end);
    stop.setHours(0, 0, 0, 0);
    while (current <= stop) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };
  const timelineDates = getDatesBetween(chartStart, now);

  const viewsByDay: Record<string, number> = {};
  chartViews.forEach(v => { viewsByDay[v.date.toISOString().split('T')[0]] = Number(v.count); });
  const trafficData = timelineDates.map(date => ({ date, views: viewsByDay[date] || 0 }));

  const usersByDay: Record<string, number> = {};
  chartUsers.forEach(u => { usersByDay[u.date.toISOString().split('T')[0]] = Number(u.count); });
  const initialCumulativeUsers = isAllTime ? 0 : await prisma.user.count({ where: { createdAt: { lt: chartStart } } });
  let cumulative = initialCumulativeUsers;
  const userGrowthData = timelineDates.map(date => {
    const newUsers = usersByDay[date] || 0;
    cumulative += newUsers;
    return { date, newUsers, cumulativeUsers: cumulative };
  });

  const seriesByDay: Record<string, number> = {};
  chartSeries.forEach(s => { seriesByDay[s.date.toISOString().split('T')[0]] = Number(s.count); });
  const chaptersByDay: Record<string, number> = {};
  chartChapters.forEach(c => { chaptersByDay[c.date.toISOString().split('T')[0]] = Number(c.count); });
  const publishingData = timelineDates.map(date => ({ date, series: seriesByDay[date] || 0, chapters: chaptersByDay[date] || 0 }));

  const seriesIds = topSeriesRaw.map(v => v.seriesId);
  const seriesData = await prisma.series.findMany({
    where: { id: { in: seriesIds } },
    select: { id: true, title: true, totalBookmarks: true }
  });
  
  const topSeries = topSeriesRaw.map(v => {
    const s = seriesData.find(sd => sd.id === v.seriesId);
    return {
      name: s?.title || 'Unknown',
      views: v._count.id,
      bookmarks: s?.totalBookmarks || 0
    };
  });

  const chapterIds = mostReadChaptersRaw.map(v => v.chapterId);
  const chapterData = await prisma.chapter.findMany({
    where: { id: { in: chapterIds } },
    select: { id: true, series: { select: { title: true } }, number: true, title: true, label: true }
  });

  const mostReadChapters = mostReadChaptersRaw.map(v => {
    const c = chapterData.find(cd => cd.id === v.chapterId);
    if (!c) return { name: 'Unknown', views: v._count.id };
    const chLabel = c.label ? c.label : (c.number !== null ? `Ch ${c.number}` : (c.title || 'Latest'));
    return { name: `${c.series?.title || 'Unknown'} - ${chLabel}`, views: v._count.id };
  });

  const topGenres = topGenresRaw.map(g => ({ name: String(g.name), count: Number(g.count) }));

  // Device & Country Stats are empty because JWT auth does not use the Session table,
  // and ViewLog lacks userAgent/geolocation.
  const deviceStats: any[] = [];
  const countryStats: any[] = [];

  const rawRetention = await prisma.$queryRaw<any[]>`
    WITH cohort_users AS (
      SELECT id, DATE_TRUNC('week', "createdAt") AS cohort_week
      FROM "users"
      WHERE "createdAt" >= CURRENT_DATE - INTERVAL '4 weeks'
    ),
    user_activity AS (
      SELECT "userId", DATE_TRUNC('week', "createdAt") AS activity_week
      FROM "view_logs"
      WHERE "userId" IS NOT NULL AND "createdAt" >= CURRENT_DATE - INTERVAL '4 weeks'
      GROUP BY 1, 2
    )
    SELECT 
      c.cohort_week,
      COUNT(DISTINCT c.id) as cohort_size,
      COUNT(DISTINCT CASE WHEN a.activity_week = c.cohort_week THEN c.id END) as week0,
      COUNT(DISTINCT CASE WHEN a.activity_week = c.cohort_week + INTERVAL '1 week' THEN c.id END) as week1,
      COUNT(DISTINCT CASE WHEN a.activity_week = c.cohort_week + INTERVAL '2 weeks' THEN c.id END) as week2,
      COUNT(DISTINCT CASE WHEN a.activity_week = c.cohort_week + INTERVAL '3 weeks' THEN c.id END) as week3,
      COUNT(DISTINCT CASE WHEN a.activity_week = c.cohort_week + INTERVAL '4 weeks' THEN c.id END) as week4
    FROM cohort_users c
    LEFT JOIN user_activity a ON c.id = a."userId"
    GROUP BY c.cohort_week
    ORDER BY c.cohort_week ASC
  `;

  const retentionData = rawRetention.map(r => {
    const size = Number(r.cohort_size) || 1;
    return {
      cohort: r.cohort_week.toISOString().split('T')[0],
      week0: Math.round((Number(r.week0) / size) * 100),
      week1: Math.round((Number(r.week1) / size) * 100),
      week2: Math.round((Number(r.week2) / size) * 100),
      week3: Math.round((Number(r.week3) / size) * 100),
      week4: Math.round((Number(r.week4) / size) * 100),
    };
  });

  const searchLogsRaw = await prisma.$queryRaw<any[]>`
    SELECT metadata->>'query' as query, COUNT(*) as count
    FROM "audit_logs"
    WHERE action = 'SEARCH' AND "createdAt" >= ${chartStart}
    GROUP BY metadata->>'query'
    ORDER BY count DESC
    LIMIT 10
  `;
  const searchAnalytics = searchLogsRaw.filter(r => r.query).map(r => ({
    query: String(r.query),
    count: Number(r.count)
  }));
  const readingDistributionData = topGenres.slice(0, 5).map(g => ({ name: g.name, value: g.count }));

  return {
    overview: {
      users: { value: usersCount, trend: calcTrend(usersCount, prevUsersCount), sparkline: sparklines.users },
      activeUsers: { value: activeUsersCount, trend: calcTrend(activeUsersCount, prevActiveUsersCount), sparkline: sparklines.activeUsers },
      series: { value: seriesCount, trend: calcTrend(seriesCount, prevSeriesCount), sparkline: sparklines.series },
      chapters: { value: chaptersCount, trend: calcTrend(chaptersCount, prevChaptersCount), sparkline: sparklines.chapters },
      views: { value: viewsCount, trend: calcTrend(viewsCount, prevViewsCount), sparkline: sparklines.views },
      uniqueVisitors: { value: uniqueVisitorsCount, trend: calcTrend(uniqueVisitorsCount, prevUniqueVisitorsCount), sparkline: sparklines.activeUsers },
      bookmarks: { value: bookmarksCount, trend: calcTrend(bookmarksCount, prevBookmarksCount), sparkline: sparklines.bookmarks },
      comments: { value: commentsCount, trend: calcTrend(commentsCount, prevCommentsCount), sparkline: sparklines.comments },
    },
    charts: {
      dailyTraffic: trafficData,
      userGrowth: userGrowthData,
      publishingActivity: publishingData,
      readingDistribution: readingDistributionData,
      topSeries,
      mostReadChapters,
      topGenres,
      deviceStats,
      countryStats,
      retentionData,
      searchAnalytics
    },
    lastUpdated: new Date().toISOString(),
  };
}

export async function getAnalyticsData(range: string) {
  await checkAdmin();
  
  const getCachedData = unstable_cache(
    async () => fetchAnalyticsDataInternal(range),
    [`analytics_data_${range}`],
    { revalidate: 300, tags: [`analytics_${range}`] }
  );

  return getCachedData();
}
