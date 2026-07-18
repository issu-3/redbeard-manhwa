import { Metadata } from 'next';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { EmptyState } from '@/components/shared/EmptyState';
import { History, Clock, BookOpen, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

export const metadata: Metadata = {
  title: 'Reading History | REDBEARD',
  description: 'View your recently read manhwa chapters',
};

async function getReadingHistory(userId: string) {
  const history = await prisma.readingHistory.findMany({
    where: { userId },
    include: {
      series: true,
      chapter: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });
  
  return history;
}

export default async function HistoryPage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect('/login');
  }

  const history = await getReadingHistory(session.user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reading History</h1>
          <p className="text-muted-foreground">
            Continue where you left off. Showing last {history.length} items.
          </p>
        </div>
      </div>

      {history.length > 0 ? (
        <div className="flex flex-col gap-4">
          {history.map((item) => (
            <Link 
              key={item.id} 
              href={`/series/${item.series.slug}/chapter/${item.chapter.number}`}
              className="group flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="relative w-full sm:w-24 h-32 shrink-0 rounded-lg overflow-hidden border border-border bg-muted">
                <Image
                  src={item.series.coverImage}
                  alt={item.series.title}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, 96px"
                />
              </div>
              
              <div className="flex-1 flex flex-col justify-between py-1">
                <div>
                  <h3 className="text-lg font-semibold line-clamp-1 group-hover:text-primary transition-colors">
                    {item.series.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      <BookOpen className="w-3.5 h-3.5" />
                      Chapter {item.chapter.number}
                    </span>
                    <span>•</span>
                    <span className="line-clamp-1">{item.chapter.title || `Chapter ${item.chapter.number}`}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-4 sm:mt-0">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    Read {formatDistanceToNow(item.updatedAt, { addSuffix: true })}
                  </div>
                  <div className="flex items-center gap-1 text-sm font-medium text-primary">
                    Continue <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="pt-12 border border-dashed rounded-xl bg-card border-border">
          <EmptyState
            icon={<History className="w-10 h-10" />}
            title="No reading history"
            description="You haven't read any chapters yet. Start reading to build your history!"
            action={{ label: "Browse Latest Chapters", href: "/browse/latest" }}
          />
        </div>
      )}
    </div>
  );
}
