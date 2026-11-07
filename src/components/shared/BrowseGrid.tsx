'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { SeriesCard } from '@/components/shared/SeriesCard';
import { loadMoreBrowseSeries } from '@/app/actions/public/browse';
import { BROWSE_PAGE_SIZE, type BrowseCategory } from '@/lib/browse-constants';
import type { SeriesCardData } from '@/types';

interface BrowseGridProps {
  title: string;
  subtitle: string;
  description?: React.ReactNode;
  icon: React.ReactNode;
  series: SeriesCardData[];
  // Load More support: when `category` is set, a Load More button pages in
  // the remaining series. `total` is the exact series count for the
  // prisma-backed categories; for 'latest' (total === null) a short final
  // batch marks the end of the feed.
  category?: BrowseCategory;
  total?: number | null;
}

export function BrowseGrid({ title, subtitle, description, icon, series, category, total = null }: BrowseGridProps) {
  const [items, setItems] = useState<SeriesCardData[]>(series);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reachedEnd, setReachedEnd] = useState(false);

  const hasMore =
    !!category &&
    !reachedEnd &&
    (total !== null ? items.length < total : items.length >= BROWSE_PAGE_SIZE);

  async function handleLoadMore() {
    if (!category || loading) return;
    setLoading(true);
    setLoadError(false);
    try {
      const result = await loadMoreBrowseSeries(category, items.length);
      setItems((prev) => {
        const seen = new Set(prev.map((s) => s.id));
        return [...prev, ...result.series.filter((s) => !seen.has(s.id))];
      });
      if (result.series.length < BROWSE_PAGE_SIZE) setReachedEnd(true);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

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

      {description && (
        <div className="mb-8 text-sm leading-relaxed text-text-muted max-w-3xl">
          {description}
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface/50 p-12 text-center">
          <h2 className="text-lg font-bold text-text-primary">No series found</h2>
          <p className="mt-2 text-sm text-text-muted">
            There are currently no series available in this category. Please check back later!
          </p>
        </div>
      ) : (
      <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
      >
        {items.map((s, i) => (
          <SeriesCard key={s.id} series={s} index={i} />
        ))}
      </motion.div>

      {category && (
        <div className="mt-10 flex flex-col items-center gap-3">
          {total !== null && (
            <p className="text-sm text-text-muted">
              Showing {items.length} of {total} series
            </p>
          )}
          {loadError && (
            <p className="text-sm text-danger">Could not load more series. Please try again.</p>
          )}
          {hasMore && (
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-white transition-all hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Loading…' : 'Load More'}
            </button>
          )}
        </div>
      )}
      </>
      )}
    </div>
  );
}
