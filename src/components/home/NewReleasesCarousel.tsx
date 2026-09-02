'use client';

import { Carousel } from '@/components/shared/Carousel';
import { SeriesCard } from '@/components/shared/SeriesCard';
import type { SeriesCardData } from '@/types';

export function NewReleasesCarousel({ series }: { series: SeriesCardData[] }) {
  if (series.length === 0) return null;

  return (
    <Carousel title="🆕 New Releases" subtitle="Latest additions to our catalog" href="/browse/new-releases">
      {series.map((s, i) => (
        <div key={s.id} className="w-[155px] shrink-0 md:w-[200px]">
          <div className="relative group transition-transform hover:-translate-y-1">
            <div className="absolute -left-2.5 -top-2.5 z-20 flex h-6 px-2 items-center justify-center rounded-lg bg-accent font-bold text-[10px] tracking-wider text-white shadow-lg border border-background backdrop-blur-md uppercase">
              NEW
            </div>
            <SeriesCard series={s} variant="compact" index={i} />
          </div>
        </div>
      ))}
    </Carousel>
  );
}
