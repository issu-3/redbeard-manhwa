'use client';

import { Carousel } from '@/components/shared/Carousel';
import { SeriesCard } from '@/components/shared/SeriesCard';
import type { SeriesCardData } from '@/types';

export function TrendingCarousel({ series }: { series: SeriesCardData[] }) {
  if (series.length === 0) return null;

  return (
    <Carousel title="🔥 Trending" subtitle="Top 10 most viewed this week" href="/browse/trending">
      {series.map((s, i) => (
        <div key={s.id} className="w-[160px] shrink-0 md:w-[180px]">
          <div className="relative group transition-transform hover:-translate-y-1">
            <div className="absolute -left-2 -top-2 z-20 flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-bold text-sm text-white shadow-[0_4px_12px_rgba(229,57,53,0.5)] border-2 border-background">
              #{i + 1}
            </div>
            <SeriesCard series={s} variant="compact" index={i} />
          </div>
        </div>
      ))}
    </Carousel>
  );
}
