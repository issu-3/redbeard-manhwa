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
  Download,
} from 'lucide-react';
import { formatRelativeTime, cn } from '@/lib/utils';
import type { ChapterListItem } from '@/types';

interface ChapterListSectionProps {
  chapters: ChapterListItem[];
  seriesSlug: string;
  seriesId: string;
  totalChapters: number;
  adSlotMiddle?: React.ReactNode;
}

export function ChapterListSection({
  chapters: initialChapters,
  seriesSlug,
  seriesId,
  totalChapters,
  adSlotMiddle,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <h2 className="text-xl sm:text-2xl font-bold text-text-primary flex items-center gap-2">
          Chapters
          <span className="text-xs font-semibold bg-card/80 px-2.5 py-0.5 rounded-full text-text-muted border border-border/60">
            {totalChapters}
          </span>
        </h2>
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
            <input
              type="text"
              placeholder="Search chapters..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setDisplayLimit(100);
              }}
              className="w-full h-10 rounded-xl border border-border/70 bg-card/80 pl-9 pr-3 text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-all"
            />
          </div>
          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="h-10 flex items-center gap-1.5 rounded-xl border border-border/70 bg-card/80 px-3.5 text-xs sm:text-sm font-semibold transition-all hover:border-primary/40 hover:bg-card text-text-secondary hover:text-text-primary shrink-0 active:scale-95"
            aria-label={sortAsc ? 'Sort by newest first' : 'Sort by oldest first'}
          >
            {sortAsc ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
            <span>{sortAsc ? 'Oldest' : 'Newest'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
        <AnimatePresence initial={false}>
          {filteredChapters.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12 text-text-muted col-span-full text-sm"
            >
              No chapters found matching your search.
            </motion.div>
          ) : (
            (() => {
              const limit = Math.min(filteredChapters.length, displayLimit);
              const adIndex = Math.max(1, Math.floor(limit / 2));
              
              const nodes = filteredChapters.slice(0, displayLimit).map((chapter, index) => {
                const isLatest = chapter.number === latestChapterNumber;
                const safeSlug = typeof chapter.slug === 'string' && chapter.slug.trim() ? chapter.slug : chapter.number != null ? String(chapter.number) : null;
                
                return (
                  <motion.div
                    key={chapter.id}
                    layout
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.15, delay: Math.min(index * 0.015, 0.15) }}
                  >
                    <div
                      className={cn(
                        'group relative flex flex-col justify-center p-3 rounded-xl border transition-all duration-150',
                        isLatest 
                          ? 'bg-primary/[0.06] border-primary/30 hover:border-primary/60 hover:bg-primary/[0.1] shadow-xs'
                          : 'bg-card/70 border-border/60 hover:border-primary/40 hover:bg-card',
                        chapter.isRead && 'opacity-60'
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        {/* Title and Metadata Column */}
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 min-w-0 mb-0.5">
                            {safeSlug ? (
                              <Link
                                href={`/series/${seriesSlug}/chapter/${safeSlug}`}
                                prefetch={false}
                                className="min-w-0 truncate"
                              >
                                <span className={cn(
                                  "text-sm sm:text-base font-bold leading-tight truncate transition-colors",
                                  isLatest ? "text-primary hover:underline" : "text-text-primary group-hover:text-primary hover:underline"
                                )}>
                                  {chapter.label || `Chapter ${chapter.number}`}
                                </span>
                              </Link>
                            ) : (
                              <span className={cn(
                                "text-sm sm:text-base font-bold leading-tight truncate transition-colors",
                                isLatest ? "text-primary" : "text-text-primary group-hover:text-primary"
                              )}>
                                {chapter.label || `Chapter ${chapter.number}`}
                              </span>
                            )}
                            {isLatest && (
                              <span className="bg-primary text-white text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-xs shrink-0">
                                New
                              </span>
                            )}
                            {chapter.isRead && (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            )}
                          </div>

                          {/* Chapter title if distinct from label/number */}
                          {chapter.title && chapter.title !== chapter.label && chapter.title !== `Chapter ${chapter.number}` && (
                            <p 
                              className="text-xs text-text-secondary truncate leading-snug mb-1 font-normal" 
                              title={chapter.title}
                            >
                              {chapter.title}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-3 text-[11px] font-medium text-text-muted">
                            {chapter.publishedAt && (
                              <span className="flex items-center gap-1" suppressHydrationWarning>
                                <Calendar className="h-3 w-3 shrink-0" />
                                {formatRelativeTime(chapter.publishedAt)}
                              </span>
                            )}
                            {chapter.totalPages && chapter.totalPages > 0 ? (
                              <span className="flex items-center gap-1">
                                {chapter.totalPages} pgs
                              </span>
                            ) : null}
                          </div>
                        </div>
                        
                        {/* Download & Read Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {chapter.downloadUrl && (
                            <a
                              href={`/api/chapter/${chapter.id}/download`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-lg border border-border/70 bg-surface/80 hover:bg-card-hover text-text-secondary hover:text-text-primary transition-colors shrink-0 active:scale-95"
                              title={`Download ${chapter.label || 'Chapter ' + chapter.number}`}
                              aria-label={`Download ${chapter.label || 'Chapter ' + chapter.number}`}
                            >
                              <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </a>
                          )}
                          {safeSlug ? (
                            <Link
                              href={`/series/${seriesSlug}/chapter/${safeSlug}`}
                              prefetch={false}
                              className="h-8 sm:h-9 px-3 sm:px-3.5 flex items-center justify-center bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-bold transition-all shadow-xs shrink-0 active:scale-95"
                              aria-label={`Read ${chapter.label || 'Chapter ' + chapter.number}`}
                            >
                              READ
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              });

              if (limit > 0 && adSlotMiddle) {
                nodes.splice(adIndex, 0, (
                  <div key="ad-middle" className="col-span-full flex justify-center w-full my-4 md:my-6 overflow-hidden">
                    {adSlotMiddle}
                  </div>
                ));
              }
              
              return nodes;
            })()
          )}
        </AnimatePresence>
      </div>

      {!searchQuery.trim() && chapters.length < totalChapters && (
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
            className="rounded-xl border border-border bg-card px-8 py-3 text-sm font-bold text-text-primary transition-all hover:border-primary/50 hover:text-primary active:scale-95 disabled:opacity-50"
          >
            {isLoadingMore ? 'Loading...' : `Load More Chapters (${Math.max(0, totalChapters - chapters.length)} remaining)`}
          </button>
        </div>
      )}
      {filteredChapters.length > displayLimit && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => setDisplayLimit((prev) => prev + 100)}
            className="rounded-xl border border-border bg-card px-8 py-3 text-sm font-bold text-text-primary transition-all hover:border-primary/50 hover:text-primary active:scale-95"
          >
            Show More ({filteredChapters.length - displayLimit} hidden)
          </button>
        </div>
      )}
    </div>
  );
}
