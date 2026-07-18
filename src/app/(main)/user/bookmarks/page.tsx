import { Metadata } from 'next';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { SeriesCard } from '@/components/shared/SeriesCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { Bookmark } from 'lucide-react';
import type { SeriesCardData } from '@/types';

export const metadata: Metadata = {
  title: 'My Bookmarks | REDBEARD',
  description: 'Manage your bookmarked manhwa series',
};

async function getBookmarks(userId: string) {
  const bookmarks = await prisma.bookmark.findMany({
    where: { userId },
    include: {
      series: {
        include: {
          genres: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  return bookmarks.map((b) => ({
    id: b.series.id,
    title: b.series.title,
    slug: b.series.slug,
    coverImage: b.series.coverImage,
    type: b.series.type as SeriesCardData['type'],
    status: b.series.status as SeriesCardData['status'],
    averageRating: b.series.averageRating,
    totalViews: b.series.totalViews,
    totalBookmarks: b.series.totalBookmarks,
    chapterCount: b.series.chapterCount,
    genres: b.series.genres,
    updatedAt: b.series.updatedAt.toISOString(),
  }));
}

export default async function BookmarksPage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect('/login');
  }

  const series = await getBookmarks(session.user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Bookmarks</h1>
          <p className="text-muted-foreground">
            You have {series.length} bookmarked series.
          </p>
        </div>
      </div>

      {series.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {series.map((item, index) => (
            <SeriesCard key={item.id} series={item} index={index} />
          ))}
        </div>
      ) : (
        <div className="pt-12 border border-dashed rounded-xl bg-card border-border">
          <EmptyState
            icon={<Bookmark className="w-10 h-10" />}
            title="No bookmarks yet"
            description="You haven't bookmarked any series yet. Explore our library to find something to read!"
            action={{ label: "Explore Series", href: "/browse/popular" }}
          />
        </div>
      )}
    </div>
  );
}
