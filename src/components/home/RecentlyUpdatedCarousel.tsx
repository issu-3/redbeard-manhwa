'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Carousel } from '@/components/shared/Carousel';
import { Clock } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import type { SeriesCardData } from '@/types';

export interface RecentUpdate {
  series: SeriesCardData;
  chapterNumber: number;
  publishedAt: string;
}

export function RecentlyUpdatedCarousel({ updates }: { updates: RecentUpdate[] }) {
  if (updates.length === 0) return null;

  return (
    <Carousel title="🆕 Recently Updated" subtitle="Fresh chapters just dropped" href="/browse/latest">
      {updates.map((update, i) => (
        <div key={`${update.series.id}-${update.chapterNumber}`} className="w-[160px] shrink-0 md:w-[190px]">
          <Link 
            href={`/series/${update.series.slug}/chapter/${update.chapterNumber}`}
            className="group block overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/40 hover:bg-card-hover"
          >
            <div className="relative aspect-[2/3] w-full overflow-hidden bg-surface">
              <Image
                src={update.series.coverImage}
                alt={update.series.title}
                fill
                sizes="(max-width: 768px) 160px, 190px"
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-60 transition-opacity group-hover:opacity-80" />
              
              <div className="absolute bottom-3 left-3 right-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="rounded bg-primary px-2 py-0.5 text-xs font-bold text-white shadow-sm">
                    Ch. {update.chapterNumber}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-medium text-white/80">
                  <Clock className="h-3 w-3" />
                  <span suppressHydrationWarning>{formatRelativeTime(update.publishedAt)}</span>
                </div>
              </div>
            </div>
            
            <div className="p-3">
              <h3 className="line-clamp-2 text-sm font-bold text-text-primary group-hover:text-primary transition-colors" title={update.series.title}>
                {update.series.title}
              </h3>
            </div>
          </Link>
        </div>
      ))}
    </Carousel>
  );
}
