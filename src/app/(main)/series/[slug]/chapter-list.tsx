'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUp,
  ArrowDown,
  Search,
  Eye,
  Calendar,
  BookOpen,
  CheckCircle2,
  Link as LinkIcon,
} from 'lucide-react';
import { formatNumber, formatRelativeTime, cn } from '@/lib/utils';
import type { ChapterListItem } from '@/types';

interface ChapterListSectionProps {
  chapters: ChapterListItem[];
  seriesSlug: string;
}

export function ChapterListSection({
  chapters,
  seriesSlug,
}: ChapterListSectionProps) {
  const [sortAsc, setSortAsc] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChapters = useMemo(() => {
    let filtered = [...chapters];

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (ch) =>
          ch.number.toString().includes(q) ||
          ch.title?.toLowerCase().includes(q)
      );
    }

    // Sort
    filtered.sort((a, b) =>
      sortAsc ? a.number - b.number : b.number - a.number
    );

    return filtered;
  }, [chapters, sortAsc, searchQuery]);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          Chapters
          <span className="text-base font-normal text-text-muted">
            ({chapters.length})
          </span>
        </h2>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search chapters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-56 rounded-xl border border-border bg-card pl-9 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-all"
            />
          </div>
          {/* Sort toggle */}
          <button
            onClick={() => setSortAsc(!sortAsc)}
            className={cn(
              'flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium transition-all hover:border-primary/40 hover:bg-card-hover',
              'text-text-secondary'
            )}
          >
            {sortAsc ? (
              <ArrowUp className="h-4 w-4" />
            ) : (
              <ArrowDown className="h-4 w-4" />
            )}
            {sortAsc ? 'Oldest' : 'Newest'}
          </button>
        </div>
      </div>

      {/* Chapter list */}
      <div className="rounded-2xl border border-border bg-surface/30 overflow-hidden">
        <AnimatePresence mode="popLayout">
          {filteredChapters.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-16 text-center text-text-muted"
            >
              <Search className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p>No chapters match your search.</p>
            </motion.div>
          ) : (
            filteredChapters.map((chapter, index) => (
              <motion.div
                key={chapter.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.3) }}
              >
                <Link
                  href={chapter.sourceType === 'EXTERNAL' && chapter.externalUrl ? chapter.externalUrl : `/series/${seriesSlug}/chapter/${chapter.number}`}
                  target={chapter.sourceType === 'EXTERNAL' ? '_blank' : undefined}
                  rel={chapter.sourceType === 'EXTERNAL' ? 'noopener noreferrer' : undefined}
                  className={cn(
                    'group flex items-center gap-4 px-4 sm:px-6 py-4 transition-all hover:bg-card/50',
                    index < filteredChapters.length - 1 &&
                      'border-b border-border/50',
                    chapter.isRead && 'opacity-60'
                  )}
                >
                  {/* Chapter number badge */}
                  <div
                    className={cn(
                      'flex items-center justify-center w-12 h-12 rounded-xl text-sm font-bold shrink-0 transition-all',
                      chapter.isRead
                        ? 'bg-card border border-border text-text-muted'
                        : 'bg-primary/10 border border-primary/20 text-primary group-hover:bg-primary/15 group-hover:border-primary/30'
                    )}
                  >
                    {chapter.number}
                  </div>

                  {/* Chapter info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-text-primary group-hover:text-primary transition-colors truncate">
                        Chapter {chapter.number}
                        {chapter.title && ` — ${chapter.title}`}
                      </h3>
                      {chapter.sourceType === 'EXTERNAL' && (
                        <span title={`External Link: ${chapter.externalProvider}`} className="shrink-0"><LinkIcon className="h-4 w-4 text-primary" /></span>
                      )}
                      {chapter.isRead && (
                        <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs text-text-muted">
                        <Eye className="h-3 w-3" />
                        {formatNumber(chapter.totalViews)}
                      </span>
                      {chapter.publishedAt && (
                      <span className="flex items-center gap-1 text-xs text-text-muted" suppressHydrationWarning>
                        <Calendar className="h-3 w-3" />
                        {formatRelativeTime(chapter.publishedAt)}
                      </span>
                      )}
                      <span className="text-xs text-text-muted">
                        {chapter.sourceType === 'EXTERNAL' ? chapter.externalProvider || 'External' : `${chapter.totalPages} pages`}
                      </span>
                    </div>
                  </div>

                  {/* Arrow on hover */}
                  <div className="hidden sm:flex items-center text-text-muted group-hover:text-primary transition-colors">
                    <svg
                      className="h-5 w-5 transition-transform group-hover:translate-x-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </Link>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
