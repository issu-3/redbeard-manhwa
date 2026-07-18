'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

async function checkAdmin() {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }
}

export async function getAnalyticsData(range: string) {
  await checkAdmin();

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
  const totalUsers = await prisma.user.count({ where: { createdAt: { gte: startDate } } });
  const totalSeries = await prisma.series.count({ where: { createdAt: { gte: startDate } } });
  const totalChapters = await prisma.chapter.count({ where: { createdAt: { gte: startDate } } });
  const totalComments = await prisma.comment.count({ where: { createdAt: { gte: startDate } } });

  // TRAFFIC METRICS (Real)
  const readingHistory = await prisma.readingHistory.findMany({
    where: { createdAt: { gte: startDate } },
    select: { createdAt: true }
  });
  
  // Aggregate history by day to form a timeline for Traffic
  const trafficByDay: Record<string, number> = {};
  readingHistory.forEach(history => {
    const day = history.createdAt.toISOString().split('T')[0];
    trafficByDay[day] = (trafficByDay[day] || 0) + 1;
  });

  const trafficData = Object.entries(trafficByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, views]) => ({ date, views }));

  // CONTENT METRICS (Real)
  const seriesByStatusRaw = await prisma.series.groupBy({
    by: ['status'],
    _count: { id: true },
    where: { createdAt: { gte: startDate } }
  });
  const seriesByStatus = seriesByStatusRaw.map(s => ({
    name: s.status,
    value: s._count.id
  }));

  const genreCounts = await prisma.genre.findMany({
    include: { _count: { select: { series: true } } },
    take: 5,
    orderBy: { seriesCount: 'desc' }
  });

  // USERS METRICS (Real)
  const usersByRoleRaw = await prisma.user.groupBy({
    by: ['role'],
    _count: { id: true },
    where: { createdAt: { gte: startDate } }
  });
  const usersByRole = usersByRoleRaw.map(r => ({
    name: r.role,
    value: r._count.id
  }));

  // MOCKED METRICS
  const generateMockTrend = (days: number, base: number, variance: number) => {
    const data = [];
    for (let i = days; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      data.push({
        date: d.toISOString().split('T')[0],
        value: Math.floor(Math.max(0, base + (Math.random() * variance * 2 - variance)))
      });
    }
    return data;
  };

  const daysCount = range === 'today' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : 90;

  const revenueData = generateMockTrend(daysCount, 500, 200).map(d => ({ date: d.date, revenue: d.value }));
  const totalRevenue = revenueData.reduce((acc, curr) => acc + curr.revenue, 0);

  const deviceData = [
    { name: 'Mobile', value: 65 },
    { name: 'Desktop', value: 25 },
    { name: 'Tablet', value: 10 }
  ];

  const searchData = [
    { query: 'solo leveling', count: 1204 },
    { query: 'action', count: 850 },
    { query: 'romance', count: 620 },
    { query: 'omniscient reader', count: 430 }
  ];

  const systemHealth = {
    uptime: '99.98%',
    avgResponseTime: '124ms',
    databaseLoad: '32%',
    activeConnections: 45
  };

  const errorLogs = [
    { id: 1, type: 'Network', message: 'Failed to fetch image proxy', time: '10 mins ago', level: 'warning' },
    { id: 2, type: 'Database', message: 'Connection pool exhausted (P2037)', time: '2 hours ago', level: 'error' },
    { id: 3, type: 'Auth', message: 'Invalid JWT signature', time: '5 hours ago', level: 'info' }
  ];

  return {
    overview: {
      totalUsers,
      totalSeries,
      totalChapters,
      totalComments
    },
    traffic: trafficData,
    content: {
      byStatus: seriesByStatus,
      topGenres: genreCounts.map(g => ({ name: g.name, value: g._count.series }))
    },
    users: usersByRole,
    revenue: {
      total: totalRevenue,
      timeline: revenueData
    },
    devices: deviceData,
    search: searchData,
    system: systemHealth,
    errors: errorLogs
  };
}
