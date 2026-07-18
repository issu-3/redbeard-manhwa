'use client';

import { motion } from 'framer-motion';
import { SeriesCard } from '@/components/shared/SeriesCard';
import type { SeriesCardData } from '@/types';

interface BrowseGridProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  series: SeriesCardData[];
}

export function BrowseGrid({ title, subtitle, icon, series }: BrowseGridProps) {
  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          {icon}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary md:text-3xl" style={{ fontFamily: 'var(--font-heading)' }}>
            {title}
          </h1>
          <p className="text-sm text-text-muted">{subtitle}</p>
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
      >
        {series.map((s, i) => (
          <SeriesCard key={s.id} series={s} index={i} />
        ))}
      </motion.div>
    </div>
  );
}
