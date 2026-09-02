'use client';

import { Carousel } from '@/components/shared/Carousel';
import { SeriesCard } from '@/components/shared/SeriesCard';
import type { SeriesCardData } from '@/types';

export function PopularCarousel({ series }: { series: SeriesCardData[] }) {
  if (series.length === 0) return null;

  return (
    <Carousel title="🔥 Most Popular Series All Time" subtitle="Top-rated and most-read series on REDBEARD" href="/browse/popular">
      {series.map((s, i) => (
        <div key={s.id} className="w-[150px] shrink-0 md:w-[200px]">
          <div className="relative group transition-transform hover:-translate-y-1">
            <div className="absolute -left-2.5 -top-2.5 z-20 flex h-8 w-8 items-center justify-center rounded-xl bg-primary font-bold text-sm text-white shadow-lg border-2 border-background backdrop-blur-md">
              #{i + 1}
            </div>
            <SeriesCard series={s} variant="compact" index={i} />
          </div>
        </div>
      ))}
    </Carousel>
  );
}
