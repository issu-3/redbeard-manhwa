'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Star, MessageSquare, BookOpen } from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import type { SeriesCardData } from '@/types';

interface SeriesCardProps {
  series: SeriesCardData;
  variant?: 'default' | 'compact' | 'featured' | 'wide';
  index?: number;
}

const statusColors: Record<string, string> = {
  ONGOING: 'bg-success/90',
  COMPLETED: 'bg-info/90',
  HIATUS: 'bg-warning/90',
  CANCELLED: 'bg-danger/90',
  UPCOMING: 'bg-purple-500/90',
};

export function SeriesCard({ series, variant = 'default', index = 0 }: SeriesCardProps) {
  if (variant === 'wide') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.05 }}
      >
        <Link
          href={`/series/${series.slug}`}
          className="group flex gap-4 rounded-2xl border border-border bg-card p-3 transition-all hover:border-border-hover hover:shadow-lg hover:shadow-black/20"
        >
          <div className="relative h-32 w-24 shrink-0 overflow-hidden rounded-xl">
            <Image
              src={series.coverImage}
              alt={series.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              sizes="96px"
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
            <div>
              <h3 className="mb-1 line-clamp-1 font-semibold text-text-primary group-hover:text-primary transition-colors">
                {series.title}
              </h3>
              <div className="mb-2 flex flex-wrap gap-1">
                {series.genres.slice(0, 3).map((g) => (
                  <span key={g.slug} className="rounded-full bg-surface px-2 py-0.5 text-[10px] text-text-muted">
                    {g.name}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-text-muted">
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-warning text-warning" />
                {series.averageRating.toFixed(1)}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {formatNumber(series.ratingCount)}
              </span>
              <span className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                Ch. {series.chapterCount}
              </span>
            </div>
          </div>
        </Link>
      </motion.div>
    );
  }

  const isFeatured = variant === 'featured';
  const isCompact = variant === 'compact';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className={isFeatured ? 'w-full' : isCompact ? 'w-full' : 'w-full'}
    >
      <Link href={`/series/${series.slug}`} className="group block">
        <div className={`relative overflow-hidden rounded-2xl border border-transparent transition-all duration-300 group-hover:border-primary/30 group-hover:shadow-xl group-hover:shadow-primary/5 ${isFeatured ? 'aspect-[2/3]' : 'aspect-[3/4]'}`}>
          <Image
            src={series.coverImage}
            alt={series.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes={isFeatured ? '(max-width: 768px) 50vw, 25vw' : '(max-width: 768px) 33vw, 20vw'}
          />

          {/* Status badge */}
          <div className="absolute left-2 top-2 z-10">
            <span className={`rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase text-text-primary ${statusColors[series.status] || 'bg-gray-500'}`}>
              {series.status}
            </span>
          </div>

          {/* Bottom gradient + info overlay */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pt-12">
            <div className="flex items-center gap-2 text-[11px] text-white/70">
              <span className="flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-warning text-warning" />
                {series.averageRating.toFixed(1)}
              </span>
              <span className="flex items-center gap-0.5 ml-1">
                <MessageSquare className="h-3 w-3" />
                {formatNumber(series.ratingCount)}
              </span>
            </div>
          </div>

          {/* Hover overlay with more info */}
          <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/95 via-black/60 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <div className="flex flex-wrap gap-1 mb-2">
              {series.genres.slice(0, 2).map((g) => (
                <span key={g.slug} className="rounded-full bg-foreground/15 px-2 py-0.5 text-[10px] text-text-primary backdrop-blur-sm">
                  {g.name}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-white/60">
              <span className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                {series.chapterCount} Ch
              </span>
            </div>
          </div>
        </div>

        <div className="mt-2 px-1">
          <h3 className={`line-clamp-2 font-semibold text-text-primary transition-colors group-hover:text-primary ${isCompact ? 'text-xs' : 'text-sm'}`}>
            {series.title}
          </h3>
          {!isCompact && (
            <p className="mt-0.5 text-xs text-text-muted">
              Chapter {series.chapterCount}
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
