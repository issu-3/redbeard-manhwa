'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Carousel } from '@/components/shared/Carousel';

import type { SeriesCardData } from '@/types';

export interface ContinueReadingItem {
  series: SeriesCardData;
  chapterNumber: number;
  chapterSlug?: string;
  chapterLabel?: string | null;
  progress: number;
}

export function ContinueReadingCarousel({ items }: { items: ContinueReadingItem[] }) {
  if (items.length === 0) return null;

  return (
    <Carousel title="📚 Continue Reading" subtitle="Pick up where you left off" href="/user/history">
      {items.map((item, i) => {
        const safeSlug = typeof item.chapterSlug === 'string' && item.chapterSlug.trim() ? item.chapterSlug : item.chapterNumber != null ? String(item.chapterNumber) : null;
        if (!safeSlug) return null;
        
        const isNSFW = (item.series as any).isNSFW || item.series.type === 'PORNHWA' || item.series.type === 'DOUJINSHI';
        
        return (
        <div key={item.series.id} className="w-[150px] shrink-0 md:w-[200px]">
          <Link 
            href={`/series/${item.series.slug}/chapter/${safeSlug}`}
            className="group relative block w-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-primary rounded-2xl"
          >
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-surface shadow-sm">
              <Image
                src={item.series.coverImage}
                alt={item.series.title}
                fill
                sizes="(max-width: 768px) 150px, 200px"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/10 to-transparent opacity-80" />
              
              {isNSFW && (
                <div className="absolute left-2.5 top-2.5 rounded bg-red-500/90 px-1.5 py-0.5 text-[9px] font-black text-white shadow-sm backdrop-blur-md">
                  NSFW
                </div>
              )}

              {/* Progress Overlay */}
              <div className="absolute bottom-3 left-3 right-3 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-white drop-shadow-md">
                  <span className="truncate pr-2">{item.chapterLabel || `Ch. ${item.chapterNumber}`}</span>
                  <span>{Math.round(item.progress)}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/50 shadow-inner backdrop-blur-sm">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-500 ease-out" 
                    style={{ width: `${item.progress}%` }} 
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-2.5 px-1">
              <h3 className="line-clamp-2 text-sm font-bold leading-tight text-text-primary transition-colors group-hover:text-primary">
                {item.series.title}
              </h3>
            </div>
          </Link>
        </div>
        );
      })}
    </Carousel>
  );
}
