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

  const isAllTime = range === 'all';
  const initialTotalUsersPromise = isAllTime ? Promise.resolve(0) : prisma.user.count({ where: { createdAt: { lt: startDate } } });

  // 1. Current Period Counts & Data
  const [
    usersData,
    seriesData,
    chaptersData,
    commentsCount,
    bookmarksCount,
    readingHistory,
    initialTotalUsers,
    usersByRoleRaw
  ] = await Promise.all([
    prisma.user.findMany({ where: { createdAt: { gte: startDate } }, select: { createdAt: true } }),
    prisma.series.findMany({ where: { createdAt: { gte: startDate } }, select: { createdAt: true } }),
    prisma.chapter.findMany({ where: { createdAt: { gte: startDate } }, select: { createdAt: true } }),
    prisma.comment.count({ where: { createdAt: { gte: startDate } } }),
    prisma.bookmark.count({ where: { createdAt: { gte: startDate } } }),
    prisma.readingHistory.findMany({
      where: { createdAt: { gte: startDate } },
      select: { 
        createdAt: true, 
        userId: true,
        series: { select: { title: true, genres: { select: { name: true } } } } 
      }
    }),
    initialTotalUsersPromise,
    prisma.user.groupBy({
      by: ['role'],
      _count: { id: true },
      where: { createdAt: { gte: startDate } }
    })
  ]);

  const usersCount = usersData.length;
  const seriesCount = seriesData.length;
  const chaptersCount = chaptersData.length;

  const uniqueUsers = new Set<string>();
  readingHistory.forEach(h => uniqueUsers.add(h.userId));
  const activeUsersCount = uniqueUsers.size; 
  const viewsCount = readingHistory.length;

  // 2. Previous Period Counts (for trend calculation)
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

  // 4. Generating Continuous Days for Charts
  const getDatesBetween = (start: Date, end: Date) => {
    const dates = [];
    let current = new Date(start);
    current.setHours(0, 0, 0, 0);
    const stop = new Date(end);
    stop.setHours(0, 0, 0, 0);
    
    // If range is large (all time), let's limit the chart data points to a maximum of 90 days.
    if (isAllTime) {
      current = new Date();
      current.setDate(current.getDate() - 90);
    }
    
    while (current <= stop) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };
  const timelineDates = getDatesBetween(startDate, now);

  // Daily Traffic
  const viewsByDay: Record<string, number> = {};
  readingHistory.forEach(h => {
    const day = h.createdAt.toISOString().split('T')[0];
    viewsByDay[day] = (viewsByDay[day] || 0) + 1;
  });
  const trafficData = timelineDates.map(date => ({
    date,
    views: viewsByDay[date] || 0
  }));

  // User Growth
  const newUsersByDay: Record<string, number> = {};
  usersData.forEach(u => {
    const day = u.createdAt.toISOString().split('T')[0];
    newUsersByDay[day] = (newUsersByDay[day] || 0) + 1;
  });
  
  let currentCumulativeUsers = initialTotalUsers;
  // If 'all' time, usersData contains everything, so cumulative starts at 0
  if (isAllTime) {
     const earliestDateStr = timelineDates[0];
     // Count everything before the cut-off (90 days ago) to set baseline
     const cutoffDate = new Date(earliestDateStr);
     currentCumulativeUsers = usersData.filter(u => u.createdAt < cutoffDate).length;
  }

  const userGrowthData = timelineDates.map(date => {
    const newUsers = newUsersByDay[date] || 0;
    currentCumulativeUsers += newUsers;
    return {
      date,
      newUsers,
      cumulativeUsers: currentCumulativeUsers
    };
  });

  // Content Publishing
  const seriesByDay: Record<string, number> = {};
  seriesData.forEach(s => {
    const day = s.createdAt.toISOString().split('T')[0];
    seriesByDay[day] = (seriesByDay[day] || 0) + 1;
  });
  const chaptersByDay: Record<string, number> = {};
  chaptersData.forEach(c => {
    const day = c.createdAt.toISOString().split('T')[0];
    chaptersByDay[day] = (chaptersByDay[day] || 0) + 1;
  });
  const publishingData = timelineDates.map(date => ({
    date,
    series: seriesByDay[date] || 0,
    chapters: chaptersByDay[date] || 0
  }));

  // Reading Distribution
  const genreViews: Record<string, number> = {};
  const seriesViews: Record<string, number> = {};
  
  readingHistory.forEach(h => {
    if (h.series) {
      seriesViews[h.series.title] = (seriesViews[h.series.title] || 0) + 1;
      if (h.series.genres && h.series.genres.length > 0) {
        h.series.genres.forEach(g => {
          genreViews[g.name] = (genreViews[g.name] || 0) + 1;
        });
      }
    }
  });

  let readingDistributionData = Object.entries(genreViews)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }))
    .slice(0, 10); // Top 10 genres

  if (readingDistributionData.length === 0) {
    // Fallback to top series if no genres exist
    readingDistributionData = Object.entries(seriesViews)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }))
      .slice(0, 10);
  }

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
    charts: {
      dailyTraffic: trafficData,
      userGrowth: userGrowthData,
      publishingActivity: publishingData,
      readingDistribution: readingDistributionData,
    },
    users: usersByRole, // We can keep this just in case, or for another pie chart
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
