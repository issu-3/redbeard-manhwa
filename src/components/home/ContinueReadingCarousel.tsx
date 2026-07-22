'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Carousel } from '@/components/shared/Carousel';
import { BookOpen } from 'lucide-react';
import type { SeriesCardData } from '@/types';

export interface ContinueReadingItem {
  series: SeriesCardData;
  chapterNumber: number;
  chapterLabel?: string | null;
  progress: number;
}

export function ContinueReadingCarousel({ items }: { items: ContinueReadingItem[] }) {
  if (items.length === 0) return null;

  return (
    <Carousel title="📚 Continue Reading" subtitle="Pick up where you left off" href="/user/history">
      {items.map((item, i) => (
        <div key={item.series.id} className="w-[180px] shrink-0 md:w-[220px]">
          <Link 
            href={`/series/${item.series.slug}/chapter/${item.chapterNumber}`}
            className="group block overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/40 hover:bg-card-hover"
          >
            <div className="flex p-3 gap-3">
              <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-md bg-surface shadow-sm">
                <Image
                  src={item.series.coverImage}
                  alt={item.series.title}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col justify-center min-w-0">
                <h3 className="line-clamp-2 text-sm font-bold text-text-primary group-hover:text-primary transition-colors mb-1" title={item.series.title}>
                  {item.series.title}
                </h3>
                <span className="text-xs font-medium text-text-muted">
                  {item.chapterLabel || `Chapter ${item.chapterNumber}`}
                </span>
              </div>
            </div>
            
            <div className="px-3 pb-3">
              <div className="mb-2 flex items-center justify-between text-[10px] font-bold text-text-muted uppercase tracking-wider">
                <span>Progress</span>
                <span>{Math.round(item.progress)}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-500 ease-out" 
                  style={{ width: `${item.progress}%` }} 
                />
              </div>
            </div>
            
            <div className="border-t border-border/50 bg-surface/50 p-2 text-center text-xs font-bold text-primary group-hover:bg-primary/10 transition-colors flex justify-center items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              Resume
            </div>
          </Link>
        </div>
      ))}
    </Carousel>
  );
}
