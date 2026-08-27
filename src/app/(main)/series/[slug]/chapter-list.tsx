'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUp,
  ArrowDown,
  Search,
  Calendar,
  CheckCircle2,
  Link as LinkIcon,
} from 'lucide-react';
import { formatRelativeTime, cn } from '@/lib/utils';
import type { ChapterListItem } from '@/types';

interface ChapterListSectionProps {
  chapters: ChapterListItem[];
  seriesSlug: string;
  seriesId: string;
  totalChapters: number;
}

export function ChapterListSection({
  chapters: initialChapters,
  seriesSlug,
  seriesId,
  totalChapters,
}: ChapterListSectionProps) {
  const [chapters, setChapters] = useState<ChapterListItem[]>(initialChapters);
  const [sortAsc, setSortAsc] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [displayLimit, setDisplayLimit] = useState(100);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // When initialChapters change (e.g., from navigation), reset state
  // We'll just trust initialChapters for the initial mount.
  
  const filteredChapters = useMemo(() => {
    let filtered = chapters.filter(c => (c.totalPages && c.totalPages > 0) || c.downloadUrl);

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (ch) =>
          ch.number?.toString().includes(q) ||
          ch.title?.toLowerCase().includes(q) ||
          ch.label?.toLowerCase().includes(q)
      );
    }

    filtered.sort((a, b) => {
      if (a.number !== null && b.number !== null) {
        return sortAsc ? (a.number) - (b.number) : (b.number) - (a.number);
      }
      const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      
      if (dateA !== dateB) {
        return sortAsc ? dateA - dateB : dateB - dateA;
      }
      
      // Fallback to label alphanumeric sorting for identical timestamps (bulk uploads)
      if (a.label && b.label) {
        return sortAsc 
          ? a.label.localeCompare(b.label, undefined, { numeric: true })
          : b.label.localeCompare(a.label, undefined, { numeric: true });
      }
      
      return 0;
    });

    return filtered;
  }, [chapters, sortAsc, searchQuery]);

  // Identify the latest chapter globally to highlight it
  const latestChapterNumber = chapters.length > 0 ? Math.max(...chapters.map(c => c.number ?? 0)) : null;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          Chapters
          <span className="text-sm font-medium bg-card px-2 py-0.5 rounded-full text-text-muted border border-border">
            {chapters.length}
          </span>
        </h2>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search chapters..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setDisplayLimit(100);
              }}
              className="w-full sm:w-64 rounded-xl border border-border bg-card pl-9 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-all"
            />
          </div>
          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold transition-all hover:border-primary/40 hover:bg-card-hover text-text-secondary whitespace-nowrap"
          >
            {sortAsc ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            {sortAsc ? 'Oldest' : 'Newest'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <AnimatePresence initial={false}>
          {filteredChapters.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12 text-text-muted"
            >
              No chapters found matching your search.
            </motion.div>
          ) : (
            filteredChapters.slice(0, displayLimit).map((chapter, index) => {
              const isLatest = chapter.number === latestChapterNumber;
              const safeSlug = typeof chapter.slug === 'string' && chapter.slug.trim() ? chapter.slug : chapter.number != null ? String(chapter.number) : null;
              
              return (
                <motion.div
                  key={chapter.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.2) }}
                >
                  <div
                    className={cn(
                      'group relative flex flex-col justify-between p-4 rounded-xl border transition-all h-full',
                      isLatest 
                        ? 'bg-primary/5 border-primary/30 hover:border-primary/60 hover:bg-primary/10 shadow-sm'
                        : 'bg-card border-border hover:border-primary/40 hover:bg-card-hover',
                      chapter.isRead && 'opacity-60'
                    )}
                  >
                    {isLatest && (
                      <div className="absolute -top-2.5 -right-2.5 bg-primary text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-md z-10">
                        New
                      </div>
                    )}
                    
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0 pr-4">
                        <h3 className={cn(
                          "font-bold truncate transition-colors",
                          isLatest ? "text-primary" : "text-text-primary group-hover:text-primary"
                        )}>
                          {chapter.label || `Chapter ${chapter.number}`}
                        </h3>
                        {chapter.title && (
                          <p className="text-xs text-text-secondary truncate mt-0.5">
                            {chapter.title}
                          </p>
                        )}
                      </div>
                      
                      {chapter.isRead && (
                        <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between text-[11px] font-medium text-text-muted mt-auto pt-3 border-t border-border/50">
                      <div className="flex items-center gap-3">
                        {chapter.publishedAt && (
                          <span className="flex items-center gap-1" suppressHydrationWarning>
                            <Calendar className="h-3 w-3" />
                            {formatRelativeTime(chapter.publishedAt)}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 text-text-secondary">
                        {chapter.totalPages && chapter.totalPages > 0 ? (
                          <span>{chapter.totalPages} pgs</span>
                        ) : null}
                        {chapter.downloadUrl && (
                          <div className="flex items-center gap-1">
                            <LinkIcon className="h-3 w-3" />
                            <span>{chapter.downloadProvider || 'Link'}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                      {chapter.totalPages && chapter.totalPages > 0 && safeSlug ? (
                        <Link
                          href={`/series/${seriesSlug}/chapter/${safeSlug}`}
                          className="flex-1 flex items-center justify-center py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-md text-xs font-bold transition-colors"
                        >
                          READ
                        </Link>
                      ) : null}
                      {chapter.downloadUrl && (
                        <a
                          href={`/api/chapter/${chapter.id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center py-1.5 bg-surface border border-border hover:bg-card-hover text-text-secondary hover:text-text-primary rounded-md text-xs font-bold transition-colors"
                        >
                          DOWNLOAD
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {filteredChapters.length < totalChapters && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={async () => {
              setIsLoadingMore(true);
              try {
                // Fetch next 100 chapters
                const { getSeriesChapters } = await import('@/app/actions/public/chapters');
                const nextChapters = await getSeriesChapters(seriesId, chapters.length, 100);
                if (nextChapters.length > 0) {
                  setChapters(prev => [...prev, ...nextChapters]);
                } else {
                  // Fallback in case chapterCount is out of sync
                  setDisplayLimit(prev => prev + 100);
                }
              } catch (e) {
                console.error(e);
              } finally {
                setIsLoadingMore(false);
              }
            }}
            disabled={isLoadingMore}
            className="rounded-xl border-2 border-border bg-card px-8 py-3 text-sm font-bold text-text-primary transition-all hover:border-primary/50 hover:text-primary active:scale-95 disabled:opacity-50"
          >
            {isLoadingMore ? 'Loading...' : `Load More Chapters (${totalChapters - chapters.length} remaining)`}
          </button>
        </div>
      )}
      {filteredChapters.length >= totalChapters && filteredChapters.length > displayLimit && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => setDisplayLimit((prev) => prev + 100)}
            className="rounded-xl border-2 border-border bg-card px-8 py-3 text-sm font-bold text-text-primary transition-all hover:border-primary/50 hover:text-primary active:scale-95"
          >
            Show More ({filteredChapters.length - displayLimit} hidden)
          </button>
        </div>
      )}
    </div>
  );
}
