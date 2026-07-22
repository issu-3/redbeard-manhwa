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

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (ch) =>
          ch.number.toString().includes(q) ||
          ch.title?.toLowerCase().includes(q)
      );
    }

    filtered.sort((a, b) =>
      sortAsc ? a.number - b.number : b.number - a.number
    );

    return filtered;
  }, [chapters, sortAsc, searchQuery]);

  // Identify the latest chapter globally to highlight it
  const latestChapterNumber = chapters.length > 0 ? Math.max(...chapters.map(c => c.number)) : null;

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
              onChange={(e) => setSearchQuery(e.target.value)}
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
        <AnimatePresence mode="popLayout">
          {filteredChapters.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full py-16 text-center text-text-muted bg-card/30 rounded-2xl border border-border/50"
            >
              <Search className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p>No chapters match your search.</p>
            </motion.div>
          ) : (
            filteredChapters.map((chapter, index) => {
              const isLatest = chapter.number === latestChapterNumber;
              
              return (
                <motion.div
                  key={chapter.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.2) }}
                >
                  <Link
                    href={chapter.sourceType === 'EXTERNAL' && chapter.externalUrl ? chapter.externalUrl : `/series/${seriesSlug}/chapter/${chapter.number}`}
                    target={chapter.sourceType === 'EXTERNAL' ? '_blank' : undefined}
                    rel={chapter.sourceType === 'EXTERNAL' ? 'noopener noreferrer' : undefined}
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
                          {chapter.sourceType === 'EXTERNAL' && chapter.label ? chapter.label : `Chapter ${chapter.number}`}
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
                      
                      <div className="flex items-center gap-1 text-text-secondary group-hover:text-primary transition-colors">
                        {chapter.sourceType === 'EXTERNAL' ? (
                          <>
                            <LinkIcon className="h-3 w-3" />
                            <span>{chapter.externalProvider || 'Link'}</span>
                          </>
                        ) : (
                          <span>{chapter.totalPages} pgs</span>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
