import { prisma } from '@/lib/prisma';
import { Library, Users, BookOpen, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { unstable_cache } from 'next/cache';

const getCachedAdminDashboardData = unstable_cache(
  async () => {
    const [
      totalSeries,
      totalUsers,
      totalChapters,
      pendingReports,
      recentUsers,
      recentSeries
    ] = await Promise.all([
      prisma.series.count(),
      prisma.user.count(),
      prisma.chapter.count(),
      prisma.report.count({ where: { status: 'PENDING' } }),
      prisma.user.findMany({ take: 5, orderBy: { createdAt: 'desc' } }),
      prisma.series.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, slug: true, coverImage: true, type: true, status: true, totalViews: true, chapterCount: true, createdAt: true }
      })
    ]);
    return { totalSeries, totalUsers, totalChapters, pendingReports, recentUsers, recentSeries };
  },
  ['admin-dashboard-stats'],
  { tags: ['admin-dashboard-stats'], revalidate: 60 }
);

export default async function AdminDashboard() {
  let totalSeries = 0;
  let totalUsers = 0;
  let totalChapters = 0;
  let pendingReports = 0;
  let recentUsers: any[] = [];
  let recentSeries: any[] = [];
  let dbError: string | null = null;

  try {
    const data = await getCachedAdminDashboardData();
    totalSeries = data.totalSeries;
    totalUsers = data.totalUsers;
    totalChapters = data.totalChapters;
    pendingReports = data.pendingReports;
    recentUsers = data.recentUsers;
    recentSeries = data.recentSeries;
  } catch (err: any) {
    console.error('Failed to fetch admin dashboard stats:', err);
    dbError = err?.message || 'Database connection unreachable or plan limit reached.';
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {dbError && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-400 flex items-start gap-3 shadow-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500 mt-0.5" />
          <div>
            <h4 className="font-bold text-red-300">Database Connection Warning</h4>
            <p className="text-sm mt-1 opacity-90 leading-relaxed">{dbError}</p>
            <p className="text-xs mt-2 text-red-300/80 font-mono">Tip: If using Prisma Cloud / Accelerate on Vercel, check your usage plan limits in console.prisma.io or switch DATABASE_URL to direct Postgres.</p>
          </div>
        </div>
      )}
      <div>
        <h1 className="text-3xl font-black text-text-primary tracking-tight">Dashboard Overview</h1>
        <p className="text-text-secondary mt-1">Welcome back to the REDBEARD admin panel.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-text-secondary">Total Series</h3>
            <Library className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="text-2xl font-bold text-text-primary">{totalSeries.toLocaleString()}</div>
          </div>
        </div>
        
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-text-secondary">Total Chapters</h3>
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="text-2xl font-bold text-text-primary">{totalChapters.toLocaleString()}</div>
          </div>
        </div>
        
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-text-secondary">Total Users</h3>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="text-2xl font-bold text-text-primary">{totalUsers.toLocaleString()}</div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-text-secondary">Pending Reports</h3>
            <AlertCircle className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="text-2xl font-bold text-text-primary">{pendingReports.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Series */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex flex-row items-center justify-between p-6 pb-4">
            <h3 className="text-lg font-semibold">Recently Added Series</h3>
            <Link href="/admin/series" className="text-sm font-medium text-primary hover:underline">View all</Link>
          </div>
          <div className="p-6 pt-0">
            <div className="space-y-4">
              {recentSeries.length === 0 ? (
                <p className="text-sm text-text-secondary">No series found.</p>
              ) : (
                recentSeries.map(series => (
                  <div key={series.id} className="flex items-center gap-4">
                    <div className="relative h-12 w-12 flex-shrink-0">
                      <Image 
                        src={series.coverImage} 
                        alt={series.title} 
                        fill
                        className="rounded object-cover" 
                        sizes="48px"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{series.title}</p>
                      <p className="text-xs text-text-secondary">{series.status} • {series.type}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Users */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex flex-row items-center justify-between p-6 pb-4">
            <h3 className="text-lg font-semibold">Recent Users</h3>
            <Link href="/admin/users" className="text-sm font-medium text-primary hover:underline">View all</Link>
          </div>
          <div className="p-6 pt-0">
            <div className="space-y-4">
              {recentUsers.length === 0 ? (
                <p className="text-sm text-text-secondary">No users found.</p>
              ) : (
                recentUsers.map(user => (
                  <div key={user.id} className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-surface flex items-center justify-center text-primary font-bold">
                      {user.displayName?.[0] || user.email?.[0] || 'U'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{user.displayName || user.username || 'User'}</p>
                      <p className="text-xs text-text-secondary">{user.email}</p>
                    </div>
                    <div className="ml-auto">
                      <span className="rounded bg-surface px-2 py-1 text-xs font-semibold text-text-secondary">
                        {user.role}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
